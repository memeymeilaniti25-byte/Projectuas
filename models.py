"""
models.py
---------
Semua operasi CRUD untuk tabel "tasks" & "users".
Ini yang dipanggil oleh routes.py — routes.py TIDAK boleh
menulis query SQL langsung, biar semua akses data terpusat di sini.

PENTING soal keamanan: hampir semua fungsi tugas menerima `user_id` dan
selalu menambahkan `WHERE user_id = ?` di query-nya. Ini mencegah satu user
membaca/mengubah/menghapus tugas milik user lain hanya dengan menebak ID
tugas (Insecure Direct Object Reference / IDOR).
"""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import database as db

# Kriteria urutan yang didukung. "manual" memakai kolom sort_order
# yang diatur lewat drag & drop (lihat reorder_tasks di bawah).
SORT_VALID = ('terbaru', 'terlama', 'manual', 'prioritas', 'deadline', 'abjad')
SORT_DEFAULT = 'terbaru'

_ORDER_BY_MAP = {
    'terbaru': 'created_at DESC',
    'terlama': 'created_at ASC',
    'manual': 'sort_order ASC, created_at ASC',
    'prioritas': (
        "CASE priority WHEN 'Penting' THEN 0 WHEN 'Sedang' THEN 1 "
        "WHEN 'Santai' THEN 2 ELSE 3 END ASC, created_at DESC"
    ),
    'deadline': '(deadline IS NULL) ASC, deadline ASC, created_at DESC',
    'abjad': 'title COLLATE NOCASE ASC',
}


def row_to_dict(row):
    return dict(row) if row else None


# ================= USERS / AUTH =================

def create_user(username, password):
    """Buat akun baru. Return user_id kalau berhasil, None kalau username
    sudah dipakai orang lain."""
    conn = db.get_connection()
    existing = conn.execute('SELECT id FROM users WHERE username = ? COLLATE NOCASE', (username,)).fetchone()
    if existing:
        conn.close()
        return None

    password_hash = generate_password_hash(password)
    cur = conn.execute(
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
        (username, password_hash, datetime.now().isoformat())
    )
    conn.commit()
    user_id = cur.lastrowid

    # Migrasi ramah dari versi lama (sebelum ada login): kalau ini user
    # pertama yang daftar, tugas lama yang belum punya pemilik (user_id NULL)
    # otomatis jadi miliknya, supaya data lama tidak hilang begitu saja.
    if user_id == 1:
        conn.execute('UPDATE tasks SET user_id = ? WHERE user_id IS NULL', (user_id,))
        conn.commit()

    conn.close()
    return user_id


def verify_user(username, password):
    """Cek username & password. Return dict user kalau cocok, None kalau tidak."""
    conn = db.get_connection()
    row = conn.execute('SELECT * FROM users WHERE username = ? COLLATE NOCASE', (username,)).fetchone()
    conn.close()
    user = row_to_dict(row)
    if user and check_password_hash(user['password_hash'], password):
        return user
    return None


def get_user_by_id(user_id):
    conn = db.get_connection()
    row = conn.execute('SELECT id, username, created_at FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


# ================= TASKS =================

def get_all_tasks(user_id, filter_type='semua', sort_by='terbaru', search=None):
    if sort_by not in SORT_VALID:
        sort_by = SORT_DEFAULT
    order_clause = _ORDER_BY_MAP[sort_by]

    # Tugas yang sudah di-soft-delete (deleted = 1) selalu disembunyikan,
    # dan setiap user hanya boleh melihat tugas miliknya sendiri (user_id).
    conditions = ['deleted = 0', 'user_id = ?']
    params = [user_id]

    if filter_type == 'aktif':
        conditions.append('completed = 0')
    elif filter_type == 'selesai':
        conditions.append('completed = 1')

    search = (search or '').strip()
    if search:
        conditions.append('title LIKE ? COLLATE NOCASE')
        params.append(f'%{search}%')

    where_clause = ' AND '.join(conditions)

    conn = db.get_connection()
    rows = conn.execute(
        f'SELECT * FROM tasks WHERE {where_clause} ORDER BY {order_clause}', params
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def get_task_by_id(user_id, task_id):
    conn = db.get_connection()
    row = conn.execute(
        'SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id)
    ).fetchone()
    conn.close()
    return row_to_dict(row)


def add_task(user_id, title, priority, category, alarm_time, reminder_enabled=0, deadline=None):
    conn = db.get_connection()
    max_row = conn.execute(
        'SELECT MAX(sort_order) AS m FROM tasks WHERE user_id = ?', (user_id,)
    ).fetchone()
    next_order = (max_row['m'] + 1) if max_row and max_row['m'] is not None else 0
    cur = conn.execute(
        '''INSERT INTO tasks (user_id, title, priority, category, alarm_time, reminder_enabled, deadline, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (user_id, title, priority, category, alarm_time, reminder_enabled, deadline, next_order, datetime.now().isoformat())
    )
    conn.commit()
    task_id = cur.lastrowid
    conn.close()
    return task_id


def update_task(user_id, task_id, data):
    """Update field yang dikirim saja (partial update), khusus tugas milik user_id."""
    allowed = ['title', 'priority', 'category', 'alarm_time', 'reminder_enabled',
               'missed_notified', 'alarm_notified', 'completed', 'deadline', 'deadline_notified',
               'sort_order']
    fields, values = [], []
    for key in allowed:
        if key in data:
            fields.append(f'{key} = ?')
            values.append(data[key])
    if not fields:
        return
    values.append(task_id)
    values.append(user_id)
    conn = db.get_connection()
    conn.execute(f'UPDATE tasks SET {", ".join(fields)} WHERE id = ? AND user_id = ?', values)
    conn.commit()
    conn.close()


def reorder_tasks(user_id, ordered_ids):
    """
    Simpan urutan manual baru untuk tugas milik user_id. `ordered_ids` adalah
    list id tugas sesuai urutan yang diinginkan user (biasanya hasil drag &
    drop pada daftar yang sedang tampil).

    Tugas yang tidak ikut disebut (mis. sedang tersembunyi karena filter)
    tetap dipertahankan urutan relatifnya dan ditaruh setelah tugas yang
    baru diurutkan. ID yang bukan milik user_id ini diabaikan.
    """
    conn = db.get_connection()
    all_ids = [r['id'] for r in conn.execute(
        'SELECT id FROM tasks WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC', (user_id,)
    ).fetchall()]
    all_ids_set = set(all_ids)

    ordered_ids = [int(i) for i in ordered_ids if int(i) in all_ids_set]
    ordered_set = set(ordered_ids)
    remaining = [i for i in all_ids if i not in ordered_set]

    final_order = ordered_ids + remaining
    for idx, task_id in enumerate(final_order):
        conn.execute('UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?', (idx, task_id, user_id))
    conn.commit()
    conn.close()


def toggle_complete(user_id, task_id):
    conn = db.get_connection()
    row = conn.execute(
        'SELECT completed FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id)
    ).fetchone()
    if row:
        new_val = 0 if row['completed'] else 1
        conn.execute('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?', (new_val, task_id, user_id))
        conn.commit()
    conn.close()


def soft_delete_task(user_id, task_id):
    """Hapus 'sementara': tugas disembunyikan tapi belum benar-benar
    dibuang, supaya masih bisa di-'urungkan' (undo) dari frontend."""
    conn = db.get_connection()
    conn.execute('UPDATE tasks SET deleted = 1 WHERE id = ? AND user_id = ?', (task_id, user_id))
    conn.commit()
    conn.close()


def restore_task(user_id, task_id):
    """Kembalikan tugas yang barusan di-soft-delete (aksi 'Urungkan')."""
    conn = db.get_connection()
    conn.execute('UPDATE tasks SET deleted = 0 WHERE id = ? AND user_id = ?', (task_id, user_id))
    conn.commit()
    conn.close()


def delete_task(user_id, task_id):
    """Hapus permanen dari database. Dipanggil setelah jendela waktu
    'urungkan' di frontend habis, atau lewat endpoint /purge."""
    conn = db.get_connection()
    conn.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    conn.commit()
    conn.close()

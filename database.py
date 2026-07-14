"""
database.py
-----------
HANYA berisi koneksi ke SQLite dan pembuatan tabel.
Query untuk tugas (add/get/update/delete) dipisah di models.py
supaya file ini tetap ringkas dan fokus ke satu tanggung jawab.
"""

import sqlite3
from config import DB_PATH


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Buat tabel tasks & users jika belum ada. Aman dipanggil berkali-kali."""
    conn = get_connection()

    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()

    conn.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            priority TEXT NOT NULL DEFAULT 'Sedang',
            category TEXT NOT NULL DEFAULT 'Tugas',
            alarm_time TEXT,
            reminder_enabled INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            missed_notified INTEGER NOT NULL DEFAULT 0,
            alarm_notified INTEGER NOT NULL DEFAULT 0,
            deadline TEXT,
            deadline_notified INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            deleted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()

    # Migrasi ringan: kalau database lama belum punya kolom-kolom ini,
    # tambahkan supaya tidak perlu hapus database lama secara manual.
    existing_cols = [row['name'] for row in conn.execute('PRAGMA table_info(tasks)').fetchall()]
    if 'reminder_enabled' not in existing_cols:
        conn.execute('ALTER TABLE tasks ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0')
        conn.commit()
    if 'deadline' not in existing_cols:
        conn.execute('ALTER TABLE tasks ADD COLUMN deadline TEXT')
        conn.commit()
    if 'deadline_notified' not in existing_cols:
        conn.execute('ALTER TABLE tasks ADD COLUMN deadline_notified INTEGER NOT NULL DEFAULT 0')
        conn.commit()
    if 'sort_order' not in existing_cols:
        conn.execute('ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
        conn.commit()
        # Isi sort_order awal berdasarkan urutan created_at yang sudah ada,
        # supaya tugas lama tetap tampil sesuai urutan sebelumnya.
        rows = conn.execute('SELECT id FROM tasks ORDER BY created_at ASC').fetchall()
        for idx, row in enumerate(rows):
            conn.execute('UPDATE tasks SET sort_order = ? WHERE id = ?', (idx, row['id']))
        conn.commit()
    if 'deleted' not in existing_cols:
        # Kolom ini yang bikin fitur "urungkan hapus" bisa jalan: tugas yang
        # dihapus tidak langsung dibuang, cuma ditandai deleted=1 dulu.
        conn.execute('ALTER TABLE tasks ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0')
        conn.commit()
    if 'user_id' not in existing_cols:
        conn.execute('ALTER TABLE tasks ADD COLUMN user_id INTEGER')
        conn.commit()
        # Migrasi dari versi tanpa login: tugas lama (belum punya pemilik)
        # otomatis "diserahkan" ke user pertama yang daftar, supaya tidak
        # hilang begitu saja. Lihat models.create_user().

    conn.close()

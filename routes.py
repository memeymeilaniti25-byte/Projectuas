"""
routes.py
---------
Semua URL/endpoint didaftarkan di sini lewat Flask Blueprint.
File ini hanya menerima request & mengembalikan response —
logika database ada di models.py, konstanta ada di config.py.

Kalau mau nambah endpoint baru, tambahkan function baru di file ini.
"""

from functools import wraps
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
import models
from config import PRIORITAS_VALID, KATEGORI_VALID, PRIORITAS_DEFAULT, KATEGORI_DEFAULT

bp = Blueprint('main', __name__)


# ---------- Auth helper ----------

def login_required_page(view_func):
    """Untuk route HALAMAN: kalau belum login, lempar ke /login."""
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get('user_id'):
            return redirect(url_for('main.login_page'))
        return view_func(*args, **kwargs)
    return wrapper


def login_required_api(view_func):
    """Untuk route API: kalau belum login, balikin 401 JSON (bukan redirect),
    karena ini dipanggil lewat fetch(), bukan navigasi browser biasa."""
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Belum login'}), 401
        return view_func(*args, **kwargs)
    return wrapper


def current_user_id():
    return session['user_id']


# ---------- Halaman ----------

@bp.route('/')
@login_required_page
def index():
    return render_template('index.html', username=session.get('username'))


@bp.route('/register', methods=['GET', 'POST'])
def register_page():
    if session.get('user_id'):
        return redirect(url_for('main.index'))

    error = None
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password') or ''
        confirm = request.form.get('confirm') or ''

        if len(username) < 3:
            error = 'Username minimal 3 karakter.'
        elif len(password) < 6:
            error = 'Password minimal 6 karakter.'
        elif password != confirm:
            error = 'Konfirmasi password tidak cocok.'
        else:
            user_id = models.create_user(username, password)
            if user_id is None:
                error = 'Username sudah dipakai, coba yang lain.'
            else:
                session['user_id'] = user_id
                session['username'] = username
                return redirect(url_for('main.index'))

    return render_template('register.html', error=error)


@bp.route('/login', methods=['GET', 'POST'])
def login_page():
    if session.get('user_id'):
        return redirect(url_for('main.index'))

    error = None
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password') or ''
        user = models.verify_user(username, password)
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('main.index'))
        error = 'Username atau password salah.'

    return render_template('login.html', error=error)


@bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect(url_for('main.login_page'))


# ---------- API: TASKS ----------

@bp.route('/api/tasks', methods=['GET'])
@login_required_api
def api_get_tasks():
    uid = current_user_id()
    filter_type = request.args.get('filter', 'semua')
    sort_by = request.args.get('sort', 'terbaru')
    search = request.args.get('q', '')
    tasks = models.get_all_tasks(uid, filter_type, sort_by, search)
    total = len(models.get_all_tasks(uid, 'semua'))
    selesai = len(models.get_all_tasks(uid, 'selesai'))
    return jsonify({'tasks': tasks, 'total': total, 'selesai': selesai})


@bp.route('/api/tasks/reorder', methods=['PUT'])
@login_required_api
def api_reorder_tasks():
    uid = current_user_id()
    data = request.get_json(force=True)
    order = data.get('order')
    if not isinstance(order, list) or not order:
        return jsonify({'error': 'Urutan tugas tidak valid'}), 400
    try:
        order = [int(i) for i in order]
    except (TypeError, ValueError):
        return jsonify({'error': 'Urutan tugas tidak valid'}), 400
    models.reorder_tasks(uid, order)
    return jsonify({'success': True})


@bp.route('/api/tasks', methods=['POST'])
@login_required_api
def api_add_task():
    uid = current_user_id()
    data = request.get_json(force=True)
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Judul tugas tidak boleh kosong'}), 400

    priority = data.get('priority', PRIORITAS_DEFAULT)
    category = data.get('category', KATEGORI_DEFAULT)
    alarm_time = data.get('alarm_time') or None
    reminder_enabled = 1 if data.get('reminder_enabled') else 0
    deadline = (data.get('deadline') or '').strip() or None

    if priority not in PRIORITAS_VALID:
        priority = PRIORITAS_DEFAULT
    if category not in KATEGORI_VALID:
        category = KATEGORI_DEFAULT

    task_id = models.add_task(uid, title, priority, category, alarm_time, reminder_enabled, deadline)
    return jsonify(models.get_task_by_id(uid, task_id)), 201


@bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required_api
def api_update_task(task_id):
    uid = current_user_id()
    data = request.get_json(force=True)
    models.update_task(uid, task_id, data)
    task = models.get_task_by_id(uid, task_id)
    if not task:
        return jsonify({'error': 'Tugas tidak ditemukan'}), 404
    return jsonify(task)


@bp.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
@login_required_api
def api_toggle_task(task_id):
    uid = current_user_id()
    models.toggle_complete(uid, task_id)
    task = models.get_task_by_id(uid, task_id)
    if not task:
        return jsonify({'error': 'Tugas tidak ditemukan'}), 404
    return jsonify(task)


@bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required_api
def api_delete_task(task_id):
    # Soft delete: tugas disembunyikan dulu, belum dibuang permanen,
    # supaya frontend bisa menawarkan tombol "Urungkan".
    uid = current_user_id()
    models.soft_delete_task(uid, task_id)
    return jsonify({'success': True})


@bp.route('/api/tasks/<int:task_id>/restore', methods=['PATCH'])
@login_required_api
def api_restore_task(task_id):
    uid = current_user_id()
    models.restore_task(uid, task_id)
    task = models.get_task_by_id(uid, task_id)
    if not task:
        return jsonify({'error': 'Tugas tidak ditemukan'}), 404
    return jsonify(task)


@bp.route('/api/tasks/<int:task_id>/purge', methods=['DELETE'])
@login_required_api
def api_purge_task(task_id):
    # Dipanggil otomatis oleh frontend setelah jendela waktu "Urungkan"
    # habis, untuk benar-benar menghapus tugas dari database.
    uid = current_user_id()
    models.delete_task(uid, task_id)
    return jsonify({'success': True})

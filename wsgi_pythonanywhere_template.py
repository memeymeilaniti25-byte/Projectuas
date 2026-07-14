"""
wsgi_pythonanywhere_template.py
--------------------------------
Ini BUKAN file yang dijalankan langsung. Isi file ini tinggal
di-copy-paste ke "WSGI configuration file" yang disediakan
PythonAnywhere di halaman tab Web.

Langkah:
1. Ganti USERNAME di bawah dengan username akun PythonAnywhere kamu.
2. Jika nama foldernya bukan "todolist_app", sesuaikan juga.
3. Copy semua isi (di bawah garis) ke WSGI configuration file
   punya PythonAnywhere, hapus dulu isi bawaannya.
"""

# ============ COPY DARI SINI ============

import sys

# Ganti USERNAME dengan username PythonAnywhere kamu
project_home = '/home/USERNAME/todolist_app'

if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Pastikan tabel database sudah dibuat (aman dipanggil berkali-kali)
import database
database.init_db()

from app import app as application

# ============ SAMPAI SINI ============

"""
config.py
---------
Semua konstanta & konfigurasi terpusat di sini.
Kalau mau ganti nama prioritas/kategori, atau lokasi file database,
cukup ubah di file ini saja — tidak perlu buka file lain.
"""

import os
import secrets

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'todolist.db')

# Kunci untuk session login (cookie terenkripsi). Sebaiknya di-set lewat
# environment variable SECRET_KEY saat deploy ke production, supaya session
# tidak reset tiap kali server di-restart. Kalau tidak di-set, dibuat acak
# otomatis (aman untuk development, tapi bikin semua orang logout tiap restart).
SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

PRIORITAS_VALID = ('Penting', 'Sedang', 'Santai')
# "Pengingat" bukan lagi bagian dari kategori/mode fokus — sekarang jadi
# toggle terpisah (reminder_enabled) supaya bisa dipilih bersamaan dengan
# prioritas & mode fokus (lihat routes.py & models.py).
KATEGORI_VALID = ('Belajar', 'Tugas')

PRIORITAS_DEFAULT = 'Sedang'
KATEGORI_DEFAULT = 'Tugas'

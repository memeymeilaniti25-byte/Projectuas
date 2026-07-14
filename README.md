# To-Do List — Meja Belajar Digital

Aplikasi To-Do List berbasis web menggunakan **Python (Flask)** dan **SQLite**,
dengan tampilan mengikuti desain "Meja Belajar Digital" (nuansa krem hangat, cokelat kayu, terakota).

## Struktur Kode (dipisah kecil-kecil per fungsi)

```
todolist_app/
├── app.py                 # Entry point: buat app Flask & jalankan server
├── config.py              # Konstanta: path DB, pilihan prioritas/kategori
├── database.py            # Koneksi & pembuatan tabel SQLite
├── models.py               # Semua query CRUD tugas (add/get/update/delete)
├── routes.py               # Semua endpoint API (Blueprint Flask)
├── todolist.db             # File database (otomatis dibuat saat pertama run)
├── requirements.txt
├── wsgi_pythonanywhere_template.py   # Template WSGI untuk deploy
│
├── templates/
│   └── index.html          # Struktur HTML halaman
│
└── static/
    ├── css/
    │   ├── variables.css   # Warna & font tema (ubah tema di sini)
    │   ├── base.css        # Reset dasar & body
    │   ├── layout.css      # Header, progress bar, form, filter, footer
    │   ├── components.css  # Item tugas, badge, pill, toast
    │   └── responsive.css  # Media query mobile
    │
    └── js/
        ├── state.js          # Data bersama (daftar tugas, filter aktif)
        ├── api.js             # Semua fetch() ke backend
        ├── render.js          # Menggambar tugas & progress bar ke HTML
        ├── clock.js           # Jam digital & tanggal
        ├── alarm.js           # Pengecekan & bunyi alarm
        ├── notifications.js   # Toast, notifikasi browser, beep
        ├── utils.js           # Fungsi bantuan kecil (format waktu, dll)
        └── main.js            # Entry point: menghubungkan semua modul
```

**Panduan cepat kalau mau mengubah sesuatu:**
| Mau ubah apa? | Edit file |
|---|---|
| Warna tema / font | `static/css/variables.css` |
| Tampilan header/form/filter | `static/css/layout.css` |
| Tampilan kartu tugas/badge | `static/css/components.css` |
| Pilihan prioritas/kategori baru | `config.py` |
| Query database baru | `models.py` |
| Endpoint API baru | `routes.py` |
| Cara alarm bekerja | `static/js/alarm.js` |
| Cara notifikasi muncul | `static/js/notifications.js` |
| Alur aplikasi saat dibuka | `static/js/main.js` |

## Fitur

- Tambah tugas dengan judul, prioritas (Penting / Sedang / Santai),
  kategori (Belajar / Tugas / Pengingat), dan waktu alarm opsional.
- Filter tugas: Semua / Aktif / Selesai.
- Progress bar otomatis berdasarkan jumlah tugas selesai.
- Jam digital real-time & tanggal hari ini.
- **Notifikasi tugas selesai** — muncul toast + notifikasi browser saat tugas ditandai selesai.
- **Notifikasi tugas terlewat** — tugas dengan alarm yang sudah lewat waktu dan belum selesai
  akan ditandai "Terlewat" dan memicu notifikasi otomatis.
- **Alarm** — tugas berkategori *Belajar* atau berprioritas *Penting* yang diberi waktu alarm
  akan berbunyi (beep) dan memunculkan notifikasi tepat saat waktunya tiba.
- Notifikasi browser asli (Web Notification API) — akan meminta izin saat halaman pertama dibuka.
- **Login & akun sendiri** — setiap orang harus daftar/masuk dulu, dan hanya bisa melihat
  serta mengubah tugas miliknya sendiri. Password disimpan dalam bentuk hash (tidak plain text).
- **Urutan tugas** — bisa diurutkan otomatis (Terbaru/Terlama/Prioritas/Deadline/Abjad),
  atau diatur manual lewat drag & drop.
- **Konfirmasi hapus + urungkan** — tugas tidak langsung hilang permanen, ada jendela waktu
  singkat untuk membatalkan penghapusan.
- **Pencarian tugas** berdasarkan judul.

## Cara Menjalankan

1. Pastikan Python 3.9+ sudah terpasang.
2. Install dependency:
   ```
   pip install -r requirements.txt
   ```
3. Jalankan aplikasi:
   ```
   python app.py
   ```
4. Buka browser ke `http://127.0.0.1:5000` — akan diarahkan ke halaman **Daftar/Masuk**
   dulu sebelum bisa memakai to-do list-nya.
5. Saat pertama dibuka, browser akan meminta izin notifikasi — klik **Allow/Izinkan**
   agar fitur notifikasi alarm & tugas terlewat berfungsi optimal.

Database SQLite (`todolist.db`) akan otomatis dibuat di folder yang sama saat pertama kali dijalankan.

## Catatan Teknis

- Pengecekan alarm & sinkronisasi data berjalan otomatis tiap beberapa detik di sisi
  browser (lihat `checkAlarms()` dan `fetchTasks()` di `app.js`), sehingga tab harus
  tetap terbuka agar notifikasi real-time berfungsi.
- Suara alarm dibuat langsung lewat Web Audio API (tidak perlu file suara eksternal).
- **Login** memakai session cookie bawaan Flask (`SECRET_KEY` di `config.py`). Saat deploy
  ke production, sebaiknya set environment variable `SECRET_KEY` ke nilai acak yang tetap
  (`python -c "import secrets; print(secrets.token_hex(32))"`), supaya semua orang tidak
  otomatis logout tiap kali server di-restart.
- Kalau sebelumnya sudah punya `todolist.db` dari versi tanpa login: tugas-tugas lama
  otomatis "diserahkan" ke akun pertama yang kamu daftarkan setelah update ini.


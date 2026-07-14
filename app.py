"""
app.py
------
Entry point aplikasi. File ini sengaja dibuat sangat pendek:
- Membuat instance Flask
- Mendaftarkan Blueprint dari routes.py
- Menjalankan server (kalau dijalankan langsung: python app.py)

Kalau mau ubah routing -> edit routes.py
Kalau mau ubah query database -> edit models.py
Kalau mau ubah koneksi/tabel database -> edit database.py
Kalau mau ubah konstanta (path, pilihan prioritas/kategori) -> edit config.py
"""

from flask import Flask
from routes import bp
import database
import config


def create_app():
    app = Flask(__name__)
    app.secret_key = config.SECRET_KEY
    app.register_blueprint(bp)
    return app


app = create_app()

if __name__ == '__main__':
    database.init_db()
    app.run(debug=True, port=5000)

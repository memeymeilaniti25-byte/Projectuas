/*
  clock.js
  --------
  Menampilkan jam digital & tanggal hari ini, update tiap detik.
*/

import { pad } from './utils.js';

export function updateClock() {
  const d = new Date();
  document.getElementById('digital-clock').textContent =
    `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
                   'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  document.getElementById('today-date').textContent =
    `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/*
  state.js
  --------
  Satu tempat menyimpan data yang dipakai bersama oleh modul lain
  (daftar tugas, filter aktif, pilihan prioritas/kategori yang sedang dipilih).
*/

export const state = {
  tasks: [],
  filter: 'semua',
  sortBy: 'terbaru',
  search: '',
  selectedPriority: 'Sedang',
  selectedCategory: 'Tugas',
  // Pengingat kini toggle independen: bisa aktif bersamaan dengan
  // prioritas apa pun dan kategori (mode fokus) apa pun.
  reminderEnabled: false,
};

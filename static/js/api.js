/*
  api.js
  ------
  Semua komunikasi ke backend Flask (fetch) terpusat di sini.
  Modul lain TIDAK boleh memanggil fetch() langsung —
  supaya kalau endpoint API berubah, cukup diedit di file ini saja.
*/

// Kalau session login habis/expired di tengah pemakaian, backend akan
// balikin 401. Daripada layar jadi kosong tanpa penjelasan, langsung
// arahkan user balik ke halaman login.
function redirectIfUnauthorized(res) {
  if (res.status === 401) {
    window.location.href = '/login';
  }
  return res;
}

export async function fetchTasksApi(filter, sortBy = 'terbaru', search = '') {
  const params = new URLSearchParams({ filter, sort: sortBy, q: search });
  const res = redirectIfUnauthorized(await fetch(`/api/tasks?${params.toString()}`));
  return res.json();
}

export async function reorderTasksApi(orderIds) {
  const res = redirectIfUnauthorized(await fetch('/api/tasks/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: orderIds }),
  }));
  return res.ok;
}

export async function addTaskApi(payload) {
  const res = redirectIfUnauthorized(await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function toggleTaskApi(id) {
  const res = redirectIfUnauthorized(await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' }));
  return res.ok;
}

export async function deleteTaskApi(id) {
  const res = redirectIfUnauthorized(await fetch(`/api/tasks/${id}`, { method: 'DELETE' }));
  return res.ok;
}

export async function restoreTaskApi(id) {
  const res = redirectIfUnauthorized(await fetch(`/api/tasks/${id}/restore`, { method: 'PATCH' }));
  return res.ok;
}

export async function purgeTaskApi(id) {
  const res = redirectIfUnauthorized(await fetch(`/api/tasks/${id}/purge`, { method: 'DELETE' }));
  return res.ok;
}

export async function updateTaskApi(id, data) {
  const res = redirectIfUnauthorized(await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
  const responseData = await res.json();
  return { ok: res.ok, data: responseData };
}

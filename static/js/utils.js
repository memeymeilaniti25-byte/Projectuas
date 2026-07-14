/*
  utils.js
  --------
  Fungsi bantuan kecil & generik yang dipakai di banyak modul lain.
*/

export function pad(n) {
  return n.toString().padStart(2, '0');
}

export function nowHHMM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Bandingkan tanggal deadline (YYYY-MM-DD) dengan hari ini,
 * lalu kembalikan status & label yang ramah dibaca manusia.
 * @param {string} deadline format YYYY-MM-DD
 * @returns {{status: 'overdue'|'today'|'soon'|'normal', label: string, diffDays: number}}
 */
export function deadlineInfo(deadline) {
  const todayStr = todayISODate();
  const today = new Date(`${todayStr}T00:00:00`);
  const target = new Date(`${deadline}T00:00:00`);
  const diffDays = Math.round((target - today) / 86400000);

  const formatted = target.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  if (diffDays < 0) {
    return { status: 'overdue', label: `Terlambat ${Math.abs(diffDays)} hari (${formatted})`, diffDays };
  }
  if (diffDays === 0) {
    return { status: 'today', label: `Deadline hari ini (${formatted})`, diffDays };
  }
  if (diffDays === 1) {
    return { status: 'soon', label: `Deadline besok (${formatted})`, diffDays };
  }
  if (diffDays <= 3) {
    return { status: 'soon', label: `${diffDays} hari lagi (${formatted})`, diffDays };
  }
  return { status: 'normal', label: formatted, diffDays };
}

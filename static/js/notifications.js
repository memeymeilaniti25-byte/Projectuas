/*
  notifications.js
  ----------------
  Semua cara aplikasi "memberi tahu" user ada di sini:
  - toast di pojok layar
  - notifikasi browser (Web Notification API)
  - suara beep alarm
*/

export function showToast(message, type = 'default', action = null) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  toast.appendChild(text);

  if (action && action.label) {
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick();
      toast.remove();
    });
    toast.appendChild(btn);
  }

  container.appendChild(toast);
  setTimeout(() => toast.remove(), action ? 6000 : 4500);
}

export function showBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    /* audio tidak tersedia, abaikan */
  }
}

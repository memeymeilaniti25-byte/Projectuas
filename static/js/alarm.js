/*
  alarm.js
  --------
  Khusus logika pengecekan alarm: tugas kategori "Belajar" atau
  prioritas "Penting" yang punya alarm_time akan dibunyikan
  tepat saat jam menunjukkan waktu tersebut.
*/

import { nowHHMM } from './utils.js';
import { beep, showToast, showBrowserNotification } from './notifications.js';
import { updateTaskApi } from './api.js';

export function checkAlarms(tasks) {
  const nowStr = nowHHMM();
  tasks.forEach((task) => {
    if (task.completed || !task.alarm_time) return;

    const isAlarmCategory = task.category === 'Belajar' ||
      task.priority === 'Penting' ||
      Number(task.reminder_enabled) === 1;
    if (isAlarmCategory && task.alarm_time === nowStr && !task.alarm_notified) {
      beep();
      showToast(`⏰ Alarm: "${task.title}" — waktunya sekarang!`, 'alarm');
      showBrowserNotification('Alarm Tugas', `Sekarang waktunya: "${task.title}"`);
      updateTaskApi(task.id, { alarm_notified: 1 });
      task.alarm_notified = 1;
    }
  });
}

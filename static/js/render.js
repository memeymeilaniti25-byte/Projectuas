/*
  render.js
  ---------
  Menggambar (render) daftar tugas & progress bar ke HTML.
  File ini tidak memanggil API — hanya menerima data lalu menampilkannya.
  Kalau mau ubah tampilan kartu tugas, cukup edit file ini + components.css.
*/

import { nowHHMM, escapeHtml, deadlineInfo } from './utils.js';

const CATEGORY_ICON = { Belajar: '📖', Tugas: '✏️' };

/**
 * @param {Array} tasks daftar tugas dari state
 * @param {Object} handlers { onToggle(id, completed), onDelete(id), onOverdue(task), onDeadlineMissed(task), onEdit(id), onReorder(idsBaru), draggable }
 */
export function renderTasks(tasks, handlers) {
  const list = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  list.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  const nowStr = nowHHMM();
  const draggable = !!handlers.draggable;

  tasks.forEach((task) => {
    const isAlarmOverdue = !task.completed && task.alarm_time && task.alarm_time < nowStr;

    const dInfo = task.deadline ? deadlineInfo(task.deadline) : null;
    const isDeadlineOverdue = !task.completed && dInfo && dInfo.status === 'overdue';

    const item = document.createElement('div');
    item.className = `task-item priority-${task.priority}` +
      (task.completed ? ' completed' : '') +
      (isAlarmOverdue || isDeadlineOverdue ? ' overdue' : '') +
      (draggable ? ' draggable' : '');
    item.dataset.id = task.id;
    if (draggable) {
      item.draggable = true;
    }

    const icon = CATEGORY_ICON[task.category] || '📌';

    let deadlineBadge = '';
    if (dInfo) {
      const badgeClass = dInfo.status === 'overdue' ? 'badge-deadline-overdue'
        : dInfo.status === 'today' ? 'badge-deadline-today'
        : dInfo.status === 'soon' ? 'badge-deadline-soon'
        : 'badge-deadline';
      deadlineBadge = `<span class="badge ${badgeClass}">📅 ${dInfo.label}</span>`;
    }

    item.innerHTML = `
      ${draggable ? '<span class="drag-handle" title="Seret untuk urutkan">⠿</span>' : ''}
      <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}" data-completed="${task.completed}"></button>
      <div class="task-body">
        <p class="task-title">${escapeHtml(task.title)}</p>
        <div class="task-tags">
          <span class="badge badge-priority-${task.priority}">${task.priority}</span>
          <span class="badge badge-category">${icon} ${task.category}</span>
          ${Number(task.reminder_enabled) === 1 ? '<span class="badge badge-reminder">🔔 Pengingat</span>' : ''}
          ${task.alarm_time ? `<span class="badge badge-time">⏰ ${task.alarm_time}</span>` : ''}
          ${deadlineBadge}
          ${isAlarmOverdue ? '<span class="badge badge-overdue">Terlewat</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-edit" data-id="${task.id}">✎</button>
        <button class="task-delete" data-id="${task.id}">✕</button>
      </div>
    `;
    list.appendChild(item);

    if (isAlarmOverdue && !task.missed_notified) {
      handlers.onOverdue(task);
    }
    if (isDeadlineOverdue && !task.deadline_notified) {
      handlers.onDeadlineMissed(task);
    }
  });

  list.querySelectorAll('.task-checkbox').forEach((btn) => {
    btn.addEventListener('click', () => {
      const completed = btn.dataset.completed === '1' || btn.dataset.completed === 'true';
      handlers.onToggle(btn.dataset.id, completed);
    });
  });
  list.querySelectorAll('.task-delete').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onDelete(btn.dataset.id));
  });
  list.querySelectorAll('.task-edit').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onEdit(btn.dataset.id));
  });

  if (draggable) {
    bindDragAndDrop(list, handlers.onReorder);
  }
}

// ---------- Drag & drop (urutan manual) ----------

let draggedItem = null;
export let isDragInProgress = false;

function bindDragAndDrop(list, onReorder) {
  const items = list.querySelectorAll('.task-item');

  items.forEach((item) => {
    item.addEventListener('dragstart', () => {
      draggedItem = item;
      isDragInProgress = true;
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
      isDragInProgress = false;
      const newOrder = Array.from(list.querySelectorAll('.task-item')).map((el) => el.dataset.id);
      onReorder(newOrder);
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedItem || draggedItem === item) return;
      const rect = item.getBoundingClientRect();
      const isAfter = e.clientY - rect.top > rect.height / 2;
      list.insertBefore(draggedItem, isAfter ? item.nextSibling : item);
    });
  });
}

export function updateProgress(total, selesai) {
  const percent = total === 0 ? 0 : Math.round((selesai / total) * 100);
  document.getElementById('progress-label').textContent = `${selesai} dari ${total} tugas selesai`;
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-bar-fill').style.width = `${percent}%`;
  document.getElementById('remaining-label').textContent = `${total - selesai} tasks remaining`;
}

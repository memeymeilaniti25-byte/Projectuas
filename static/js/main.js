/*
  main.js
  -------
  Entry point aplikasi. File ini menghubungkan semua modul:
  state, api, render, clock, alarm, notifications.
  Kalau mau tahu "alur" aplikasi berjalan, mulai baca dari sini.
*/

import { state } from './state.js';
import {
  fetchTasksApi, addTaskApi, toggleTaskApi, deleteTaskApi, updateTaskApi,
  reorderTasksApi, restoreTaskApi, purgeTaskApi,
} from './api.js';
import { renderTasks, updateProgress, isDragInProgress } from './render.js';
import { updateClock } from './clock.js';
import { checkAlarms } from './alarm.js';
import { showToast, showBrowserNotification, requestNotifPermission } from './notifications.js';

// ---------- Ambil & tampilkan data ----------

async function fetchTasks() {
  const data = await fetchTasksApi(state.filter, state.sortBy, state.search);
  state.tasks = data.tasks;
  renderTasks(state.tasks, {
    onToggle: toggleTask,
    onDelete: openDeleteModal,
    onOverdue: handleOverdue,
    onDeadlineMissed: handleDeadlineMissed,
    onEdit: openEditModal,
    onReorder: reorderTasks,
    draggable: state.sortBy === 'manual',
  });
  updateProgress(data.total, data.selesai);
}

// ---------- Urutan manual (drag & drop) ----------

async function reorderTasks(newOrderIds) {
  const ok = await reorderTasksApi(newOrderIds);
  if (ok) {
    fetchTasks();
  } else {
    showToast('Gagal menyimpan urutan tugas', 'danger');
  }
}

// ---------- Aksi pengguna ----------

async function addTask() {
  const input = document.getElementById('task-input');
  const title = input.value.trim();
  if (!title) return;

  const alarmTime = document.getElementById('alarm-time-input').value || null;
  const deadline = document.getElementById('deadline-input').value || null;

  const { ok, data } = await addTaskApi({
    title,
    priority: state.selectedPriority,
    category: state.selectedCategory,
    alarm_time: alarmTime,
    reminder_enabled: state.reminderEnabled,
    deadline,
  });

  if (ok) {
    input.value = '';
    document.getElementById('alarm-time-input').value = '';
    document.getElementById('deadline-input').value = '';
    resetReminderToggle();
    showToast('Tugas baru ditambahkan ✏️', 'default');
    fetchTasks();
  } else {
    showToast(data.error || 'Gagal menambah tugas', 'danger');
  }
}

async function toggleTask(id, currentlyCompleted) {
  const ok = await toggleTaskApi(id);
  if (ok) {
    if (!currentlyCompleted) {
      showToast('Tugas selesai dikerjakan! 🎉', 'success');
      showBrowserNotification('Tugas Selesai', 'Kerja bagus! Satu tugas berhasil diselesaikan.');
    }
    fetchTasks();
  }
}

// ---------- Hapus tugas (konfirmasi + urungkan) ----------

let taskIdPendingDelete = null;
const pendingPurgeTimers = {}; // { [taskId]: timeoutId }

function openDeleteModal(id) {
  const task = state.tasks.find((t) => String(t.id) === String(id));
  taskIdPendingDelete = id;
  document.getElementById('delete-task-title').textContent = task ? `"${task.title}"` : 'tugas ini';
  document.getElementById('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  taskIdPendingDelete = null;
}

async function confirmDelete() {
  const id = taskIdPendingDelete;
  const task = state.tasks.find((t) => String(t.id) === String(id));
  const title = task ? task.title : 'Tugas';
  closeDeleteModal();

  const ok = await deleteTaskApi(id);
  if (!ok) {
    showToast('Gagal menghapus tugas', 'danger');
    return;
  }

  fetchTasks();

  // Beri jendela waktu untuk "Urungkan" sebelum benar-benar dihapus permanen.
  pendingPurgeTimers[id] = setTimeout(() => {
    purgeTaskApi(id);
    delete pendingPurgeTimers[id];
  }, 6000);

  showToast(`Tugas ${title ? `"${title}"` : ''} dihapus`, 'default', {
    label: 'Urungkan',
    onClick: () => undoDelete(id),
  });
}

async function undoDelete(id) {
  if (pendingPurgeTimers[id]) {
    clearTimeout(pendingPurgeTimers[id]);
    delete pendingPurgeTimers[id];
  }
  const ok = await restoreTaskApi(id);
  if (ok) {
    showToast('Tugas dikembalikan', 'success');
    fetchTasks();
  } else {
    showToast('Gagal mengembalikan tugas', 'danger');
  }
}

function bindDeleteModal() {
  document.getElementById('delete-cancel-btn').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-confirm-btn').addEventListener('click', confirmDelete);
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
  });
}

function handleOverdue(task) {
  showToast(`Tugas terlewat: "${task.title}"`, 'danger');
  showBrowserNotification('Tugas Terlewat', `"${task.title}" belum selesai melewati waktu alarm.`);
  updateTaskApi(task.id, { missed_notified: 1 });
  task.missed_notified = 1;
}

function handleDeadlineMissed(task) {
  showToast(`Deadline terlewat: "${task.title}"`, 'danger');
  showBrowserNotification('Deadline Terlewat', `"${task.title}" sudah melewati batas waktu deadline.`);
  updateTaskApi(task.id, { deadline_notified: 1 });
  task.deadline_notified = 1;
}

// ---------- Edit tugas ----------

let editingTaskId = null;

function setActivePill(groupId, value) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.pill').forEach((p) => {
    p.classList.toggle('active', p.dataset.value === value);
  });
}

function openEditModal(id) {
  const task = state.tasks.find((t) => String(t.id) === String(id));
  if (!task) return;

  editingTaskId = task.id;
  document.getElementById('edit-task-input').value = task.title;
  document.getElementById('edit-alarm-time-input').value = task.alarm_time || '';
  document.getElementById('edit-deadline-input').value = task.deadline || '';
  setActivePill('edit-priority-group', task.priority);
  setActivePill('edit-category-group', task.category);

  const reminderBtn = document.getElementById('edit-reminder-toggle');
  const reminderOn = Number(task.reminder_enabled) === 1;
  reminderBtn.classList.toggle('active', reminderOn);
  reminderBtn.dataset.enabled = reminderOn ? '1' : '0';

  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingTaskId = null;
}

async function saveEditedTask() {
  if (editingTaskId === null) return;

  const title = document.getElementById('edit-task-input').value.trim();
  if (!title) {
    showToast('Judul tugas tidak boleh kosong', 'danger');
    return;
  }

  const priority = document.querySelector('#edit-priority-group .pill.active')?.dataset.value || 'Sedang';
  const category = document.querySelector('#edit-category-group .pill.active')?.dataset.value || 'Tugas';
  const alarmTime = document.getElementById('edit-alarm-time-input').value || null;
  const reminderEnabled = document.getElementById('edit-reminder-toggle').dataset.enabled === '1' ? 1 : 0;
  const deadline = document.getElementById('edit-deadline-input').value || null;

  const task = state.tasks.find((t) => String(t.id) === String(editingTaskId));
  const deadlineChanged = task && task.deadline !== deadline;

  const { ok, data } = await updateTaskApi(editingTaskId, {
    title,
    priority,
    category,
    alarm_time: alarmTime,
    reminder_enabled: reminderEnabled,
    deadline,
    ...(deadlineChanged ? { deadline_notified: 0 } : {}),
  });

  if (ok) {
    showToast('Tugas berhasil diperbarui ✏️', 'success');
    closeEditModal();
    fetchTasks();
  } else {
    showToast(data.error || 'Gagal memperbarui tugas', 'danger');
  }
}

function bindEditModal() {
  document.getElementById('edit-priority-group').querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => setActivePill('edit-priority-group', pill.dataset.value));
  });
  document.getElementById('edit-category-group').querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => setActivePill('edit-category-group', pill.dataset.value));
  });
  document.getElementById('edit-reminder-toggle').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const enabled = btn.dataset.enabled === '1';
    btn.dataset.enabled = enabled ? '0' : '1';
    btn.classList.toggle('active', !enabled);
  });
  document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);
  document.getElementById('edit-save-btn').addEventListener('click', saveEditedTask);
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') closeEditModal();
  });
}

// ---------- Binding UI ----------

function bindPillGroup(groupId, stateKey) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      group.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state[stateKey] = pill.dataset.value;
    });
  });
}

function bindReminderToggle() {
  const btn = document.getElementById('reminder-toggle');
  btn.addEventListener('click', () => {
    state.reminderEnabled = !state.reminderEnabled;
    btn.classList.toggle('active', state.reminderEnabled);
  });
}

function resetReminderToggle() {
  state.reminderEnabled = false;
  document.getElementById('reminder-toggle').classList.remove('active');
}

function bindFilterTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.filter = tab.dataset.filter;
      fetchTasks();
    });
  });
}

function bindSortSelect() {
  const select = document.getElementById('sort-select');
  const hint = document.getElementById('reorder-hint');
  select.value = state.sortBy;
  hint.style.display = state.sortBy === 'manual' ? 'block' : 'none';

  select.addEventListener('change', () => {
    state.sortBy = select.value;
    hint.style.display = state.sortBy === 'manual' ? 'block' : 'none';
    fetchTasks();
  });
}

function bindSearchInput() {
  const input = document.getElementById('search-input');
  let debounceTimer = null;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.search = input.value.trim();
      fetchTasks();
    }, 300);
  });
}

// ---------- Inisialisasi ----------

function init() {
  requestNotifPermission();

  updateClock();
  setInterval(updateClock, 1000);

  bindPillGroup('priority-group', 'selectedPriority');
  bindPillGroup('category-group', 'selectedCategory');
  bindReminderToggle();
  bindFilterTabs();
  bindSortSelect();
  bindSearchInput();
  bindEditModal();
  bindDeleteModal();

  document.getElementById('add-btn').addEventListener('click', addTask);
  document.getElementById('task-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  fetchTasks();
  setInterval(() => {
    if (!isDragInProgress) fetchTasks();
  }, 15000);
  setInterval(() => checkAlarms(state.tasks), 20000);
}

document.addEventListener('DOMContentLoaded', init);

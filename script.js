"use strict";

/* ==========================================
   DAYBLOOM — vanilla JS + Bootstrap modals/toast
   ========================================== */

// 1. Elements
const $ = (id) => document.getElementById(id);

const list = $("task-list");
const emptyBox = $("empty");
const form = $("task-form");
const taskModal = new bootstrap.Modal($("task-modal"));
const deleteModal = new bootstrap.Modal($("delete-modal"));
const toast = bootstrap.Toast.getOrCreateInstance($("toast"), { delay: 2500 });

// 2. State
const STORAGE_KEY = "daybloom-tasks-v1";
let tasks = load();
let filter = "all";
let query = "";
let deleteId = null;

// 3. Storage
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    showToast("Could not save. Check browser storage settings.");
  }
}

// 4. Helpers
function showToast(message) {
  $("toast-body").textContent = message;
  toast.show();
}

// Escape text so users can't inject HTML into the page
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// 5. Filter + search
function visibleTasks() {
  const today = todayString();

  return tasks.filter((t) => {
    const text = (t.title + " " + t.description).toLowerCase();
    if (!text.includes(query)) return false;

    if (filter === "today") return t.dueDate === today;
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });
}

// 6. Render
function taskHTML(t) {
  const today = todayString();
  const overdue = t.dueDate && !t.completed && t.dueDate < today;

  const dateTag = t.dueDate
    ? `<span class="tag ${overdue ? "tag-overdue" : "tag-date"}">${overdue ? "Overdue · " : "Due "}${formatDate(t.dueDate)}</span>`
    : "";

  return `
    <article class="task-card d-flex align-items-start gap-3 ${t.completed ? "done" : ""}" data-id="${t.id}">
      <input class="form-check-input mt-1 flex-shrink-0" type="checkbox" data-act="toggle"
             ${t.completed ? "checked" : ""} aria-label="Mark ${esc(t.title)} as done" />
      <div class="task-main flex-grow-1">
        <h3 class="task-title">${esc(t.title)}</h3>
        ${t.description ? `<p class="task-desc">${esc(t.description)}</p>` : ""}
        <div class="d-flex flex-wrap gap-2 mt-2">
          <span class="tag tag-${t.priority}">${t.priority[0].toUpperCase() + t.priority.slice(1)} priority</span>
          ${dateTag}
        </div>
      </div>
      <div class="d-flex flex-column flex-sm-row flex-shrink-0">
        <button class="icon-btn" type="button" data-act="edit" aria-label="Edit task">✎</button>
        <button class="icon-btn del" type="button" data-act="delete" aria-label="Delete task">×</button>
      </div>
    </article>`;
}

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pending = total - done;
  const percent = total ? Math.round((done / total) * 100) : 0;

  $("stat-total").textContent = total;
  $("stat-done").textContent = done;
  $("stat-pending").textContent = pending;
  $("stat-percent").textContent = percent + "%";
  $("progress-bar").style.width = percent + "%";
  $("progress").setAttribute("aria-valuenow", percent);

  $("progress-text").textContent =
    total === 0 ? "Your journey starts here"
    : percent === 100 ? "Amazing! All tasks completed."
    : `${pending} ${pending === 1 ? "task" : "tasks"} left to go`;
}

function renderTasks() {
  const items = visibleTasks();
  list.innerHTML = items.map(taskHTML).join("");

  const hasItems = items.length > 0;
  list.hidden = !hasItems;
  emptyBox.hidden = hasItems;

  if (!hasItems) {
    if (tasks.length === 0) {
      $("empty-title").textContent = "A fresh start!";
      $("empty-text").textContent = "Add your first task to get started.";
    } else {
      $("empty-title").textContent = "Nothing to show";
      $("empty-text").textContent = "Try a different search or filter.";
    }
  }

  $("count").textContent = `${items.length} ${items.length === 1 ? "task" : "tasks"} shown`;
}

function render() {
  renderStats();
  renderTasks();
}

// 7. Add / edit
function openForm(task = null) {
  form.reset();
  form.classList.remove("was-validated");

  $("task-id").value = task ? task.id : "";
  $("modal-title").textContent = task ? "Edit your task" : "Create a task";
  $("save-btn").textContent = task ? "Update task" : "Save task";

  if (task) {
    $("task-title").value = task.title;
    $("task-desc").value = task.description;
    $("task-priority").value = task.priority;
    $("task-date").value = task.dueDate;
  }

  taskModal.show();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = $("task-title").value.trim();
  if (!title) {
    $("task-title").value = "";
    form.classList.add("was-validated");
    return;
  }

  const data = {
    title,
    description: $("task-desc").value.trim(),
    priority: $("task-priority").value,
    dueDate: $("task-date").value,
  };

  const id = $("task-id").value;

  if (id) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, ...data } : t));
  } else {
    tasks.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      ...data,
      completed: false,
    });
  }

  save();
  taskModal.hide();
  render();
  showToast(id ? "Task updated!" : "Task created!");
});

// Focus the title field when the modal finishes opening
$("task-modal").addEventListener("shown.bs.modal", () => $("task-title").focus());

// 8. Click handling for every task card (event delegation:
//    one listener on the list instead of one per button)
function findTask(target) {
  const card = target.closest(".task-card");
  return card ? tasks.find((t) => t.id === card.dataset.id) : null;
}

list.addEventListener("change", (event) => {
  if (event.target.dataset.act !== "toggle") return;

  const task = findTask(event.target);
  if (!task) return;

  task.completed = event.target.checked;
  save();
  render();
  showToast(task.completed ? "Great job! Task completed." : "Task marked as pending.");
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-act]");
  if (!button) return;

  const task = findTask(button);
  if (!task) return;

  if (button.dataset.act === "edit") openForm(task);

  if (button.dataset.act === "delete") {
    deleteId = task.id;
    $("delete-name").textContent = task.title;
    deleteModal.show();
  }
});

$("confirm-delete").addEventListener("click", () => {
  tasks = tasks.filter((t) => t.id !== deleteId);
  deleteId = null;
  save();
  deleteModal.hide();
  render();
  showToast("Task deleted.");
});

// 9. Other controls
$("add-btn").addEventListener("click", () => openForm());

$("search").addEventListener("input", (event) => {
  query = event.target.value.trim().toLowerCase();
  renderTasks();
});

$("filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  filter = button.dataset.filter;

  document.querySelectorAll("#filters .nav-link").forEach((b) => {
    b.classList.toggle("active", b === button);
  });

  renderTasks();
});

// 10. Start
$("today-date").textContent = new Date().toLocaleDateString("en", {
  weekday: "long", month: "long", day: "numeric",
});

render();
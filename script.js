// Fully functional To-Do with LocalStorage, edit, filters, sort, due-highlighting
(() => {
  const STORAGE_KEY = "sanamTasksV1";

  // DOM
  const addForm = document.getElementById("addForm");
  const taskTextInput = document.getElementById("taskText");
  const taskDateInput = document.getElementById("taskDate");
  const taskList = document.getElementById("taskList");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const sortSelect = document.getElementById("sortSelect");
  const clearCompletedBtn = document.getElementById("clearCompleted");
  const clearAllBtn = document.getElementById("clearAll");
  const stats = document.getElementById("stats");

  // state
  let tasks = [];
  let activeFilter = "all"; // all, active, completed, today
  let activeSort = "dateAsc";

  // init
  document.addEventListener("DOMContentLoaded", init);
  function init() {
    load();
    bindEvents();
    render();
  }

  function bindEvents() {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addTask();
    });

    filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    sortSelect.addEventListener("change", (e) => {
      activeSort = e.target.value;
      render();
    });

    clearCompletedBtn.addEventListener("click", () => {
      if (!confirm("Remove all completed tasks?")) return;
      tasks = tasks.filter(t => !t.completed);
      save();
      render();
    });

    clearAllBtn.addEventListener("click", () => {
      if (!confirm("Clear all tasks?")) return;
      tasks = [];
      save();
      render();
    });

    taskList.addEventListener("click", (e) => {
      const el = e.target;
      const li = el.closest("li");
      if (!li) return;
      const id = li.dataset.id;
      if (el.classList.contains("js-toggle")) toggleComplete(id);
      if (el.classList.contains("js-delete")) deleteTask(id);
      if (el.classList.contains("js-edit")) beginEdit(li, id);
      if (el.classList.contains("js-save")) saveEdit(li, id);
      if (el.classList.contains("js-cancel")) cancelEdit(li, id);
    });

    // keyboard: Enter in text adds task, Esc clears inputs
    taskTextInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        taskTextInput.value = "";
        taskDateInput.value = "";
      }
    });
  }

  // storage
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Failed to load tasks:", err);
      tasks = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // util
  function createTaskObj(text, datetime) {
    return {
      id: Date.now().toString() + Math.floor(Math.random() * 999),
      text: text.trim(),
      datetime: datetime || null, // ISO string or null
      completed: false,
      createdAt: new Date().toISOString()
    };
  }

  function formatDate(iso) {
    if (!iso) return "";
    const dt = new Date(iso);
    if (isNaN(dt)) return "";
    // friendly: e.g. "Mon, 2 Jun — 14:30"
    return dt.toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function isDueToday(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  }

  function isDueSoon(iso) {
    if (!iso) return false;
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = d - now;
    // due within next 24 hours (and in future)
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  }

  // actions
  function addTask() {
    const text = taskTextInput.value.trim();
    const dt = taskDateInput.value ? (new Date(taskDateInput.value)).toISOString() : null;
    if (!text) {
      alert("Please enter a task description.");
      taskTextInput.focus();
      return;
    }
    const t = createTaskObj(text, dt);
    tasks.push(t);
    save();
    taskTextInput.value = "";
    taskDateInput.value = "";
    render();
    // focus for fast entry
    taskTextInput.focus();
  }

  function toggleComplete(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    save();
    render();
  }

  function deleteTask(id) {
    if (!confirm("Delete this task?")) return;
    tasks = tasks.filter(x => x.id !== id);
    save();
    render();
  }

  function beginEdit(li, id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    // replace content with inputs
    li.classList.add("editing");
    const content = li.querySelector(".task-content");
    content.innerHTML = `
      <input class="edit-text" value="${escapeHtml(t.text)}" aria-label="Edit task text" />
      <input type="datetime-local" class="edit-date" value="${t.datetime ? toDatetimeLocal(t.datetime) : ""}" />
      <div style="margin-top:8px">
        <button class="icon-btn js-save">Save</button>
        <button class="icon-btn js-cancel">Cancel</button>
      </div>
    `;
    const elText = content.querySelector(".edit-text");
    elText.focus();
    // stop propagation if clicking inside
  }

  function saveEdit(li, id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const content = li.querySelector(".task-content");
    const newText = content.querySelector(".edit-text").value.trim();
    const newDateVal = content.querySelector(".edit-date").value;
    const newDatetime = newDateVal ? new Date(newDateVal).toISOString() : null;

    if (!newText) {
      alert("Task cannot be empty.");
      content.querySelector(".edit-text").focus();
      return;
    }

    t.text = newText;
    t.datetime = newDatetime;
    save();
    render();
  }

  function cancelEdit(li, id) {
    render(); // simply re-render to exit edit mode
  }

  // helpers for date input value <-> iso
  function toDatetimeLocal(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    // produce value for datetime-local: "YYYY-MM-DDTHH:MM"
    const pad = (n) => String(n).padStart(2, "0");
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  }

  // rendering
  function render() {
    // apply filter
    let visible = tasks.slice();

    if (activeFilter === "active") visible = visible.filter(t => !t.completed);
    if (activeFilter === "completed") visible = visible.filter(t => t.completed);
    if (activeFilter === "today") visible = visible.filter(t => isDueToday(t.datetime));

    // sort
    visible.sort((a, b) => {
      switch (activeSort) {
        case "dateAsc":
          return (a.datetime || "") > (b.datetime || "") ? 1 : -1;
        case "dateDesc":
          return (a.datetime || "") < (b.datetime || "") ? 1 : -1;
        case "createdAsc":
        case "createdDesc":
        case "createdAsc":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "createdDesc":
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });

    // when dateAsc and some items have no date, keep them last
    if (activeSort === "dateAsc") {
      visible.sort((a,b) => {
        if (!a.datetime && !b.datetime) return 0;
        if (!a.datetime) return 1;
        if (!b.datetime) return -1;
        return new Date(a.datetime) - new Date(b.datetime);
      });
    }
    if (activeSort === "dateDesc") {
      visible.sort((a,b) => {
        if (!a.datetime && !b.datetime) return 0;
        if (!a.datetime) return 1;
        if (!b.datetime) return -1;
        return new Date(b.datetime) - new Date(a.datetime);
      });
    }

    // render list
    taskList.innerHTML = "";
    if (visible.length === 0) {
      taskList.innerHTML = `<div class="empty">No tasks — add your first one ✨</div>`;
    } else {
      const frag = document.createDocumentFragment();
      visible.forEach(t => {
        const li = document.createElement("li");
        li.className = "task-item";
        li.dataset.id = t.id;
        if (t.completed) li.classList.add("completed");
        const dueSoonCls = (!t.completed && t.datetime && isDueSoon(t.datetime)) ? "due-soon" : "";
        if (dueSoonCls) li.classList.add("due-soon");

        li.innerHTML = `
          <div class="task-left">
            <button class="checkbox js-toggle ${t.completed ? 'checked' : ''}" title="Mark complete" aria-pressed="${t.completed ? 'true' : 'false'}">
              ${t.completed ? "✔" : ""}
            </button>
            <div class="task-content">
              <div class="task-title">${escapeHtml(t.text)}</div>
              <div class="task-meta">${t.datetime ? formatDate(t.datetime) : '<span style="opacity:.6">No due date</span>'}</div>
            </div>
          </div>
          <div class="actions">
            <button class="icon-btn js-edit" title="Edit">✎</button>
            <button class="icon-btn js-delete" title="Delete">🗑</button>
          </div>
        `;

        frag.appendChild(li);
      });
      taskList.appendChild(frag);
    }

    updateStats();
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    stats.textContent = `Total: ${total} • Pending: ${pending} • Done: ${completed}`;
  }

  // HTML escaping to avoid XSS from content inserted into innerHTML
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  window.addEventListener("beforeunload", save);
})();

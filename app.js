(function () {
  const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const DAY_SUBJECTS = {
    Monday: "Embedded C",
    Tuesday: "DSA",
    Wednesday: "Core Electronics",
    Thursday: "Linux",
    Friday: "Revision",
    Saturday: "Projects",
    Sunday: "Deep Study"
  };
  const STORAGE_KEY = "daytoday-state";
  const THEME_STORAGE_KEY = "daytoday-theme";

  const todayLabel = document.getElementById("todaySubject");
  const checklistEl = document.getElementById("checklist");
  const progressMessageEl = document.getElementById("progressMessage");
  const heroProgressSummaryEl = document.getElementById("heroProgressSummary");
  const notesInput = document.getElementById("notesInput");
  const focusInput = document.getElementById("focusInput");
  const resourcesInput = document.getElementById("resourcesInput");
  const weekGrid = document.getElementById("weekGrid");
  const addGoalBtn = document.getElementById("addGoalBtn");
  const completeTodayBtn = document.getElementById("completeTodayBtn");
  const todayCard = document.getElementById("todayCard");
  const todayStatus = document.getElementById("todayStatus");
  const saveStatus = document.getElementById("saveStatus");
  const heroGreetingEl = document.getElementById("heroGreeting");
  const heroProgressPercentEl = document.getElementById("heroProgressPercent");
  const heroProgressRingEl = document.getElementById("heroProgressRing");
  const weeklyProgressRingEl = document.getElementById("weeklyProgressRing");
  const weeklyProgressPercentEl = document.getElementById("weeklyProgressPercent");
  const weeklyProgressValueEl = document.getElementById("weeklyProgressValue");
  const todayProgressValueEl = document.getElementById("todayProgressValue");
  const todayProgressBarEl = document.getElementById("todayProgressBar");
  const todayProgressBarWrapEl = document.getElementById("todayProgressBarWrap");
  const todayProgressEmptyEl = document.getElementById("todayProgressEmpty");
  const todaySummaryValueEl = document.getElementById("todaySummaryValue");
  const todaySummaryMeterEl = document.getElementById("todaySummaryMeter");
  const todaySummaryMeterWrapEl = document.getElementById("todaySummaryMeterWrap");
  const todaySummaryEmptyEl = document.getElementById("todaySummaryEmpty");
  const notesHintEl = document.getElementById("notesHint");
  const resourcesHintEl = document.getElementById("resourcesHint");
  const themeToggleEl = document.getElementById("themeToggle");
  const themeToggleIconEl = themeToggleEl?.querySelector(".theme-toggle__icon");
  const themeToggleLabelEl = themeToggleEl?.querySelector(".theme-toggle__label");

  const state = loadState();
  const todayName = getTodayName();

  function init() {
    applyTheme(getStoredTheme());
    renderTodayView();
    renderWeekView();
    bindEvents();
  }

  function bindEvents() {
    focusInput.addEventListener("input", handleFocusInput);
    checklistEl.addEventListener("change", handleChecklistChange);
    checklistEl.addEventListener("input", handleGoalTextInput);
    checklistEl.addEventListener("click", handleChecklistClick);
    notesInput.addEventListener("input", handleNotesInput);
    resourcesInput.addEventListener("input", handleResourcesInput);
    addGoalBtn.addEventListener("click", addGoal);
    completeTodayBtn.addEventListener("click", finishToday);
    themeToggleEl?.addEventListener("click", toggleTheme);
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { entries: {} };
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Could not parse stored state", error);
      return { entries: {} };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getStoredTheme() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    const resolvedTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
    if (themeToggleIconEl) {
      themeToggleIconEl.textContent = resolvedTheme === "dark" ? "☀" : "🌙";
    }
    if (themeToggleLabelEl) {
      themeToggleLabelEl.textContent = resolvedTheme === "dark" ? "Light" : "Dark";
    }
    if (themeToggleEl) {
      themeToggleEl.setAttribute("aria-label", resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
  }

  function toggleTheme() {
    const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }

  function getTodayName() {
    return WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  }

  function getEntryForToday() {
    const dateKey = getDateKey(new Date());
    if (!state.entries[dateKey]) {
      state.entries[dateKey] = createEntryForDay(todayName);
      saveState();
    }
    return normalizeEntry(state.entries[dateKey], todayName);
  }

  function getEntryForDate(date) {
    const dateKey = getDateKey(date);
    if (!state.entries[dateKey]) {
      const dayName = getDayNameForDate(date);
      state.entries[dateKey] = createEntryForDay(dayName);
      saveState();
    }
    return normalizeEntry(state.entries[dateKey], getDayNameForDate(date));
  }

  function createEntryForDay(dayName) {
    return {
      day: dayName,
      focus: "",
      tasks: [],
      notes: "",
      resources: [],
      completed: false
    };
  }

  function normalizeEntry(entry, dayName) {
    const normalized = entry || createEntryForDay(dayName);
    const tasks = Array.isArray(normalized.tasks)
      ? normalized.tasks.map((task) => ({
          text: typeof task === "string" ? task : task?.text || "",
          done: Boolean(typeof task === "string" ? false : task?.done)
        }))
      : [];
    const resources = Array.isArray(normalized.resources)
      ? normalized.resources.filter(Boolean)
      : typeof normalized.resources === "string"
        ? normalized.resources.split("\n").map((line) => line.trim()).filter(Boolean)
        : [];

    const nextEntry = {
      day: normalized.day || dayName,
      focus: typeof normalized.focus === "string" ? normalized.focus : "",
      tasks,
      notes: typeof normalized.notes === "string" ? normalized.notes : "",
      resources,
      completed: Boolean(normalized.completed)
    };

    if (normalized !== nextEntry) {
      Object.assign(normalized, nextEntry);
    }
    return normalized;
  }

  function getDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function getDayNameForDate(date) {
    return WEEK_DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
  }

  function renderTodayView() {
    const entry = getEntryForToday();
    const subject = DAY_SUBJECTS[entry.day] || "Study";
    todayLabel.textContent = `${entry.day} • ${subject}`;
    todayStatus.textContent = entry.completed ? "Done" : "Today";
    heroGreetingEl.textContent = getGreeting();

    focusInput.value = entry.focus;
    checklistEl.innerHTML = "";

    if (entry.tasks.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.className = "checklist-empty";
      emptyState.textContent = "Nothing planned yet. Add your first task.";
      checklistEl.appendChild(emptyState);
    } else {
      entry.tasks.forEach((task, index) => {
        const item = document.createElement("li");
        item.className = `checklist-item${task.done ? " is-complete" : ""}`;
        item.innerHTML = `
          <input class="goal-toggle" type="checkbox" data-index="${index}" ${task.done ? "checked" : ""} aria-label="Mark task complete" />
          <input class="goal-text" type="text" value="${escapeHtml(task.text)}" data-index="${index}" aria-label="Edit task" />
          <button class="remove-goal" type="button" data-index="${index}" aria-label="Remove task">×</button>
        `;
        checklistEl.appendChild(item);
      });
    }

    notesInput.value = entry.notes;
    notesHintEl.hidden = entry.notes.trim().length > 0;
    resourcesInput.value = entry.resources.join("\n");
    resourcesHintEl.hidden = entry.resources.length > 0;
    updateActionButtons(entry);
    updateProgressMessage(entry);
    updateProgressVisuals(entry);
  }

  function renderWeekView() {
    weekGrid.innerHTML = "";
    const startOfWeek = getStartOfWeek(new Date());

    WEEK_DAYS.forEach((dayName, index) => {
      const dateForDay = new Date(startOfWeek);
      dateForDay.setDate(startOfWeek.getDate() + index);
      const entry = getEntryForDate(dateForDay);
      const isToday = dayName === todayName;
      const card = document.createElement("div");
      const preview = entry.focus.trim() ? entry.focus.trim() : "Your focus";
      const subject = DAY_SUBJECTS[dayName] || "Study";
      const actionLabel = entry.completed ? "Review" : isToday ? "Your focus" : "Open";
      const actionClass = entry.completed ? "day-action--done" : isToday ? "day-action--today" : "day-action--upcoming";
      card.className = `day-card${isToday ? " today" : ""}${entry.completed ? " done" : " upcoming"}`;
      card.innerHTML = `
        <div class="day-meta">
          <div class="day-title">${dayName}</div>
          <div class="day-subject">${subject}</div>
        </div>
        <div class="day-actions">
          <div class="day-state">${entry.completed ? "✓ Done" : isToday ? "Today" : preview}</div>
          <button class="day-action ${actionClass}" type="button">${actionLabel}</button>
        </div>
      `;
      weekGrid.appendChild(card);
    });

    updateProgressVisuals(getEntryForToday());
  }

  function updateActionButtons(entry) {
    if (entry.tasks.length === 0) {
      addGoalBtn.classList.remove("secondary-btn");
      addGoalBtn.classList.add("primary-btn");
      completeTodayBtn.classList.remove("primary-btn");
      completeTodayBtn.classList.add("secondary-btn");
    } else {
      addGoalBtn.classList.remove("primary-btn");
      addGoalBtn.classList.add("secondary-btn");
      completeTodayBtn.classList.remove("secondary-btn");
      completeTodayBtn.classList.add("primary-btn");
    }
  }

  function handleFocusInput(event) {
    const entry = getEntryForToday();
    entry.focus = event.target.value;
    saveState();
    showSaveFeedback();
    renderWeekView();
  }

  function handleChecklistChange(event) {
    if (!event.target.classList.contains("goal-toggle")) {
      return;
    }

    const entry = getEntryForToday();
    const index = Number(event.target.dataset.index);
    entry.tasks[index].done = event.target.checked;
    entry.completed = entry.tasks.length > 0 && entry.tasks.every((task) => task.done);
    saveState();
    showSaveFeedback();
    renderTodayView();
    renderWeekView();
    todayCard.classList.remove("celebrate");
    void todayCard.offsetWidth;
    if (entry.completed) {
      todayCard.classList.add("celebrate");
    }
  }

  function handleGoalTextInput(event) {
    if (!event.target.classList.contains("goal-text")) {
      return;
    }

    const entry = getEntryForToday();
    const index = Number(event.target.dataset.index);
    entry.tasks[index].text = event.target.value;
    saveState();
    showSaveFeedback();
  }

  function handleChecklistClick(event) {
    if (event.target.classList.contains("remove-goal")) {
      const entry = getEntryForToday();
      const index = Number(event.target.dataset.index);
      entry.tasks.splice(index, 1);
      entry.completed = entry.tasks.length > 0 && entry.tasks.every((task) => task.done);
      saveState();
      showSaveFeedback();
      renderTodayView();
      renderWeekView();
    }
  }

  function handleNotesInput(event) {
    const entry = getEntryForToday();
    entry.notes = event.target.value;
    saveState();
    showSaveFeedback();
    notesHintEl.hidden = entry.notes.trim().length > 0;
  }

  function handleResourcesInput(event) {
    const entry = getEntryForToday();
    entry.resources = event.target.value
      .split("\n")
      .map((resource) => resource.trim())
      .filter(Boolean);
    saveState();
    showSaveFeedback();
    resourcesHintEl.hidden = entry.resources.length > 0;
  }

  function addGoal() {
    const entry = getEntryForToday();
    entry.tasks.push({ text: "New task", done: false });
    saveState();
    showSaveFeedback();
    renderTodayView();
    renderWeekView();
  }

  function updateProgressMessage(entry) {
    const doneCount = entry.tasks.filter((task) => task.done).length;
    const total = entry.tasks.length;

    let message = "A calm start is enough.";

    if (total === 0) {
      message = "A calm start is enough.";
    } else if (doneCount === 0) {
      message = "A gentle start is enough.";
    } else if (doneCount < total) {
      message = doneCount === 1 ? "One task is underway." : `${doneCount} of ${total} tasks are done.`;
    } else {
      message = "Everything for today is wrapped up.";
    }

    setProgressMessage(message);
  }

  function updateProgressVisuals(entry) {
    const doneCount = entry.tasks.filter((task) => task.done).length;
    const total = entry.tasks.length;
    const todayPercent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

    const weeklyData = getWeeklyProgress();
    const weeklyPercent = Math.round((weeklyData.completedDays / WEEK_DAYS.length) * 100);

    heroProgressPercentEl.textContent = `${todayPercent}%`;
    todayProgressValueEl.textContent = `${doneCount}/${total}`;
    todayProgressBarEl.style.width = `${todayPercent}%`;
    todaySummaryValueEl.textContent = `${doneCount}/${total} tasks`;
    todaySummaryMeterEl.style.width = `${todayPercent}%`;
    weeklyProgressPercentEl.textContent = `${weeklyPercent}%`;
    weeklyProgressValueEl.textContent = `${weeklyData.completedDays}/${WEEK_DAYS.length} days`;

    const hasTasks = total > 0;
    todayProgressValueEl.hidden = !hasTasks;
    todayProgressBarWrapEl.hidden = !hasTasks;
    todayProgressEmptyEl.hidden = hasTasks;
    todaySummaryValueEl.hidden = !hasTasks;
    todaySummaryMeterWrapEl.hidden = !hasTasks;
    todaySummaryEmptyEl.hidden = hasTasks;

    updateRing(heroProgressRingEl, todayPercent);
    updateRing(weeklyProgressRingEl, weeklyPercent);
  }

  function getWeeklyProgress() {
    const startOfWeek = getStartOfWeek(new Date());
    const completedDays = WEEK_DAYS.reduce((count, dayName, index) => {
      const dateForDay = new Date(startOfWeek);
      dateForDay.setDate(startOfWeek.getDate() + index);
      const entry = getEntryForDate(dateForDay);
      return count + (entry.completed ? 1 : 0);
    }, 0);

    return { completedDays };
  }

  function updateRing(element, percent) {
    if (!element) {
      return;
    }

    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    element.style.strokeDasharray = `${circumference}`;
    element.style.strokeDashoffset = `${offset}`;
  }

  function finishToday() {
    const entry = getEntryForToday();
    entry.tasks = entry.tasks.map((task) => ({ ...task, done: true }));
    entry.completed = true;
    saveState();
    renderTodayView();
    renderWeekView();
    todayCard.classList.remove("celebrate");
    void todayCard.offsetWidth;
    todayCard.classList.add("celebrate");
    setProgressMessage("Everything for today is wrapped up.");
  }

  function setProgressMessage(message) {
    progressMessageEl.textContent = message;
    heroProgressSummaryEl.textContent = message;
    progressMessageEl.classList.remove("is-updating");
    void progressMessageEl.offsetWidth;
    progressMessageEl.classList.add("is-updating");
  }

  function showSaveFeedback() {
    saveStatus.textContent = "Saved ✓";
    saveStatus.classList.add("is-saving");
    clearTimeout(showSaveFeedback.timeoutId);
    showSaveFeedback.timeoutId = window.setTimeout(() => {
      saveStatus.classList.remove("is-saving");
      saveStatus.textContent = "Saved locally";
    }, 700);
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    }
    if (hour < 18) {
      return "Good afternoon";
    }
    return "Good evening";
  }

  function getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  init();
})();

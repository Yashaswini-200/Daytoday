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
  const STORAGE_BACKUP_KEY = "daytoday-state-malformed-backup";
  const THEME_STORAGE_KEY = "daytoday-theme";
  const HABIT_DEFAULTS = window.DAYTODAY_DEFAULTS;

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
  let selectedDate = new Date();
  let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  let lastLocalDate = getDateKey(new Date());

  function init() {
    applyTheme(getStoredTheme());
    bindEvents();
    bindHabitDashboardEvents();
    renderHabitDashboard();
    updateCurrentDateTime();
    window.setInterval(updateCurrentDateTime, 1000);
  }

  function bindEvents() {
    themeToggleEl?.addEventListener("click", toggleTheme);
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        Object.assign(state, loadState());
        renderHabitDashboard();
      }
    });
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }

    try {
      const stored = JSON.parse(raw);
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
        throw new Error("Stored state must be an object");
      }
      return {
        ...stored,
        entries: stored.entries && typeof stored.entries === "object" && !Array.isArray(stored.entries) ? stored.entries : {},
        habitDays: stored.habitDays && typeof stored.habitDays === "object" && !Array.isArray(stored.habitDays) ? stored.habitDays : {},
        junkFood: Array.isArray(stored.junkFood) ? stored.junkFood : [],
        spending: Array.isArray(stored.spending) ? stored.spending : [],
        habitDefinitions: Array.isArray(stored.habitDefinitions)
          ? normalizeHabitDefinitions(stored.habitDefinitions)
          : cloneDefaultHabits(),
        settings: {
          ...(stored.settings && typeof stored.settings === "object" ? stored.settings : {}),
          junkFoodAllowance: Number.isInteger(stored.settings?.junkFoodAllowance) && stored.settings.junkFoodAllowance >= 0
            ? stored.settings.junkFoodAllowance
            : HABIT_DEFAULTS.junkFoodAllowance
        }
      };
    } catch (error) {
      console.warn("Could not parse stored state", error);
      try {
        if (!localStorage.getItem(STORAGE_BACKUP_KEY)) {
          localStorage.setItem(STORAGE_BACKUP_KEY, raw);
        }
      } catch (backupError) {
        console.warn("Could not preserve malformed stored state", backupError);
      }
      return createInitialState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function createInitialState() {
    return {
      entries: {},
      habitDays: {},
      junkFood: [],
      spending: [],
      habitDefinitions: cloneDefaultHabits(),
      settings: { junkFoodAllowance: HABIT_DEFAULTS.junkFoodAllowance }
    };
  }

  function cloneDefaultHabits() {
    return HABIT_DEFAULTS.habits.map((habit, order) => normalizeHabitDefinition({ ...habit, scoring: { ...habit.scoring }, order }));
  }

  function normalizeHabitDefinitions(definitions) {
    const usedIds = new Set();
    return definitions.map((definition, index) => {
      const normalized = normalizeHabitDefinition({ ...definition, order: Number.isInteger(definition?.order) ? definition.order : index });
      if (!normalized || usedIds.has(normalized.id)) {
        return null;
      }
      usedIds.add(normalized.id);
      return normalized;
    }).filter(Boolean).sort((a, b) => a.order - b.order).map((habit, order) => ({ ...habit, order }));
  }

  function normalizeHabitDefinition(definition) {
    if (!definition || typeof definition !== "object" ||
        typeof definition.id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,59}$/i.test(definition.id) ||
        typeof definition.name !== "string" || !definition.name.trim()) {
      return null;
    }
    const targetType = ["yes-no", "quantity", "duration", "custom"].includes(definition.targetType)
      ? definition.targetType : "custom";
    return {
      id: definition.id.trim(),
      name: definition.name.trim().slice(0, 80),
      description: typeof definition.description === "string" ? definition.description.trim().slice(0, 180) : "",
      category: typeof definition.category === "string" && definition.category.trim() ? definition.category.trim().slice(0, 40) : "Personal",
      target: typeof definition.target === "string" || typeof definition.target === "number" ? definition.target : "",
      targetType,
      unit: typeof definition.unit === "string" ? definition.unit.trim().slice(0, 24) : "",
      scoring: { rule: "binary", completion: 1 },
      active: definition.active !== false,
      order: Number.isInteger(definition.order) && definition.order >= 0 ? definition.order : 0,
      note: definition.note === true
    };
  }

  function getAllHabits() {
    return state.habitDefinitions;
  }

  function getActiveHabits() {
    return getAllHabits().filter((habit) => habit.active).sort((a, b) => a.order - b.order);
  }

  function scoreHabitRecord(record) {
    return record.completed === true ? 1 : 0;
  }

  function getHabitSnapshot(habit) {
    return {
      name: habit.name,
      description: habit.description,
      category: habit.category,
      target: habit.target,
      targetType: habit.targetType,
      unit: habit.unit,
      scoring: { ...habit.scoring }
    };
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

  function getEntryForToday() {
    const today = new Date();
    const dateKey = getDateKey(today);
    const dayName = getDayNameForDate(today);
    if (!state.entries[dateKey]) {
      state.entries[dateKey] = createEntryForDay(dayName);
      saveState();
    }
    return normalizeEntry(state.entries[dateKey], dayName);
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
      const isToday = getDateKey(dateForDay) === getDateKey(new Date());
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
      const entry = state.entries[getDateKey(dateForDay)];
      return count + (Boolean(entry && entry.completed) ? 1 : 0);
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

  const habitListEl = document.getElementById("habitList");
  const calendarEl = document.getElementById("monthCalendar");
  const junkFoodFormEl = document.getElementById("junkFoodForm");

  function bindHabitDashboardEvents() {
    document.getElementById("previousMonth").addEventListener("click", () => moveMonth(-1));
    document.getElementById("nextMonth").addEventListener("click", () => moveMonth(1));
    document.getElementById("goToToday").addEventListener("click", () => setSelectedDate(new Date()));
    calendarEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-calendar-date]");
      if (button) {
        const habitId = button.dataset.habitId;
        const currentStatus = habitId ? getHabitRecord(button.dataset.calendarDate, habitId).completed : undefined;
        setSelectedDate(parseDateKey(button.dataset.calendarDate));
        document.getElementById("selectedDatePanel").open = true;
        if (habitId) {
          const nextStatus = typeof currentStatus !== "boolean" ? true : currentStatus ? false : undefined;
          updateHabitRecord(habitId, "completed", nextStatus);
          renderHabitDashboard();
        }
      }
    });
    habitListEl.addEventListener("change", handleHabitChange);
    habitListEl.addEventListener("input", handleHabitInput);
    junkFoodFormEl.addEventListener("submit", handleJunkFoodSubmit);
    document.getElementById("junkFoodList").addEventListener("click", handleJunkFoodListClick);
    document.getElementById("habitDefinitionForm").addEventListener("submit", handleHabitDefinitionSubmit);
    document.getElementById("cancelHabitEdit").addEventListener("click", resetHabitDefinitionForm);
    document.getElementById("habitDefinitionList").addEventListener("click", handleHabitDefinitionAction);
  }

  function updateCurrentDateTime() {
    const now = new Date();
    const currentDateKey = getDateKey(now);
    if (currentDateKey !== lastLocalDate) {
      const selectionWasToday = getDateKey(selectedDate) === lastLocalDate;
      lastLocalDate = currentDateKey;
      if (selectionWasToday) {
        selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        renderHabitDashboard();
      }
    }
    document.getElementById("currentDateLabel").textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    document.getElementById("currentClock").textContent = now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function moveMonth(offset) {
    const targetMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    const maxDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    setSelectedDate(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(selectedDate.getDate(), maxDay)));
  }

  function setSelectedDate(date) {
    selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderHabitDashboard();
  }

  function dateKeyForMonth(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function getHabitRecord(dateKey, habitId) {
    const day = state.habitDays[dateKey];
    const record = day && day[habitId];
    return record && typeof record === "object" ? record : {};
  }

  function hasHabitProgress(dateKey) {
    return getActiveHabits().some((habit) => {
      const record = getHabitRecord(dateKey, habit.id);
      return typeof record.completed === "boolean";
    });
  }

  function getDayScore(dateKey) {
    return getActiveHabits().reduce((score, habit) => score + scoreHabitRecord(getHabitRecord(dateKey, habit.id)), 0);
  }

  function getDayStats(dateKey) {
    const habits = getActiveHabits();
    const records = habits.map((habit) => getHabitRecord(dateKey, habit.id));
    const completed = records.filter((record) => record.completed === true).length;
    const tracked = records.filter((record) => typeof record.completed === "boolean").length;
    return {
      completed,
      score: completed,
      maxPoints: habits.length,
      habitCount: habits.length,
      tracked: tracked > 0
    };
  }

  function renderHabitDashboard() {
    renderMonthHeading();
    renderCalendar();
    renderHabitList();
    renderMonthSummary();
    renderJunkFood();
    renderHabitDefinitions();
  }

  function renderHabitDefinitions() {
    const list = document.getElementById("habitDefinitionList");
    const definitions = getAllHabits().slice().sort((a, b) => a.order - b.order);
    list.innerHTML = definitions.length ? definitions.map((habit, index) => `<li class="${habit.active ? "" : "is-inactive"}">
      <span><strong>${escapeHtml(habit.name)}</strong><small>${escapeHtml(habit.category)} · ${escapeHtml(habit.targetType)} · ${habit.active ? "Active" : "Inactive"}</small></span>
      <span class="definition-actions">
        <button type="button" data-definition-action="up" data-definition-id="${escapeHtml(habit.id)}" ${index === 0 ? "disabled" : ""} aria-label="Move ${escapeHtml(habit.name)} up">↑</button>
        <button type="button" data-definition-action="down" data-definition-id="${escapeHtml(habit.id)}" ${index === definitions.length - 1 ? "disabled" : ""} aria-label="Move ${escapeHtml(habit.name)} down">↓</button>
        <button type="button" data-definition-action="edit" data-definition-id="${escapeHtml(habit.id)}">Edit</button>
        <button type="button" data-definition-action="toggle" data-definition-id="${escapeHtml(habit.id)}">${habit.active ? "Deactivate" : "Reactivate"}</button>
      </span>
    </li>`).join("") : '<li class="empty-record">No habits configured yet. Add your first habit.</li>';
  }

  function handleHabitDefinitionSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = document.getElementById("definitionName").value.trim();
    const target = document.getElementById("definitionTarget").value.trim();
    const targetType = document.getElementById("definitionTargetType").value;
    if (!name) {
      form.reportValidity();
      return;
    }
    if ((targetType === "quantity" || targetType === "duration") && target !== "" &&
        (!Number.isFinite(Number(target)) || Number(target) < 0)) {
      document.getElementById("definitionTarget").setCustomValidity("Enter a non-negative target amount.");
      document.getElementById("definitionTarget").reportValidity();
      document.getElementById("definitionTarget").setCustomValidity("");
      return;
    }
    const idField = document.getElementById("definitionId");
    const id = idField.value || createHabitId(name);
    const current = getAllHabits().find((habit) => habit.id === id);
    const definition = normalizeHabitDefinition({
      id,
      name,
      description: document.getElementById("definitionDescription").value,
      category: document.getElementById("definitionCategory").value,
      target,
      targetType,
      unit: document.getElementById("definitionUnit").value,
      scoring: { rule: "binary", completion: 1 },
      active: current ? current.active : true,
      order: current ? current.order : getAllHabits().length,
      note: current ? current.note : false
    });
    if (!definition) {
      document.getElementById("definitionName").setCustomValidity("Enter a valid name and supported scoring values.");
      document.getElementById("definitionName").reportValidity();
      document.getElementById("definitionName").setCustomValidity("");
      return;
    }
    if (current) {
      state.habitDefinitions = getAllHabits().map((habit) => habit.id === id ? definition : habit);
    } else {
      state.habitDefinitions.push(definition);
    }
    saveState();
    showSaveFeedback();
    resetHabitDefinitionForm();
    renderHabitDashboard();
  }

  function createHabitId(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "habit";
    let id = base;
    let suffix = 2;
    while (getAllHabits().some((habit) => habit.id === id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    return id;
  }

  function resetHabitDefinitionForm() {
    const form = document.getElementById("habitDefinitionForm");
    form.reset();
    document.getElementById("definitionId").value = "";
    document.getElementById("habitFormHeading").textContent = "Add a habit";
    document.getElementById("cancelHabitEdit").hidden = true;
  }

  function handleHabitDefinitionAction(event) {
    const button = event.target.closest("[data-definition-action]");
    if (!button) {
      return;
    }
    const habit = getAllHabits().find((item) => item.id === button.dataset.definitionId);
    if (!habit) {
      return;
    }
    const action = button.dataset.definitionAction;
    if (action === "edit") {
      document.getElementById("definitionId").value = habit.id;
      document.getElementById("definitionName").value = habit.name;
      document.getElementById("definitionDescription").value = habit.description;
      document.getElementById("definitionCategory").value = habit.category;
      document.getElementById("definitionTargetType").value = habit.targetType;
      document.getElementById("definitionTarget").value = habit.target;
      document.getElementById("definitionUnit").value = habit.unit;
      document.getElementById("habitFormHeading").textContent = `Edit ${habit.name}`;
      document.getElementById("cancelHabitEdit").hidden = false;
      document.getElementById("habitDefinitionForm").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (action === "toggle") {
      state.habitDefinitions = getAllHabits().map((item) => item.id === habit.id ? { ...item, active: !item.active } : item);
    } else {
      const ordered = getAllHabits().slice().sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((item) => item.id === habit.id);
      const swapIndex = action === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= ordered.length) {
        return;
      }
      [ordered[index].order, ordered[swapIndex].order] = [ordered[swapIndex].order, ordered[index].order];
      state.habitDefinitions = ordered;
    }
    saveState();
    showSaveFeedback();
    renderHabitDashboard();
  }

  function renderMonthHeading() {
    document.getElementById("monthTitle").textContent = visibleMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  }

  function renderCalendar() {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = getDateKey(new Date());
    const selectedKey = getDateKey(selectedDate);
    const habits = getActiveHabits();
    const dates = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1);
      return { date, key: getDateKey(date) };
    });
    const heading = dates.map(({ date, key }) => {
      const classes = [
        "grid-date",
        key === todayKey ? "is-today" : "",
        key === selectedKey ? "is-selected" : ""
      ].filter(Boolean).join(" ");
      return `<th scope="col"><button type="button" class="${classes}" data-calendar-date="${key}" aria-pressed="${key === selectedKey}" aria-label="${escapeHtml(date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}">
        <span>${date.toLocaleDateString(undefined, { weekday: "short" })}</span><strong>${date.getDate()}</strong>
      </button></th>`;
    }).join("");
    const habitRows = habits.map((habit) => {
      const monthPoints = dates.reduce((sum, { key }) => {
        const record = getHabitRecord(key, habit.id);
        return sum + scoreHabitRecord(record);
      }, 0);
      const cells = dates.map(({ date, key }) => {
        const record = getHabitRecord(key, habit.id);
        const status = record.completed === true ? "is-complete" : record.completed === false ? "is-not-completed" : "is-untracked";
        const icon = record.completed === true ? "✓" : record.completed === false ? "×" : "·";
        const dayLabel = date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
        const statusLabel = record.completed === true ? "Completed" : record.completed === false ? "Not completed" : "Not recorded";
        return `<td class="grid-entry ${status}${key === selectedKey ? " is-selected" : ""}">
          <button type="button" class="grid-cell-toggle" data-calendar-date="${key}" data-habit-id="${escapeHtml(habit.id)}" aria-pressed="${record.completed === true}" aria-label="${escapeHtml(habit.name)}, ${escapeHtml(dayLabel)}: ${statusLabel}. Click to change status">${icon}</button>
        </td>`;
      }).join("");
      return `<tr>
        <th scope="row" class="grid-habit-name"><span>${escapeHtml(habit.name)}</span><small>${monthPoints} pts this month</small></th>
        ${cells}
        <td class="grid-month-total">${monthPoints}</td>
      </tr>`;
    }).join("");
    const dailyTotals = dates.map(({ key }) => {
      const stats = getDayStats(key);
      return `<td class="grid-day-total${key === selectedKey ? " is-selected" : ""}">${stats.score}<small>/${stats.maxPoints}</small></td>`;
    }).join("");
    calendarEl.innerHTML = `<thead><tr><th scope="col" class="grid-corner">Habit · month total</th>${heading}<th scope="col" class="grid-total-heading">Month</th></tr></thead>
      <tbody>${habitRows}
        <tr class="grid-summary-row"><th scope="row" class="grid-habit-name">Daily points <small>earned per date</small></th>${dailyTotals}<td class="grid-month-total">${dates.reduce((sum, { key }) => sum + getDayStats(key).score, 0)}</td></tr>
      </tbody>`;
    document.getElementById("calendarCaption").textContent = `${daysInMonth} days · Click a habit cell to cycle through not recorded, completed, and not completed.`;
  }

  function renderHabitList() {
    const dateKey = getDateKey(selectedDate);
    const todayKey = getDateKey(new Date());
    const habits = getActiveHabits();
    document.getElementById("selectedDateTitle").textContent = selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    const dayStatus = document.getElementById("selectedDateStatus");
    dayStatus.textContent = dateKey === todayKey ? "Today" : hasHabitProgress(dateKey) ? "Tracked" : "Not tracked";
    habitListEl.innerHTML = habits.length ? habits.map((habit, index) => {
      const record = getHabitRecord(dateKey, habit.id);
      const snapshot = record.scoringLocked && record.definitionSnapshot ? record.definitionSnapshot : habit;
      const target = record.target !== undefined ? record.target : habit.target;
      const note = typeof record.note === "string" ? record.note : "";
      const progress = typeof record.progress === "string" || typeof record.progress === "number" ? record.progress : "";
      const targetInput = habit.targetType === "quantity" || habit.targetType === "duration"
        ? `<input type="number" min="0" step="any" inputmode="decimal" maxlength="120" data-habit-id="${escapeHtml(habit.id)}" data-habit-field="target" value="${escapeHtml(target)}" aria-label="${escapeHtml(habit.name)} target" />`
        : `<input type="text" maxlength="120" data-habit-id="${escapeHtml(habit.id)}" data-habit-field="target" value="${escapeHtml(target)}" aria-label="${escapeHtml(habit.name)} target" />`;
      const progressLabel = habit.unit ? `Progress (${habit.unit})` : habit.targetType === "duration" ? "Progress (duration)" : "Progress today";
      const status = record.completed === true ? "completed" : record.completed === false ? "not-completed" : "not-recorded";
      return `<article class="habit-row${record.completed === true ? " is-complete" : record.completed === false ? " is-not-completed" : ""}">
        <div class="habit-copy">
          <span class="habit-index">${String(index + 1).padStart(2, "0")}</span>
          <div><h3>${escapeHtml(snapshot.name)}</h3><p>${escapeHtml(snapshot.description)}</p><span class="habit-category">${escapeHtml(snapshot.category)}</span></div>
        </div>
        <label class="habit-status-field">Status
          <select data-habit-id="${escapeHtml(habit.id)}" data-habit-field="status" aria-label="${escapeHtml(habit.name)} status">
            <option value="not-recorded" ${status === "not-recorded" ? "selected" : ""}>Not recorded</option>
            <option value="completed" ${status === "completed" ? "selected" : ""}>Completed · 1 point</option>
            <option value="not-completed" ${status === "not-completed" ? "selected" : ""}>Not completed · 0 points</option>
          </select>
        </label>
        <label class="habit-target">Target for this date
          ${targetInput}
        </label>
        ${habit.targetType === "quantity" || habit.targetType === "duration" ? `<label class="habit-progress-input">${escapeHtml(progressLabel)}
          <input type="number" min="0" step="any" inputmode="decimal" data-habit-id="${escapeHtml(habit.id)}" data-habit-field="progress" value="${escapeHtml(progress)}" placeholder="0" aria-label="${escapeHtml(habit.name)} progress" />
        </label>` : ""}
        ${habit.note ? `<label class="habit-note">Optional note
          <input type="text" maxlength="160" data-habit-id="${escapeHtml(habit.id)}" data-habit-field="note" value="${escapeHtml(note)}" placeholder="A brief note about today" />
        </label>` : ""}
      </article>`;
    }).join("") : '<p class="empty-record">No active habits. Add or reactivate one in Manage habits.</p>';
    document.getElementById("dailyScore").textContent = `${getDayScore(dateKey)} / ${getDayStats(dateKey).maxPoints}`;
  }

  function updateHabitRecord(habitId, field, value) {
    const dateKey = getDateKey(selectedDate);
    if (!state.habitDays[dateKey] || typeof state.habitDays[dateKey] !== "object") {
      state.habitDays[dateKey] = {};
    }
    const isNewRecord = !state.habitDays[dateKey][habitId] || typeof state.habitDays[dateKey][habitId] !== "object";
    if (isNewRecord) {
      const definition = getAllHabits().find((habit) => habit.id === habitId);
      if (!definition) {
        return;
      }
      state.habitDays[dateKey][habitId] = {
        scoringSnapshot: { ...definition.scoring },
        targetSnapshot: definition.target,
        points: 0
      };
    }
    const record = state.habitDays[dateKey][habitId];
    const definition = getAllHabits().find((habit) => habit.id === habitId);
    if (!definition) {
      return;
    }
    if (field === "completed" && value !== undefined && !record.scoringLocked) {
      record.scoringSnapshot = { ...definition.scoring };
      record.definitionSnapshot = getHabitSnapshot(definition);
      record.scoringLocked = true;
    } else if (!record.scoringSnapshot) {
      record.scoringSnapshot = { ...definition.scoring };
    }
    if (field === "completed" && value === undefined) {
      delete record.completed;
    } else {
      record[field] = value;
    }
    if (field === "target" && typeof record.completed !== "boolean") {
      record.targetSnapshot = value;
      record.definitionSnapshot = { ...getHabitSnapshot(definition), target: value };
    }
    if (field === "completed") {
      if (value === undefined) {
        delete record.points;
      } else {
        record.points = scoreHabitRecord(record);
      }
    }
    saveState();
    showSaveFeedback();
  }

  function handleHabitChange(event) {
    const input = event.target;
    if (!input.dataset.habitId || !["completed", "status", "progress"].includes(input.dataset.habitField)) {
      return;
    }
    let value = input.dataset.habitField === "status"
      ? input.value === "completed" ? true : input.value === "not-completed" ? false : undefined
      : input.type === "checkbox" ? input.checked : input.value;
    if (input.dataset.habitField === "progress" && value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      input.setCustomValidity("Enter a non-negative amount.");
      input.reportValidity();
      input.setCustomValidity("");
      input.value = "";
      value = "";
    }
    const field = input.dataset.habitField === "status" ? "completed" : input.dataset.habitField;
    updateHabitRecord(input.dataset.habitId, field, value);
    if (field === "progress" && value !== "") {
      const habit = getAllHabits().find((item) => item.id === input.dataset.habitId);
      const record = getHabitRecord(getDateKey(selectedDate), input.dataset.habitId);
      const target = record.target !== undefined ? record.target : habit?.target;
      if (target !== "" && Number.isFinite(Number(target)) && Number(value) >= Number(target)) {
        updateHabitRecord(input.dataset.habitId, "completed", true);
      }
    }
    renderHabitDashboard();
  }

  function handleHabitInput(event) {
    const input = event.target;
    if (!input.dataset.habitId || !["target", "note", "progress"].includes(input.dataset.habitField)) {
      return;
    }
    if ((input.dataset.habitField === "progress" || input.dataset.habitField === "target") &&
        input.type === "number" && input.value !== "" && (!Number.isFinite(Number(input.value)) || Number(input.value) < 0)) {
      return;
    }
    updateHabitRecord(input.dataset.habitId, input.dataset.habitField, input.value);
    if (input.dataset.habitField === "progress") {
      renderMonthSummary();
    }
  }

  function renderMonthSummary() {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    const throughDay = isCurrentMonth ? today.getDate() : (visibleMonth > today ? 0 : lastDay);
    let trackedDays = 0;
    let earned = 0;
    let completedHabits = 0;
    let earnedMax = 0;
    let completedHabitOpportunities = 0;
    for (let day = 1; day <= throughDay; day += 1) {
      const dateKey = getDateKey(new Date(year, month, day));
      const stats = getDayStats(dateKey);
      if (stats.tracked) {
        trackedDays += 1;
        earned += stats.score;
        completedHabits += stats.completed;
        earnedMax += stats.maxPoints;
        completedHabitOpportunities += stats.habitCount;
      }
    }
    const maximum = trackedDays ? earnedMax : 0;
    const habitOpportunities = trackedDays ? completedHabitOpportunities : 0;
    const completionRate = habitOpportunities ? Math.round(completedHabits / habitOpportunities * 100) : 0;
    const selectedStats = getDayStats(getDateKey(selectedDate));
    document.getElementById("monthPoints").textContent = `${earned}`;
    document.getElementById("monthPointsMaximum").textContent = `${maximum} max on ${trackedDays} tracked ${trackedDays === 1 ? "day" : "days"}`;
    document.getElementById("monthCompletionRate").textContent = `${completionRate}%`;
    document.getElementById("monthTrackedDays").textContent = `${trackedDays} recorded ${trackedDays === 1 ? "day" : "days"} · untracked days excluded`;
    document.getElementById("selectedDayPoints").textContent = `${selectedStats.score} / ${selectedStats.maxPoints}`;
    document.getElementById("selectedDayRate").textContent = `${selectedStats.completed} / ${selectedStats.habitCount} habits complete · ${selectedStats.habitCount ? Math.round(selectedStats.completed / selectedStats.habitCount * 100) : 0}%`;
    const currentStats = getDayStats(getDateKey(new Date()));
    document.getElementById("currentDayPoints").textContent = `${currentStats.score} / ${currentStats.maxPoints}`;
    document.getElementById("currentDayRate").textContent = `${currentStats.completed} / ${currentStats.habitCount} habits complete · ${currentStats.habitCount ? Math.round(currentStats.completed / currentStats.habitCount * 100) : 0}%`;
  }

  function renderJunkFood() {
    const monthKey = dateKeyForMonth(visibleMonth);
    const records = state.junkFood
      .filter((record) => record && typeof record.id === "string" && isValidDateKey(record.date) && record.date.startsWith(`${monthKey}-`))
      .sort((a, b) => a.date.localeCompare(b.date));
    const count = records.length;
    const allowance = HABIT_DEFAULTS.junkFoodAllowance;
    document.getElementById("junkFoodCount").textContent = `${count} / ${allowance}`;
    document.getElementById("junkFoodCount").classList.toggle("is-over-limit", count > allowance);
    const remaining = allowance - count;
    document.getElementById("junkFoodRemaining").textContent = remaining >= 0
      ? `${remaining} ${remaining === 1 ? "occasion" : "occasions"} remaining`
      : `Allowance exceeded by ${Math.abs(remaining)} ${Math.abs(remaining) === 1 ? "occasion" : "occasions"}`;
    const list = document.getElementById("junkFoodList");
    list.innerHTML = records.length ? records.map((record) => `<li>
      <span><strong>${escapeHtml(formatDate(parseDateKey(record.date)))}</strong>${record.note ? `<small>${escapeHtml(record.note)}</small>` : ""}</span>
      <button type="button" class="record-delete" data-junk-id="${escapeHtml(record.id || "")}" aria-label="Delete junk-food occasion">Remove</button>
    </li>`).join("") : '<li class="empty-record">No occasions recorded for this month.</li>';
    document.getElementById("junkFoodDate").value = getDateKey(selectedDate);
  }

  function handleJunkFoodSubmit(event) {
    event.preventDefault();
    const date = document.getElementById("junkFoodDate").value;
    const note = document.getElementById("junkFoodNote").value.trim();
    if (!isValidDateKey(date) || !date.startsWith(`${dateKeyForMonth(visibleMonth)}-`)) {
      document.getElementById("junkFoodDate").setCustomValidity("Choose a date in the displayed month.");
      document.getElementById("junkFoodDate").reportValidity();
      document.getElementById("junkFoodDate").setCustomValidity("");
      return;
    }
    state.junkFood.push({ id: createRecordId(), date, note });
    saveState();
    showSaveFeedback();
    document.getElementById("junkFoodNote").value = "";
    renderJunkFood();
  }

  function handleJunkFoodListClick(event) {
    const button = event.target.closest("[data-junk-id]");
    if (!button) {
      return;
    }
    state.junkFood = state.junkFood.filter((record) => record?.id !== button.dataset.junkId);
    saveState();
    showSaveFeedback();
    renderJunkFood();
  }

  function formatDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function isValidDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = parseDateKey(value);
    return getDateKey(date) === value;
  }

  function createRecordId() {
    return window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  init();
})();

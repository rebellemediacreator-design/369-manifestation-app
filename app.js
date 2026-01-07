// app.js
(() => {
  const STORAGE_KEY = "ritual369_v1";

  const $ = (sel) => document.querySelector(sel);
  const tpl = $("#goalCardTemplate");

  const els = {
    goalsForm: $("#goalsForm"),
    goal1: $("#goal1"),
    goal2: $("#goal2"),
    goal3: $("#goal3"),
    startDate: $("#startDate"),
    duration: $("#duration"),
    caseSensitive: $("#caseSensitive"),
    strictPunctuation: $("#strictPunctuation"),

    noGoalsBanner: $("#noGoalsBanner"),

    todayDateLabel: $("#todayDateLabel"),
    dayIndexLabel: $("#dayIndexLabel"),
    streakValue: $("#streakValue"),
    doneCountValue: $("#doneCountValue"),
    totalDaysValue: $("#totalDaysValue"),

    btnPrevDay: $("#btnPrevDay"),
    btnNextDay: $("#btnNextDay"),

    morningGoals: $("#morningGoals"),
    noonGoals: $("#noonGoals"),
    eveningGoals: $("#eveningGoals"),

    badgeMorning: $("#badgeMorning"),
    badgeNoon: $("#badgeNoon"),
    badgeEvening: $("#badgeEvening"),

    loudCount: $("#loudCount"),
    btnLoudMinus: $("#btnLoudMinus"),
    btnLoudPlus: $("#btnLoudPlus"),
    btnMarkEveningDone: $("#btnMarkEveningDone"),

    progressGrid: $("#progressGrid"),
    btnPrint: $("#btnPrint"),

    btnExport: $("#btnExport"),
    fileImport: $("#fileImport"),
    btnReset: $("#btnReset"),
  };

  const nowLocalDate = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  };

  const isoDate = (d) => {
    const x = new Date(d);
    x.setHours(0,0,0,0);
    return x.toISOString().slice(0,10);
  };

  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    x.setHours(0,0,0,0);
    return x;
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const normalizeText = (s, opts) => {
    let t = (s ?? "").trim();
    t = t.replace(/\s+/g, " ");

    if (!opts.strictPunctuation) {
      t = t.replace(/[.,;:!?'"„“”()\-–—]/g, "");
      t = t.replace(/\s+/g, " ").trim();
    }
    if (!opts.caseSensitive) t = t.toLowerCase();
    return t;
  };

  const defaultState = () => ({
    version: 1,
    settings: {
      startDate: isoDate(nowLocalDate()),
      duration: 30,
      caseSensitive: false,
      strictPunctuation: true,
    },
    goals: [],
    days: {}, // YYYY-MM-DD -> entry
  });

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...parsed,
        settings: { ...defaultState().settings, ...(parsed.settings || {}) },
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
      };
    } catch {
      return defaultState();
    }
  };

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const ensureDayEntry = (dateKey) => {
    if (!state.days[dateKey]) {
      state.days[dateKey] = {
        morning: { counts: [] },
        noon: { counts: [] },
        evening: { counts: [] },
        loudRead: 0,
      };
    }
    const entry = state.days[dateKey];

    const ensureCounts = (obj) => {
      if (!obj.counts || !Array.isArray(obj.counts)) obj.counts = [];
      while (obj.counts.length < state.goals.length) obj.counts.push(0);
      if (obj.counts.length > state.goals.length) obj.counts = obj.counts.slice(0, state.goals.length);
    };

    ensureCounts(entry.morning);
    ensureCounts(entry.noon);
    ensureCounts(entry.evening);

    if (typeof entry.loudRead !== "number") entry.loudRead = 0;
    entry.loudRead = clamp(entry.loudRead, 0, 9);

    return entry;
  };

  const getTargets = (session) => {
    if (session === "morning") return 3;
    if (session === "noon") return 6;
    return 9;
  };

  const isSessionDone = (dayEntry, session) => {
    const target = getTargets(session);
    const counts = dayEntry[session].counts;
    return counts.every((c) => c >= target);
  };

  const isEveningDone = (dayEntry) => {
    const writingDone = isSessionDone(dayEntry, "evening");
    const loudDone = (dayEntry.loudRead || 0) >= 9;
    return writingDone && loudDone;
  };

  const dayCompletion = (dayEntry) => {
    const m = isSessionDone(dayEntry, "morning");
    const n = isSessionDone(dayEntry, "noon");
    const e = isEveningDone(dayEntry);
    const all = m && n && e;

    const any = m || n || e || (dayEntry.loudRead || 0) > 0 ||
      dayEntry.morning.counts.some(x=>x>0) ||
      dayEntry.noon.counts.some(x=>x>0) ||
      dayEntry.evening.counts.some(x=>x>0);

    return { m, n, e, all, any };
  };

  const withinProgram = (dateKey) => {
    const start = new Date(state.settings.startDate);
    start.setHours(0,0,0,0);
    const end = addDays(start, Number(state.settings.duration) - 1);
    const d = new Date(dateKey);
    d.setHours(0,0,0,0);
    return d >= start && d <= end;
  };

  const computeStreak = () => {
    if (!state.goals.length) return 0;

    const start = new Date(state.settings.startDate);
    start.setHours(0,0,0,0);
    const dur = Number(state.settings.duration);
    const today = nowLocalDate();

    const lastDay = addDays(start, dur - 1);
    const upto = today < lastDay ? today : lastDay;

    let streak = 0;
    for (let d = upto; d >= start; d = addDays(d, -1)) {
      const key = isoDate(d);
      const entry = ensureDayEntry(key);
      if (dayCompletion(entry).all) streak++;
      else break;
    }
    return streak;
  };

  const computeDoneCount = () => {
    const start = new Date(state.settings.startDate);
    start.setHours(0,0,0,0);
    const dur = Number(state.settings.duration);
    let done = 0;
    for (let i=0; i<dur; i++) {
      const key = isoDate(addDays(start, i));
      const entry = ensureDayEntry(key);
      if (dayCompletion(entry).all) done++;
    }
    return done;
  };

  const formatDateLabel = (d) => {
    const opts = { weekday:"long", year:"numeric", month:"long", day:"numeric" };
    try { return d.toLocaleDateString("de-DE", opts); }
    catch { return isoDate(d); }
  };

  const setBadge = (el, done, partial) => {
    el.classList.remove("ok","warn");
    if (done) {
      el.textContent = "fertig";
      el.classList.add("ok");
    } else if (partial) {
      el.textContent = "läuft";
      el.classList.add("warn");
    } else {
      el.textContent = "offen";
    }
  };

  const renderBadges = (dateKey) => {
    if (!state.goals.length) {
      setBadge(els.badgeMorning, false, false);
      setBadge(els.badgeNoon, false, false);
      setBadge(els.badgeEvening, false, false);
      return;
    }
    const entry = ensureDayEntry(dateKey);
    const comp = dayCompletion(entry);

    const morningPartial = entry.morning.counts.some(x=>x>0);
    const noonPartial = entry.noon.counts.some(x=>x>0);
    const eveningPartial = entry.evening.counts.some(x=>x>0) || (entry.loudRead||0)>0;

    setBadge(els.badgeMorning, comp.m, morningPartial && !comp.m);
    setBadge(els.badgeNoon, comp.n, noonPartial && !comp.n);
    setBadge(els.badgeEvening, comp.e, eveningPartial && !comp.e);
  };

  const renderHeaderDate = (dateKey) => {
    const d = new Date(dateKey);
    d.setHours(0,0,0,0);
    els.todayDateLabel.textContent = formatDateLabel(d);

    const start = new Date(state.settings.startDate);
    start.setHours(0,0,0,0);
    const idx = Math.floor((d - start) / (1000*60*60*24)) + 1;
    const dur = Number(state.settings.duration);

    els.dayIndexLabel.textContent =
      (idx >= 1 && idx <= dur) ? `Tag ${idx} von ${dur}` : `Außerhalb des Programms`;
  };

  const renderStats = () => {
    els.totalDaysValue.textContent = String(state.settings.duration || 30);
    els.streakValue.textContent = String(computeStreak());
    els.doneCountValue.textContent = String(computeDoneCount());
  };

  const renderLoudRead = (dateKey) => {
    const entry = ensureDayEntry(dateKey);
    els.loudCount.textContent = `${entry.loudRead} / 9`;
  };

  const renderGoalCards = (container, session, dateKey) => {
    container.innerHTML = "";
    if (!state.goals.length) return;

    const dayEntry = ensureDayEntry(dateKey);
    const target = getTargets(session);
    const counts = dayEntry[session].counts;

    state.goals.forEach((goalText, idx) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      const $text = node.querySelector(".goal-text");
      const $target = node.querySelector(".goal-target");
      const $status = node.querySelector(".goal-status");
      const $input = node.querySelector(".goal-input");
      const $submit = node.querySelector(".goal-submit");
      const $undo = node.querySelector(".goal-undo");
      const $clear = node.querySelector(".goal-clear");
      const $help = node.querySelector(".goal-help");

      $text.textContent = goalText;

      const updateMeta = () => {
        $target.textContent = `${counts[idx]} / ${target}`;
        $status.textContent = counts[idx] >= target ? "fertig" : "offen";
      };
      updateMeta();

      const opts = {
        caseSensitive: !!state.settings.caseSensitive,
        strictPunctuation: !!state.settings.strictPunctuation
      };
      const goalNorm = normalizeText(goalText, opts);

      const tryCount = () => {
        const typedNorm = normalizeText($input.value, opts);

        if (!typedNorm) {
          $help.textContent = "Leer zählt nicht.";
          return;
        }
        if (typedNorm !== goalNorm) {
          $help.textContent = "Kein Match. Wortgleich tippen.";
          return;
        }
        if (counts[idx] >= target) {
          $help.textContent = "Schon fertig.";
          $input.value = "";
          return;
        }

        counts[idx] += 1;
        saveState();
        updateMeta();
        $input.value = "";
        $help.textContent = "Gezählt.";

        renderBadges(dateKey);
        renderProgress();
        renderStats();
      };

      $submit.addEventListener("click", tryCount);
      $input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); tryCount(); }
      });

      $undo.addEventListener("click", () => {
        if (counts[idx] > 0) counts[idx] -= 1;
        saveState();
        updateMeta();
        $help.textContent = "Rückgängig.";
        renderBadges(dateKey);
        renderProgress();
        renderStats();
      });

      $clear.addEventListener("click", () => {
        counts[idx] = 0;
        saveState();
        updateMeta();
        $help.textContent = "Gelöscht.";
        renderBadges(dateKey);
        renderProgress();
        renderStats();
      });

      container.appendChild(node);
    });
  };

  const renderProgress = () => {
    const start = new Date(state.settings.startDate);
    start.setHours(0,0,0,0);
    const dur = Number(state.settings.duration);
    els.progressGrid.innerHTML = "";

    const todayKey = isoDate(nowLocalDate());

    for (let i=0; i<dur; i++) {
      const d = addDays(start, i);
      const key = isoDate(d);
      const entry = ensureDayEntry(key);
      const comp = dayCompletion(entry);

      const div = document.createElement("div");
      div.className = "day";
      if (comp.all) div.classList.add("done");
      else if (comp.any) div.classList.add("partial");
      if (key === todayKey) div.classList.add("today");

      div.innerHTML = `
        <div class="day-top">
          <div class="day-num">${i+1}</div>
          <div class="day-state">${comp.all ? "fertig" : comp.any ? "läuft" : "offen"}</div>
        </div>
        <div class="muted small">${key}</div>
      `;

      div.addEventListener("click", () => {
        currentDateKey = key;
        refreshUI();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      els.progressGrid.appendChild(div);
    }
  };

  const refreshUI = () => {
    const hasGoals = state.goals.length > 0;
    els.noGoalsBanner.hidden = hasGoals;

    renderHeaderDate(currentDateKey);
    renderStats();

    if (!hasGoals) {
      els.morningGoals.innerHTML = "";
      els.noonGoals.innerHTML = "";
      els.eveningGoals.innerHTML = "";
      els.loudCount.textContent = "0 / 9";
      renderBadges(currentDateKey);
      renderProgress();
      return;
    }

    ensureDayEntry(currentDateKey);

    renderGoalCards(els.morningGoals, "morning", currentDateKey);
    renderGoalCards(els.noonGoals, "noon", currentDateKey);
    renderGoalCards(els.eveningGoals, "evening", currentDateKey);

    renderLoudRead(currentDateKey);
    renderBadges(currentDateKey);
    renderProgress();
  };

  const setStartDateDefault = () => {
    const today = isoDate(nowLocalDate());
    if (!state.settings.startDate) state.settings.startDate = today;
    els.startDate.value = state.settings.startDate || today;
  };

  const syncSettingsToForm = () => {
    els.duration.value = String(state.settings.duration || 30);
    els.caseSensitive.checked = !!state.settings.caseSensitive;
    els.strictPunctuation.checked = !!state.settings.strictPunctuation;
  };

  const syncGoalsToForm = () => {
    els.goal1.value = state.goals[0] || "";
    els.goal2.value = state.goals[1] || "";
    els.goal3.value = state.goals[2] || "";
  };

  const applyFormToState = () => {
    const g1 = (els.goal1.value || "").trim();
    const g2 = (els.goal2.value || "").trim();
    const g3 = (els.goal3.value || "").trim();

    state.goals = [g1, g2, g3].filter(Boolean).slice(0,3);

    state.settings.startDate = els.startDate.value || isoDate(nowLocalDate());
    state.settings.duration = Number(els.duration.value || 30);
    state.settings.caseSensitive = !!els.caseSensitive.checked;
    state.settings.strictPunctuation = !!els.strictPunctuation.checked;

    Object.keys(state.days).forEach((k) => ensureDayEntry(k));
    saveState();
  };

  const exportState = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `369-ritual-export_${isoDate(nowLocalDate())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importStateFromFile = async (file) => {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!parsed || typeof parsed !== "object") throw new Error("Ungültige Datei.");
    if (!Array.isArray(parsed.goals)) throw new Error("Ungültige Ziele.");
    if (!parsed.settings) throw new Error("Ungültige Settings.");

    state = {
      ...defaultState(),
      ...parsed,
      settings: { ...defaultState().settings, ...(parsed.settings || {}) },
      goals: parsed.goals.slice(0,3).map(x => String(x || "").trim()).filter(Boolean),
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {}
    };

    Object.keys(state.days).forEach((k) => ensureDayEntry(k));
    saveState();

    setStartDateDefault();
    syncSettingsToForm();
    syncGoalsToForm();

    const todayKey = isoDate(nowLocalDate());
    currentDateKey = withinProgram(todayKey) ? todayKey : isoDate(new Date(state.settings.startDate));

    refreshUI();
  };

  const resetAll = () => {
    const ok = confirm("Alles löschen? Ziele + Tracking werden entfernt.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();

    setStartDateDefault();
    syncSettingsToForm();
    syncGoalsToForm();

    currentDateKey = isoDate(nowLocalDate());
    refreshUI();
  };

  // State
  let state = loadState();
  let currentDateKey = isoDate(nowLocalDate());

  // Init
  setStartDateDefault();
  syncSettingsToForm();
  syncGoalsToForm();

  const todayKey = isoDate(nowLocalDate());
  if (state.settings.startDate) {
    currentDateKey = withinProgram(todayKey) ? todayKey : state.settings.startDate;
  }

  // Events
  els.goalsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFormToState();
    if (!state.goals.length) {
      alert("Bitte mindestens 1 Ziel eintragen.");
      return;
    }
    if (!withinProgram(currentDateKey)) currentDateKey = state.settings.startDate;
    refreshUI();
  });

  els.btnPrevDay.addEventListener("click", () => {
    const d = addDays(new Date(currentDateKey), -1);
    const key = isoDate(d);
    const start = new Date(state.settings.startDate); start.setHours(0,0,0,0);
    if (key < isoDate(start)) return;
    currentDateKey = key;
    refreshUI();
  });

  els.btnNextDay.addEventListener("click", () => {
    const d = addDays(new Date(currentDateKey), 1);
    const key = isoDate(d);
    const start = new Date(state.settings.startDate); start.setHours(0,0,0,0);
    const end = addDays(start, Number(state.settings.duration)-1);
    if (key > isoDate(end)) return;
    currentDateKey = key;
    refreshUI();
  });

  els.btnLoudMinus.addEventListener("click", () => {
    if (!state.goals.length) return;
    const entry = ensureDayEntry(currentDateKey);
    entry.loudRead = clamp((entry.loudRead || 0) - 1, 0, 9);
    saveState();
    renderLoudRead(currentDateKey);
    renderBadges(currentDateKey);
    renderProgress();
    renderStats();
  });

  els.btnLoudPlus.addEventListener("click", () => {
    if (!state.goals.length) return;
    const entry = ensureDayEntry(currentDateKey);
    entry.loudRead = clamp((entry.loudRead || 0) + 1, 0, 9);
    saveState();
    renderLoudRead(currentDateKey);
    renderBadges(currentDateKey);
    renderProgress();
    renderStats();
  });

  els.btnMarkEveningDone.addEventListener("click", () => {
    if (!state.goals.length) return;
    const entry = ensureDayEntry(currentDateKey);
    const writingDone = isSessionDone(entry, "evening");
    const loudDone = (entry.loudRead || 0) >= 9;

    if (!writingDone && !loudDone) {
      alert("Abend ist noch offen: Schreib-Teil (9× pro Ziel) und laut Lesen (9×) fehlen.");
      return;
    }
    if (!writingDone) { alert("Abend: Schreib-Teil (9× pro Ziel) fehlt noch."); return; }
    if (!loudDone) { alert("Abend: Laut lesen (9×) fehlt noch."); return; }

    alert("Abend abgeschlossen.");
    renderBadges(currentDateKey);
    renderProgress();
    renderStats();
  });

  els.btnExport.addEventListener("click", exportState);

  els.fileImport.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      await importStateFromFile(file);
      e.target.value = "";
    } catch (err) {
      alert("Import fehlgeschlagen: " + (err?.message || "Unbekannter Fehler"));
      e.target.value = "";
    }
  });

  els.btnReset.addEventListener("click", resetAll);
  els.btnPrint.addEventListener("click", () => window.print());

  refreshUI();
})();

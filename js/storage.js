const STORAGE_KEYS = {
  settings: 'erp_settings_v1',
  events: 'erp_events_v1',
  grades: 'erp_grades_v1',
  weeklyFocus: 'erp_weekly_focus_v1',
  weeklyTasks: 'erp_weekly_tasks_v1',
};

const DEFAULT_SETTINGS = {
  schoolName: '',
  examType: '未定',
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('localStorageの読み込みに失敗しました:', key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorageの書き込みに失敗しました:', key, e);
  }
}

const Store = {
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...loadJSON(STORAGE_KEYS.settings, {}) };
  },
  saveSettings(settings) {
    saveJSON(STORAGE_KEYS.settings, settings);
  },
  getEvents() {
    return loadJSON(STORAGE_KEYS.events, []);
  },
  saveEvents(events) {
    saveJSON(STORAGE_KEYS.events, events);
  },
  getGrades() {
    return loadJSON(STORAGE_KEYS.grades, []);
  },
  saveGrades(grades) {
    saveJSON(STORAGE_KEYS.grades, grades);
  },
  getWeeklyFocus() {
    return loadJSON(STORAGE_KEYS.weeklyFocus, []);
  },
  saveWeeklyFocus(list) {
    saveJSON(STORAGE_KEYS.weeklyFocus, list);
  },
  getWeeklyTasks() {
    return loadJSON(STORAGE_KEYS.weeklyTasks, []);
  },
  saveWeeklyTasks(list) {
    saveJSON(STORAGE_KEYS.weeklyTasks, list);
  },
  resetAll() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
};

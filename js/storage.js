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

const SUPABASE_TABLE = 'planner_state';
const SUPABASE_ROW_ID = 'family';

function getAllLocalState() {
  return {
    settings: Store.getSettings(),
    events: Store.getEvents(),
    grades: Store.getGrades(),
    weeklyFocus: Store.getWeeklyFocus(),
    weeklyTasks: Store.getWeeklyTasks(),
  };
}

function applyStateToLocalStorage(state) {
  if (!state) return;
  if (state.settings) saveJSON(STORAGE_KEYS.settings, { ...DEFAULT_SETTINGS, ...state.settings });
  if (state.events) saveJSON(STORAGE_KEYS.events, state.events);
  if (state.grades) saveJSON(STORAGE_KEYS.grades, state.grades);
  if (state.weeklyFocus) saveJSON(STORAGE_KEYS.weeklyFocus, state.weeklyFocus);
  if (state.weeklyTasks) saveJSON(STORAGE_KEYS.weeklyTasks, state.weeklyTasks);
}

/* localStorageへの保存後に呼ぶ。Supabase未設定時は何もしない（フォールバック） */
function syncStateToSupabase() {
  if (typeof SupabaseClient === 'undefined' || !SupabaseClient) return;
  SupabaseClient
    .from(SUPABASE_TABLE)
    .upsert({ id: SUPABASE_ROW_ID, state: getAllLocalState(), updated_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.error('Supabaseへの保存に失敗しました:', error.message);
    })
    .catch((e) => console.error('Supabaseへの保存に失敗しました:', e));
}

/* 起動時に1回だけ呼ぶ。Supabaseにデータがあれば優先してlocalStorageへ反映する */
const SUPABASE_HYDRATE_TIMEOUT_MS = 5000;

async function hydrateFromSupabase() {
  if (typeof SupabaseClient === 'undefined' || !SupabaseClient) return false;
  try {
    /* Supabaseが遅い/応答しない場合でも起動画面が固まらないようタイムアウトを設ける */
    const { data, error } = await Promise.race([
      SupabaseClient.from(SUPABASE_TABLE).select('state').eq('id', SUPABASE_ROW_ID).maybeSingle(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabaseからの読み込みがタイムアウトしました')), SUPABASE_HYDRATE_TIMEOUT_MS)
      ),
    ]);
    if (error) {
      console.error('Supabaseからの読み込みに失敗しました:', error.message);
      return false;
    }
    if (data && data.state) {
      applyStateToLocalStorage(data.state);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Supabaseからの読み込みに失敗しました:', e);
    return false;
  }
}

const Store = {
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...loadJSON(STORAGE_KEYS.settings, {}) };
  },
  saveSettings(settings) {
    saveJSON(STORAGE_KEYS.settings, settings);
    syncStateToSupabase();
  },
  getEvents() {
    return loadJSON(STORAGE_KEYS.events, []);
  },
  saveEvents(events) {
    saveJSON(STORAGE_KEYS.events, events);
    syncStateToSupabase();
  },
  getGrades() {
    return loadJSON(STORAGE_KEYS.grades, []);
  },
  saveGrades(grades) {
    saveJSON(STORAGE_KEYS.grades, grades);
    syncStateToSupabase();
  },
  getWeeklyFocus() {
    return loadJSON(STORAGE_KEYS.weeklyFocus, []);
  },
  saveWeeklyFocus(list) {
    saveJSON(STORAGE_KEYS.weeklyFocus, list);
    syncStateToSupabase();
  },
  getWeeklyTasks() {
    return loadJSON(STORAGE_KEYS.weeklyTasks, []);
  },
  saveWeeklyTasks(list) {
    saveJSON(STORAGE_KEYS.weeklyTasks, list);
    syncStateToSupabase();
  },
  resetAll() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
  hydrateFromSupabase,
};

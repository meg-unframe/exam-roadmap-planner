const SCREENS = ['home', 'schedule', 'grades'];

const EVENT_TYPE_LABELS = {
  mock: '模試',
  schoolTest: '学校の実力テスト',
  exam: '入試候補日',
};

const GRADE_CATEGORY_LABELS = {
  naishin: '内申点',
  mock: '模試',
  schoolTest: '実力テスト',
};

const WEEKDAY_MON_FIRST = ['月', '火', '水', '木', '金', '土', '日'];

function currentWeekStart() {
  return getMondayStr(todayStr());
}

let editingEventId = null;
let editingGradeId = null;
let subjectRows = [{ name: '', score: '' }];

/* ---------- 画面切り替え ---------- */

function switchScreen(name) {
  SCREENS.forEach((s) => {
    document.getElementById(`screen-${s}`).classList.toggle('active', s === name);
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
}

/* ---------- ホーム画面 ---------- */

function renderHome() {
  const settings = Store.getSettings();
  document.getElementById('input-school-name').value = settings.schoolName || '';
  document.getElementById('select-exam-type').value = settings.examType || '未定';

  const events = Store.getEvents();
  setCountdown('countdown-exam', nearestFutureEvent(events, 'exam'));
  setCountdown('countdown-mock', nearestFutureEvent(events, 'mock'));
  setCountdown('countdown-school-test', nearestFutureEvent(events, 'schoolTest'));

  renderWeeklyFocus();
  renderWeeklyTasks();
}

function setCountdown(elId, event) {
  const el = document.getElementById(elId);
  if (!event) {
    el.textContent = '--';
    return;
  }
  const d = daysUntil(event.date);
  el.textContent = d === 0 ? '当日' : `${d}日`;
}

function saveSettingsFromForm() {
  Store.saveSettings({
    schoolName: document.getElementById('input-school-name').value.trim(),
    examType: document.getElementById('select-exam-type').value,
  });
}

function renderWeeklyFocus() {
  const list = Store.getWeeklyFocus();
  const container = document.getElementById('weekly-focus-list');
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-state">重点科目が未設定です</p>';
    return;
  }
  container.innerHTML = list
    .map(
      (subject, idx) => `
    <span class="chip">${escapeHTML(subject)}<button type="button" class="btn-remove-focus" data-idx="${idx}" aria-label="削除">×</button></span>
  `
    )
    .join('');
}

function renderWeeklyTasks() {
  const weekStart = currentWeekStart();
  const weekDates = getWeekDates(weekStart);
  const todayIdx = weekDates.indexOf(todayStr());

  const todayLabelEl = document.getElementById('weekly-tasks-today-label');
  if (todayLabelEl) todayLabelEl.textContent = `今日は${WEEKDAY_MON_FIRST[todayIdx]}曜日`;

  const tasks = Store.getWeeklyTasks().filter((t) => t.weekStart === weekStart);
  const container = document.getElementById('weekly-tasks-list');
  if (tasks.length === 0) {
    container.innerHTML = '<p class="empty-state">今週のタスクはまだありません</p>';
    return;
  }
  container.innerHTML = tasks
    .map((t) => {
      const dayCells = weekDates
        .map((date, idx) => {
          const checked = !!(t.checks && t.checks[date]);
          const todayClass = idx === todayIdx ? 'day-check-today' : '';
          return `
        <label class="day-check ${todayClass}">
          <span class="day-check-label">${WEEKDAY_MON_FIRST[idx]}</span>
          <input type="checkbox" class="task-day-checkbox" data-task-id="${t.id}" data-date="${date}" ${checked ? 'checked' : ''}>
        </label>`;
        })
        .join('');
      return `
    <div class="task-item">
      <div class="task-row-top">
        <span class="task-text">${escapeHTML(t.text)}</span>
        <button type="button" class="link-btn btn-remove-task" data-id="${t.id}">削除</button>
      </div>
      <div class="day-check-row">${dayCells}</div>
    </div>
  `;
    })
    .join('');
}

/* ---------- 予定・模試画面 ---------- */

function renderEvents() {
  const events = Store.getEvents().slice().sort((a, b) => a.date.localeCompare(b.date));
  const container = document.getElementById('events-list');
  if (events.length === 0) {
    container.innerHTML = '<p class="empty-state">予定はまだ登録されていません</p>';
    return;
  }
  container.innerHTML = events
    .map((ev) => {
      const d = daysUntil(ev.date);
      const daysLabel = d > 0 ? `あと${d}日` : d === 0 ? '本日' : `${Math.abs(d)}日前に終了`;
      return `
      <div class="list-item">
        <div>
          <span class="badge badge-${ev.type}">${EVENT_TYPE_LABELS[ev.type]}</span>
          <div class="title">${escapeHTML(ev.name)}</div>
          <div class="meta">${formatDateJP(ev.date)}・${daysLabel}</div>
          ${ev.memo ? `<div class="detail">${escapeHTML(ev.memo)}</div>` : ''}
        </div>
        <div class="item-actions">
          <button type="button" class="btn-edit-event" data-id="${ev.id}">編集</button>
          <button type="button" class="btn-delete-event" data-id="${ev.id}">削除</button>
        </div>
      </div>`;
    })
    .join('');
}

function resetEventForm() {
  editingEventId = null;
  document.getElementById('event-form').reset();
  document.getElementById('event-submit-btn').textContent = '追加';
  document.getElementById('event-cancel-btn').hidden = true;
}

/* ---------- 成績画面 ---------- */

function renderSubjectRows() {
  const container = document.getElementById('grade-subjects-container');
  container.innerHTML = subjectRows
    .map(
      (row, idx) => `
    <div class="subject-row">
      <input type="text" class="subject-name-input" data-idx="${idx}" placeholder="科目名" value="${escapeHTML(row.name)}">
      <input type="number" class="subject-score-input" data-idx="${idx}" placeholder="点数" value="${escapeHTML(row.score)}">
      <button type="button" class="btn-remove-subject" data-idx="${idx}" aria-label="この科目を削除">×</button>
    </div>
  `
    )
    .join('');
  updateGradeTotal();
}

function updateGradeTotal() {
  const total = subjectRows.reduce((sum, r) => {
    const n = Number(r.score);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  document.getElementById('grade-total-display').textContent = total;
}

function updateGradeFormVisibility() {
  const isMock = document.getElementById('grade-category-select').value === 'mock';
  document.getElementById('grade-mock-fields').hidden = !isMock;
}

function resetGradeForm() {
  editingGradeId = null;
  document.getElementById('grade-form').reset();
  subjectRows = [{ name: '', score: '' }];
  renderSubjectRows();
  updateGradeFormVisibility();
  document.getElementById('grade-submit-btn').textContent = '追加';
  document.getElementById('grade-cancel-btn').hidden = true;
}

function renderGrades() {
  const grades = Store.getGrades().slice().sort((a, b) => b.date.localeCompare(a.date));
  const container = document.getElementById('grades-list');
  if (grades.length === 0) {
    container.innerHTML = '<p class="empty-state">成績記録はまだありません</p>';
    return;
  }
  container.innerHTML = grades
    .map((g) => {
      const subjectsText = g.subjects.length
        ? g.subjects.map((s) => `${escapeHTML(s.name)}: ${s.score ?? '-'}`).join(' / ')
        : '科目未入力';
      const extraParts = [];
      if (g.category === 'mock') {
        if (g.hantei) extraParts.push(`判定: ${escapeHTML(g.hantei)}`);
        if (g.hensachi !== null && g.hensachi !== undefined) extraParts.push(`偏差値: ${g.hensachi}`);
      }
      const extra = extraParts.length ? ' ・ ' + extraParts.join(' ') : '';
      return `
      <div class="list-item">
        <div>
          <span class="badge badge-${g.category}">${GRADE_CATEGORY_LABELS[g.category]}</span>
          <div class="title">${escapeHTML(g.title)}</div>
          <div class="meta">${formatDateJP(g.date)}</div>
          <div class="detail">${subjectsText}</div>
          <div class="detail">合計: ${g.total}${extra}</div>
        </div>
        <div class="item-actions">
          <button type="button" class="btn-edit-grade" data-id="${g.id}">編集</button>
          <button type="button" class="btn-delete-grade" data-id="${g.id}">削除</button>
        </div>
      </div>`;
    })
    .join('');
}

/* ---------- 待受モード ---------- */

function nearestNextTest(events) {
  const mock = nearestFutureEvent(events, 'mock');
  const schoolTest = nearestFutureEvent(events, 'schoolTest');
  if (mock && schoolTest) return mock.date <= schoolTest.date ? mock : schoolTest;
  return mock || schoolTest || null;
}

function daysLabelFor(event) {
  if (!event) return '--';
  const d = daysUntil(event.date);
  return d === 0 ? '当日' : String(d);
}

function getTodayStep() {
  const weekStart = currentWeekStart();
  const today = todayStr();
  const tasks = Store.getWeeklyTasks().filter((t) => t.weekStart === weekStart);
  const undoneToday = tasks.find((t) => !(t.checks && t.checks[today]));
  if (undoneToday) return undoneToday.text;
  if (tasks.length > 0) return '今日のタスクはすべて完了しました！';
  return '今週のタスクを追加しましょう';
}

function renderStandby() {
  const events = Store.getEvents();
  const examEvent = nearestFutureEvent(events, 'exam');
  const nextTestEvent = nearestNextTest(events);

  document.getElementById('standby-exam-days').textContent = daysLabelFor(examEvent);
  document.getElementById('standby-next-test-days').textContent = daysLabelFor(nextTestEvent);

  const focus = Store.getWeeklyFocus();
  document.getElementById('standby-focus').textContent = focus.length ? focus.join(' ・ ') : '未設定';

  document.getElementById('standby-step').textContent = getTodayStep();
}

/* ---------- 初期化・イベント登録 ---------- */

document.addEventListener('DOMContentLoaded', () => {
  /* ナビゲーション */
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });

  /* ホーム：志望校・受験方式 */
  document.getElementById('input-school-name').addEventListener('blur', saveSettingsFromForm);
  document.getElementById('select-exam-type').addEventListener('change', saveSettingsFromForm);

  /* ホーム：今週の重点科目 */
  document.getElementById('focus-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('input-weekly-focus');
    const val = input.value.trim();
    if (!val) return;
    const list = Store.getWeeklyFocus();
    list.push(val);
    Store.saveWeeklyFocus(list);
    input.value = '';
    renderWeeklyFocus();
  });

  document.getElementById('weekly-focus-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-focus');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const list = Store.getWeeklyFocus();
    list.splice(idx, 1);
    Store.saveWeeklyFocus(list);
    renderWeeklyFocus();
  });

  /* ホーム：今週やること */
  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('input-weekly-task');
    const val = input.value.trim();
    if (!val) return;
    const tasks = Store.getWeeklyTasks();
    tasks.push({ id: genId(), text: val, weekStart: currentWeekStart(), checks: {} });
    Store.saveWeeklyTasks(tasks);
    input.value = '';
    renderWeeklyTasks();
  });

  document.getElementById('weekly-tasks-list').addEventListener('click', (e) => {
    const delBtn = e.target.closest('.btn-remove-task');
    if (!delBtn) return;
    const tasks = Store.getWeeklyTasks().filter((t) => t.id !== delBtn.dataset.id);
    Store.saveWeeklyTasks(tasks);
    renderWeeklyTasks();
  });

  document.getElementById('weekly-tasks-list').addEventListener('change', (e) => {
    if (!e.target.classList.contains('task-day-checkbox')) return;
    const taskId = e.target.dataset.taskId;
    const date = e.target.dataset.date;
    const tasks = Store.getWeeklyTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.checks = task.checks || {};
      task.checks[date] = e.target.checked;
      Store.saveWeeklyTasks(tasks);
    }
  });

  /* ホーム：データ初期化 */
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('すべてのデータを削除します。よろしいですか？この操作は取り消せません。')) {
      Store.resetAll();
      resetEventForm();
      resetGradeForm();
      renderHome();
      renderEvents();
      renderGrades();
    }
  });

  /* 予定・模試 */
  document.getElementById('event-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('event-type-select').value;
    const name = document.getElementById('event-name-input').value.trim();
    const date = document.getElementById('event-date-input').value;
    const memo = document.getElementById('event-memo-input').value.trim();
    if (!name || !date) {
      alert('名称と日付を入力してください');
      return;
    }
    const events = Store.getEvents();
    if (editingEventId) {
      const idx = events.findIndex((ev) => ev.id === editingEventId);
      if (idx !== -1) events[idx] = { ...events[idx], type, name, date, memo };
    } else {
      events.push({ id: genId(), type, name, date, memo });
    }
    Store.saveEvents(events);
    resetEventForm();
    renderEvents();
    renderHome();
  });

  document.getElementById('event-cancel-btn').addEventListener('click', resetEventForm);

  document.getElementById('events-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit-event');
    const delBtn = e.target.closest('.btn-delete-event');
    if (editBtn) {
      const events = Store.getEvents();
      const ev = events.find((e2) => e2.id === editBtn.dataset.id);
      if (!ev) return;
      editingEventId = ev.id;
      document.getElementById('event-type-select').value = ev.type;
      document.getElementById('event-name-input').value = ev.name;
      document.getElementById('event-date-input').value = ev.date;
      document.getElementById('event-memo-input').value = ev.memo || '';
      document.getElementById('event-submit-btn').textContent = '更新';
      document.getElementById('event-cancel-btn').hidden = false;
      document.getElementById('event-form').scrollIntoView({ behavior: 'smooth' });
    } else if (delBtn) {
      if (!confirm('この予定を削除しますか？')) return;
      const events = Store.getEvents().filter((e2) => e2.id !== delBtn.dataset.id);
      Store.saveEvents(events);
      if (editingEventId === delBtn.dataset.id) resetEventForm();
      renderEvents();
      renderHome();
    }
  });

  /* 成績：動的な科目行 */
  document.getElementById('grade-subjects-container').addEventListener('input', (e) => {
    const idx = Number(e.target.dataset.idx);
    if (Number.isNaN(idx)) return;
    if (e.target.classList.contains('subject-name-input')) {
      subjectRows[idx].name = e.target.value;
    } else if (e.target.classList.contains('subject-score-input')) {
      subjectRows[idx].score = e.target.value;
      updateGradeTotal();
    }
  });

  document.getElementById('grade-subjects-container').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-subject');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    subjectRows.splice(idx, 1);
    if (subjectRows.length === 0) subjectRows.push({ name: '', score: '' });
    renderSubjectRows();
  });

  document.getElementById('btn-add-subject-row').addEventListener('click', () => {
    subjectRows.push({ name: '', score: '' });
    renderSubjectRows();
  });

  document.getElementById('grade-category-select').addEventListener('change', updateGradeFormVisibility);

  /* 成績：フォーム送信 */
  document.getElementById('grade-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('grade-category-select').value;
    const date = document.getElementById('grade-date-input').value;
    const title = document.getElementById('grade-title-input').value.trim();
    const hantei = document.getElementById('grade-hantei-input').value.trim();
    const hensachiRaw = document.getElementById('grade-hensachi-input').value;
    const hensachi = hensachiRaw === '' ? null : Number(hensachiRaw);

    if (!date || !title) {
      alert('日付とタイトルを入力してください');
      return;
    }

    const subjects = subjectRows
      .map((r) => ({ name: r.name.trim(), score: r.score === '' ? null : Number(r.score) }))
      .filter((r) => r.name !== '');

    const total = subjects.reduce((sum, s) => sum + (Number.isFinite(s.score) ? s.score : 0), 0);

    const record = {
      category,
      date,
      title,
      subjects,
      total,
      hantei: category === 'mock' ? hantei : '',
      hensachi: category === 'mock' && Number.isFinite(hensachi) ? hensachi : null,
    };

    const grades = Store.getGrades();
    if (editingGradeId) {
      const idx = grades.findIndex((g) => g.id === editingGradeId);
      if (idx !== -1) grades[idx] = { ...grades[idx], ...record };
    } else {
      grades.push({ id: genId(), ...record });
    }
    Store.saveGrades(grades);
    resetGradeForm();
    renderGrades();
  });

  document.getElementById('grade-cancel-btn').addEventListener('click', resetGradeForm);

  document.getElementById('grades-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit-grade');
    const delBtn = e.target.closest('.btn-delete-grade');
    if (editBtn) {
      const grades = Store.getGrades();
      const g = grades.find((g2) => g2.id === editBtn.dataset.id);
      if (!g) return;
      editingGradeId = g.id;
      document.getElementById('grade-category-select').value = g.category;
      document.getElementById('grade-date-input').value = g.date;
      document.getElementById('grade-title-input').value = g.title;
      document.getElementById('grade-hantei-input').value = g.hantei || '';
      document.getElementById('grade-hensachi-input').value = g.hensachi ?? '';
      subjectRows = g.subjects.length
        ? g.subjects.map((s) => ({ name: s.name, score: s.score ?? '' }))
        : [{ name: '', score: '' }];
      renderSubjectRows();
      updateGradeFormVisibility();
      document.getElementById('grade-submit-btn').textContent = '更新';
      document.getElementById('grade-cancel-btn').hidden = false;
      document.getElementById('grade-form').scrollIntoView({ behavior: 'smooth' });
    } else if (delBtn) {
      if (!confirm('この成績記録を削除しますか？')) return;
      const grades = Store.getGrades().filter((g2) => g2.id !== delBtn.dataset.id);
      Store.saveGrades(grades);
      if (editingGradeId === delBtn.dataset.id) resetGradeForm();
      renderGrades();
    }
  });

  /* 待受モード */
  document.getElementById('btn-open-standby').addEventListener('click', () => {
    renderStandby();
    document.getElementById('standby-overlay').hidden = false;
  });

  document.getElementById('btn-close-standby').addEventListener('click', () => {
    document.getElementById('standby-overlay').hidden = true;
  });

  /* 初期描画 */
  renderHome();
  renderEvents();
  renderSubjectRows();
  updateGradeFormVisibility();
  renderGrades();
});

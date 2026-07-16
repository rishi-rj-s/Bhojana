/**
 * BHOJANA — Database Layer (db.js)
 * sql.js (SQLite WASM) wrapper with localStorage persistence.
 * All write operations call save() automatically.
 */

let db = null;

const STORAGE_KEY = 'bhojana_db_v1';

/* ── Schema ──────────────────────────────────────────────── */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS customers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL,
    plan_type       TEXT NOT NULL,
    daily_cost      REAL NOT NULL,
    advance         REAL NOT NULL,
    start_date      TEXT NOT NULL,
    duration_days   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    status      TEXT NOT NULL CHECK(status IN ('had','skipped')),
    PRIMARY KEY (customer_id, date)
  );

  CREATE TABLE IF NOT EXISTS weekly_menu (
    weekday     TEXT NOT NULL,
    meal        TEXT NOT NULL CHECK(meal IN ('breakfast','lunch','dinner')),
    name        TEXT NOT NULL DEFAULT '',
    is_special  INTEGER DEFAULT 0,
    PRIMARY KEY (weekday, meal)
  );

  CREATE TABLE IF NOT EXISTS special_days (
    id        TEXT PRIMARY KEY,
    date      TEXT NOT NULL UNIQUE,
    label     TEXT NOT NULL,
    breakfast TEXT,
    lunch     TEXT,
    dinner    TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`;

const SEED_MENU = `
  INSERT OR IGNORE INTO weekly_menu (weekday, meal, name) VALUES
    ('Monday','breakfast','Puttu & Kadala Curry'),
    ('Monday','lunch','Rice, Dal, Sambar, Pickle'),
    ('Monday','dinner','Chapati, Egg Curry'),
    ('Tuesday','breakfast','Idli & Sambar'),
    ('Tuesday','lunch','Rice, Fish Curry, Thoran'),
    ('Tuesday','dinner','Porotta, Chicken Curry'),
    ('Wednesday','breakfast','Dosa & Coconut Chutney'),
    ('Wednesday','lunch','Rice, Dal, Aviyal'),
    ('Wednesday','dinner','Chapati, Dal Makhani'),
    ('Thursday','breakfast','Appam & Egg Roast'),
    ('Thursday','lunch','Rice, Sambar, Pachadi'),
    ('Thursday','dinner','Idiyappam, Veg Stew'),
    ('Friday','breakfast','Puttu & Banana'),
    ('Friday','lunch','Rice, Meen Curry, Mezhukupuratti'),
    ('Friday','dinner','Chapati, Paneer Butter Masala'),
    ('Saturday','breakfast','Idli & Podi'),
    ('Saturday','lunch','Rice, Sambar, Rasam, Pappad'),
    ('Saturday','dinner','Parotta, Beef Curry'),
    ('Sunday','breakfast','Appam & Mutton Stew'),
    ('Sunday','lunch','Rice, Chicken Curry, Pachadi'),
    ('Sunday','dinner','Chapati, Egg Bhurji');
`;

/* ── Init ────────────────────────────────────────────────── */
export async function initDB() {
  const SQL = await window.initSqlJs({
    locateFile: file => `./vendor/${file}`
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
      db = new SQL.Database(buf);
    } catch (e) {
      console.warn('DB load failed, starting fresh:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Always run schema (IF NOT EXISTS) so upgrades are safe
  db.run(SCHEMA);
  db.run(SEED_MENU);
  save();
  return db;
}

/* ── Persist ─────────────────────────────────────────────── */
export function save() {
  if (!db) return;
  try {
    const data = db.export();
    // Use chunked approach for large buffers
    const b64 = btoa(String.fromCharCode.apply(null, new Uint8Array(data)));
    localStorage.setItem(STORAGE_KEY, b64);
  } catch (e) {
    console.error('DB save failed:', e);
  }
}

/* ── Reset ───────────────────────────────────────────────── */
export function resetDB() {
  if (!db) return;
  db.run('DELETE FROM attendance');
  db.run('DELETE FROM special_days');
  db.run('DELETE FROM customers');
  db.run('DELETE FROM weekly_menu');
  db.run('DELETE FROM settings');
  db.run(SEED_MENU);
  save();
}

/* ── Helpers ─────────────────────────────────────────────── */
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
}

function getSetting(key, fallback = null) {
  const rows = query('SELECT value FROM settings WHERE key = ?', [key]);
  return rows.length ? rows[0].value : fallback;
}

function setSetting(key, value) {
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, String(value)]);
}

/* ── Customers ───────────────────────────────────────────── */
export function getCustomers() {
  return query('SELECT * FROM customers ORDER BY id ASC');
}

export function getCustomer(id) {
  const rows = query('SELECT * FROM customers WHERE id = ?', [id]);
  return rows[0] || null;
}

export function addCustomer(c) {
  const id = generateCustomerId();
  run(
    `INSERT INTO customers (id, name, phone, plan_type, daily_cost, advance, start_date, duration_days)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, c.name, c.phone, c.plan_type, c.daily_cost, c.advance, c.start_date, c.duration_days]
  );
  return id;
}

export function updateCustomer(id, c) {
  run(
    `UPDATE customers SET name=?, phone=?, plan_type=?, daily_cost=?, advance=?, start_date=?, duration_days=?
     WHERE id=?`,
    [c.name, c.phone, c.plan_type, c.daily_cost, c.advance, c.start_date, c.duration_days, id]
  );
}

export function deleteCustomer(id) {
  run('DELETE FROM attendance WHERE customer_id = ?', [id]);
  run('DELETE FROM customers WHERE id = ?', [id]);
}

function generateCustomerId() {
  const rows = query("SELECT id FROM customers ORDER BY id DESC LIMIT 1");
  if (!rows.length) return 'BHJ-001';
  const last = rows[0].id;
  const num = parseInt(last.split('-')[1], 10) + 1;
  return `BHJ-${String(num).padStart(3, '0')}`;
}

/* ── Attendance ──────────────────────────────────────────── */
export function getAttendanceForMonth(customerId, year, month) {
  // month is 1-indexed
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return query(
    "SELECT * FROM attendance WHERE customer_id=? AND date LIKE ?",
    [customerId, `${prefix}%`]
  );
}

export function getAttendanceForCustomer(customerId) {
  return query('SELECT * FROM attendance WHERE customer_id=? ORDER BY date ASC', [customerId]);
}

export function setAttendance(customerId, date, status) {
  if (status === null || status === undefined || status === '') {
    run('DELETE FROM attendance WHERE customer_id=? AND date=?', [customerId, date]);
  } else {
    run(
      'INSERT OR REPLACE INTO attendance (customer_id, date, status) VALUES (?,?,?)',
      [customerId, date, status]
    );
  }
}

export function getAttendanceStats(customerId) {
  const rows = query(
    `SELECT status, COUNT(*) as count FROM attendance WHERE customer_id=? GROUP BY status`,
    [customerId]
  );
  const stats = { had: 0, skipped: 0 };
  rows.forEach(r => { stats[r.status] = r.count; });
  return stats;
}

/* ── Weekly Menu ─────────────────────────────────────────── */
export function getWeeklyMenu() {
  return query('SELECT * FROM weekly_menu ORDER BY weekday, meal');
}

export function getMenuForDay(weekday) {
  return query('SELECT * FROM weekly_menu WHERE weekday=?', [weekday]);
}

export function setMenuitem(weekday, meal, name) {
  run(
    'INSERT OR REPLACE INTO weekly_menu (weekday, meal, name) VALUES (?,?,?)',
    [weekday, meal, name]
  );
}

/* ── Special Days ────────────────────────────────────────── */
export function getSpecialDays() {
  return query('SELECT * FROM special_days ORDER BY date ASC');
}

export function getSpecialDay(date) {
  const rows = query('SELECT * FROM special_days WHERE date=?', [date]);
  return rows[0] || null;
}

export function addSpecialDay(s) {
  const id = `SD-${Date.now()}`;
  run(
    'INSERT OR REPLACE INTO special_days (id, date, label, breakfast, lunch, dinner) VALUES (?,?,?,?,?,?)',
    [id, s.date, s.label, s.breakfast || '', s.lunch || '', s.dinner || '']
  );
  return id;
}

export function updateSpecialDay(id, s) {
  run(
    'UPDATE special_days SET date=?, label=?, breakfast=?, lunch=?, dinner=? WHERE id=?',
    [s.date, s.label, s.breakfast || '', s.lunch || '', s.dinner || '', id]
  );
}

export function deleteSpecialDay(id) {
  run('DELETE FROM special_days WHERE id=?', [id]);
}

/* ── Settings ────────────────────────────────────────────── */
export { getSetting, setSetting };

/* ── Home Stats ──────────────────────────────────────────── */
export function getHomeStats(today) {
  const customers = getCustomers();
  const todayStr = today; // ISO yyyy-mm-dd

  let active = 0, expiringSoon = 0, collectionsMonth = 0;

  customers.forEach(c => {
    const status = getCustomerStatus(c, todayStr);
    if (status === 'active') active++;
    if (status === 'expiring') expiringSoon++;

    // Count this month's "had" days × daily cost
    const [y, m] = todayStr.split('-').map(Number);
    const att = getAttendanceForMonth(c.id, y, m);
    const hadDays = att.filter(a => a.status === 'had').length;
    collectionsMonth += hadDays * c.daily_cost;
  });

  // Meals today = active customers count (rough estimate; actual plan depends on plan_type)
  const mealsToday = active;

  return { active, mealsToday, expiringSoon, collectionsMonth };
}

export function getPlanEndDate(customer) {
  const attendance = getAttendanceForCustomer(customer.id);
  const skippedDates = new Set(
    attendance
      .filter(a => a.status === 'skipped')
      .map(a => a.date)
  );

  const [y, m, d] = customer.start_date.split('-').map(Number);
  let currentDate = new Date(y, m - 1, d);
  let daysCounted = 0;

  while (daysCounted < customer.duration_days) {
    const curYear = currentDate.getFullYear();
    const curMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const curDay = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${curYear}-${curMonth}-${curDay}`;

    if (!skippedDates.has(dateStr)) {
      daysCounted++;
    }
    if (daysCounted < customer.duration_days) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const endYear = currentDate.getFullYear();
  const endMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const endDay = String(currentDate.getDate()).padStart(2, '0');
  return `${endYear}-${endMonth}-${endDay}`;
}

export function getCustomerStatus(customer, today) {
  const start = customer.start_date;
  const end = getPlanEndDate(customer);

  if (today < start) return 'soon';
  if (today > end) return 'expired';

  const [endY, endM, endD] = end.split('-').map(Number);
  const [todayY, todayM, todayD] = today.split('-').map(Number);

  const endDObj = new Date(endY, endM - 1, endD);
  const todayDObj = new Date(todayY, todayM - 1, todayD);

  const daysLeft = Math.round((endDObj - todayDObj) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 7) return 'expiring';
  return 'active';
}

export function calcBalance(customer) {
  const allAtt = getAttendanceForCustomer(customer.id);
  const hadCount = allAtt.filter(a => a.status === 'had').length;
  return customer.advance - (hadCount * customer.daily_cost);
}

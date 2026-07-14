/**
 * BHOJANA — Utility Functions (utils.js)
 */

/* ── Date Helpers ────────────────────────────────────────── */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function toISO(date) {
  // date: Date object → yyyy-mm-dd
  return date.toISOString().slice(0, 10);
}

export function parseISO(str) {
  // Avoid timezone issues: parse as local date
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(isoStr) {
  // '2026-07-14' → '14 Jul 2026'
  if (!isoStr) return '';
  const d = parseISO(isoStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(isoStr) {
  // '2026-07-14' → '14 Jul'
  if (!isoStr) return '';
  const d = parseISO(isoStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatMonthYear(year, month) {
  // month 1-indexed → 'July 2026'
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getWeekdayName(isoStr) {
  // '2026-07-14' → 'Tuesday'
  return parseISO(isoStr).toLocaleDateString('en-US', { weekday: 'long' });
}

export function getDaysInMonth(year, month) {
  // month 1-indexed
  return new Date(year, month, 0).getDate();
}

export function getFirstWeekdayOfMonth(year, month) {
  // Returns 0=Sun..6=Sat of the 1st day of the month
  return new Date(year, month - 1, 1).getDay();
}

export function addDays(isoStr, n) {
  const d = parseISO(isoStr);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(isoA, isoB) {
  return Math.round((parseISO(isoB) - parseISO(isoA)) / 86400000);
}

/* ── Plan Helpers ────────────────────────────────────────── */
export function getPlanEndDate(customer) {
  return addDays(customer.start_date, customer.duration_days - 1);
}

export function isDateInPlan(customer, isoDate) {
  const start = customer.start_date;
  const end   = getPlanEndDate(customer);
  return isoDate >= start && isoDate <= end;
}

export function isDatePast(isoDate) {
  return isoDate < todayISO();
}

export function isDateToday(isoDate) {
  return isoDate === todayISO();
}

export function daysLeftInPlan(customer) {
  const end = getPlanEndDate(customer);
  const diff = daysBetween(todayISO(), end);
  return Math.max(0, diff);
}

/* ── Customer Helpers ────────────────────────────────────── */
export function getPlanLabel(planType) {
  const labels = {
    'full':           'Full Day (3 meals)',
    'lunch_dinner':   'Lunch & Dinner',
    'lunch_only':     'Lunch Only',
    'breakfast_only': 'Breakfast Only',
    'dinner_only':    'Dinner Only',
  };
  return labels[planType] || planType;
}

export function getPlanMeals(planType) {
  const meals = {
    'full':           ['breakfast','lunch','dinner'],
    'lunch_dinner':   ['lunch','dinner'],
    'lunch_only':     ['lunch'],
    'breakfast_only': ['breakfast'],
    'dinner_only':    ['dinner'],
  };
  return meals[planType] || [];
}

export function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/* ── Currency ────────────────────────────────────────────── */
export function formatCurrency(n) {
  // ₹1,23,456.00 — Indian number format
  if (n === null || n === undefined || isNaN(n)) return '₹0';
  return '₹' + Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function formatCurrencyWithSign(n) {
  if (n > 0)  return '+' + formatCurrency(n);
  if (n < 0)  return '−' + formatCurrency(Math.abs(n));
  return formatCurrency(0);
}

/* ── Balance ─────────────────────────────────────────────── */
export function calcBalance(customer, hadCount) {
  return customer.advance - (hadCount * customer.daily_cost);
}

/* ── Unique ID helpers ───────────────────────────────────── */
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Escape HTML ─────────────────────────────────────────── */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Status helpers ──────────────────────────────────────── */
export function getCustomerStatus(customer, today = todayISO()) {
  const start = customer.start_date;
  const end   = getPlanEndDate(customer);

  if (today < start) return 'soon';
  if (today > end)   return 'expired';

  const daysLeft = daysBetween(today, end);
  if (daysLeft <= 7) return 'expiring';
  return 'active';
}

export function getStatusBadgeHtml(status) {
  const map = {
    active:   ['badge--active',   'Active'],
    expiring: ['badge--expiring', 'Expiring'],
    expired:  ['badge--expired',  'Expired'],
    soon:     ['badge--soon',     'Starts Soon'],
  };
  const [cls, label] = map[status] || ['badge--active', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ── Debounce ────────────────────────────────────────────── */
export function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── iOS Detection ───────────────────────────────────────── */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isInStandaloneMode() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

/* ── Card tilt setup (desktop) ───────────────────────────── */
export function setupCardTilt(container) {
  if (window.matchMedia('(hover: none)').matches) return; // skip touch devices

  container.addEventListener('mousemove', e => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    card.style.setProperty('--tilt-x', `${-dy * 3}deg`);
    card.style.setProperty('--tilt-y', `${ dx * 3}deg`);
  });

  container.addEventListener('mouseleave', e => {
    const card = e.currentTarget;
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  });
}

/* ── Balance tick animation ──────────────────────────────── */
export function animateBalanceTick(el, newValue, oldValue) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = newValue;
    return;
  }
  el.classList.remove('balance-tick');
  // Force reflow
  void el.offsetWidth;
  el.textContent = newValue;
  el.classList.add('balance-tick');
}

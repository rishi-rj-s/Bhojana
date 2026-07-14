/**
 * BHOJANA — Home Page (home.js)
 */

import * as DB from '../db.js';
import {
  todayISO, formatDate, formatCurrency, getWeekdayName,
  getPlanLabel, getStatusBadgeHtml, getCustomerStatus,
  daysLeftInPlan, setupCardTilt, escapeHtml
} from '../utils.js';
import { showToast } from '../components/toast.js';

export function renderHome(container) {
  const today = todayISO();
  const weekday = getWeekdayName(today);
  const customers = DB.getCustomers();
  const stats = DB.getHomeStats(today);

  // Get today's menu (check special days first)
  const special = DB.getSpecialDay(today);
  const menu = special ? {
    breakfast: special.breakfast,
    lunch:     special.lunch,
    dinner:    special.dinner,
    label:     special.label,
    isSpecial: true,
  } : (() => {
    const rows = DB.getMenuForDay(weekday);
    const m = {};
    rows.forEach(r => { m[r.meal] = r.name; });
    return { ...m, label: null, isSpecial: false };
  })();

  // "Needs Attention" list
  const attention = customers
    .map(c => ({ ...c, status: getCustomerStatus(c, today) }))
    .filter(c => c.status !== 'active')
    .sort((a, b) => {
      const order = { expiring: 0, soon: 1, expired: 2 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    })
    .slice(0, 6);

  const html = `
    <div class="page-container page-enter">

      <!-- Section header -->
      <div class="section-header">
        <div>
          <div class="section-header__title">Good ${getGreeting()}</div>
          <div class="section-header__sub">${formatDate(today)} · ${weekday}</div>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="home-stats-grid" id="home-stats">
        ${statCard('🏠', stats.active,            'Active Customers', 'green',   '')}
        ${statCard('🍽️', stats.mealsToday,        'Meals Today',      'gold',    '')}
        ${statCard('⚠️', stats.expiringSoon,       'Expiring Soon',   'rust',    'plans')}
        ${statCard('₹',  formatCurrency(stats.collectionsMonth), 'This Month',  'green', '', true)}
      </div>

      <div class="home-grid">
        <!-- Today's Menu hero -->
        <div class="home-grid__full">
          ${renderTodayHero(today, weekday, menu)}
        </div>

        <!-- Needs Attention -->
        <div class="card">
          <div class="card__header flex items-center justify-between">
            <h2 class="font-display text-lg weight-bold">Needs Attention</h2>
            ${attention.length > 0 ? `<span class="badge badge--expiring">${attention.length}</span>` : ''}
          </div>
          <div class="card__body" style="padding-top: 0; padding-bottom: var(--sp-2);">
            ${attention.length === 0
              ? `<div class="empty-state" style="padding: var(--sp-8) 0;">
                   <div class="empty-state__icon">✓</div>
                   <div class="empty-state__title">All clear</div>
                   <div class="empty-state__text">No customers need attention right now.</div>
                 </div>`
              : attention.map(c => attentionItem(c, today)).join('')
            }
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <div class="card__header">
            <h2 class="font-display text-lg weight-bold">Quick Actions</h2>
          </div>
          <div class="card__body flex flex-col gap-3">
            <button class="btn btn--primary w-full" id="qa-add-customer">
              <span>＋</span> Add New Customer
            </button>
            <button class="btn btn--secondary w-full" id="qa-schedule">
              <span>📅</span> Mark Today's Attendance
            </button>
            <button class="btn btn--ghost w-full" id="qa-menu">
              <span>🗓</span> Edit This Week's Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Set up card tilt on stat cards
  container.querySelectorAll('.stat-card').forEach(setupCardTilt);

  // Quick action buttons
  container.querySelector('#qa-add-customer').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('bhojana:navigate', { detail: { page: 'customers', action: 'add' } }));
  });
  container.querySelector('#qa-schedule').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('bhojana:navigate', { detail: { page: 'schedule' } }));
  });
  container.querySelector('#qa-menu').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('bhojana:navigate', { detail: { page: 'menu' } }));
  });
}

/* ── Sub-renderers ───────────────────────────────────────── */

function statCard(icon, value, label, color, sub, isMono = false) {
  return `
    <div class="stat-card flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="stat-card__label">${label}</span>
        <span class="stat-card__icon stat-card__icon--${color}">${icon}</span>
      </div>
      <div class="stat-card__value${isMono ? ' stat-card__value--mono' : ''}">${value}</div>
      ${sub ? `<div class="stat-card__sub">${sub}</div>` : ''}
    </div>
  `;
}

function renderTodayHero(today, weekday, menu) {
  const specialBadge = menu.isSpecial
    ? `<span class="badge badge--expiring" style="background:var(--gold-200);color:var(--gold-600);">✦ ${escapeHtml(menu.label)}</span>`
    : '';

  return `
    <div class="today-hero">
      <div class="today-hero__body">
        <div class="today-hero__date">${weekday}'s Menu ${specialBadge}</div>
        <div class="today-hero__title">Today's Meals</div>
        <div class="today-hero__menu">
          ${['breakfast','lunch','dinner'].map(meal => `
            <div class="today-meal">
              <div class="today-meal__label">${meal}</div>
              <div class="today-meal__name">${escapeHtml(menu[meal] || '—')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function attentionItem(c, today) {
  const statusColors = {
    expiring: 'var(--gold-500)',
    expired:  'var(--rust-500)',
    soon:     'var(--leaf-400)',
  };
  const desc = {
    expiring: `${daysLeftInPlan(c)} days left`,
    expired:  'Plan ended',
    soon:     `Starts ${formatDate(c.start_date)}`,
  };

  return `
    <div class="attention-item">
      <span class="attention-item__dot" style="background:${statusColors[c.status]};"></span>
      <div class="flex-1 min-w-0">
        <div class="attention-item__name truncate">${escapeHtml(c.name)}</div>
        <div class="attention-item__desc">${escapeHtml(c.id)} · ${desc[c.status] || ''}</div>
      </div>
      ${getStatusBadgeHtml(c.status)}
    </div>
  `;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

/**
 * BHOJANA — Home Page (home.js)
 * Editorial layout inspired by high-end culinary journals and boutique menus.
 */

import * as DB from '../db.js';
import {
  todayISO, formatDate, formatCurrency, getWeekdayName,
  getPlanLabel, getStatusBadgeHtml, getCustomerStatus,
  daysLeftInPlan, setupCardTilt, escapeHtml
} from '../utils.js';
import { showToast } from '../components/toast.js';

export function renderHome(container) {
  const today    = todayISO();
  const weekday  = getWeekdayName(today);
  const customers = DB.getCustomers();
  const stats    = DB.getHomeStats(today);
  const greeting = renderGreetingTitle();

  // Today's menu — special day overrides weekly template
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

  // Needs attention
  const attention = customers
    .map(c => ({ ...c, status: getCustomerStatus(c, today) }))
    .filter(c => c.status !== 'active')
    .sort((a, b) => {
      const order = { expiring: 0, soon: 1, expired: 2 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    })
    .slice(0, 5);

  const today_d = new Date();
  // Premium mono date display: e.g., 14 / JUL / 2026
  const dateStr = today_d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, ' / ');
  const dayStr  = today_d.toLocaleDateString('en-IN', { weekday: 'long' });

  container.innerHTML = `
    <div class="page-container page-enter">

      <!-- ── Greeting (Editorial) ───────────────────────────── -->
      <div class="home-greeting">
        <div class="home-greeting__eyebrow">${dayStr} — ${dateStr} <span style="margin-left: var(--sp-1);">${greeting.icon}</span></div>
        <h1 class="home-greeting__title">${greeting.title}</h1>
        <p class="home-greeting__sub">${customers.length === 0
          ? 'Add your first customer to get started.'
          : `${greeting.message} &middot; <strong>${stats.active}</strong> active mess${stats.active !== 1 ? 'es' : ''} &middot; <strong>${stats.mealsToday}</strong> portions today.`
        }</p>
      </div>

      <!-- ── Stat Cards (Ledger slips style) ────────────────── -->
      <div class="home-stats-row" id="home-stats">
        ${statCard('[ 01 ]', stats.active, 'Active messes', 'var(--leaf-500)')}
        ${statCard('[ 02 ]', stats.mealsToday, 'Daily portions', 'var(--gold-500)')}
        ${statCard('[ 03 ]', stats.expiringSoon, 'Messes expiring', 'var(--rust-500)')}
        ${statCard('[ 04 ]', formatCurrency(stats.collectionsMonth), 'Ledger total', 'var(--leaf-700)', true)}
      </div>

      <!-- ── Main Grid ──────────────────────────────────────── -->
      <div class="home-grid">

        <!-- Today's Specials Hero Card -->
        <div class="home-grid__full">
          ${renderTodayHero(weekday, menu)}
        </div>

        <!-- Needs Attention (Log book style) -->
        <div class="card card--ledger">
          <div class="card__header" style="display:flex;align-items:center;justify-content:between;gap:var(--sp-3);">
            <h2 class="card-title-serif">Messes Needing Care</h2>
            ${attention.length > 0 ? `<span class="badge badge--expiring">${attention.length}</span>` : ''}
          </div>
          <div class="card__body" style="padding-top:0;">
            ${attention.length === 0
              ? `<div class="empty-state" style="padding:var(--sp-8) 0 var(--sp-4);">
                   <div class="empty-state__icon">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                       <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                     </svg>
                   </div>
                   <div class="empty-state__title" style="font-family:var(--font-display);font-weight:600;">All records neat</div>
                   <div class="empty-state__text">No customer messes need attention right now.</div>
                 </div>`
              : attention.map(c => attentionItem(c)).join('')
            }
          </div>
        </div>

        <!-- Quick Operations -->
        <div class="card card--ledger">
          <div class="card__header">
            <h2 class="card-title-serif">Quick Operations</h2>
          </div>
          <div class="card__body" style="display:flex;flex-direction:column;gap:var(--sp-3);">
            <button class="btn btn--primary w-full" id="qa-add-customer" style="justify-content:flex-start;gap:var(--sp-3);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add New Customer</span>
            </button>
            <button class="btn btn--secondary w-full" id="qa-schedule" style="justify-content:flex-start;gap:var(--sp-3);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
              <span>Ledger &amp; Attendance</span>
            </button>
            <button class="btn btn--ghost w-full" id="qa-menu" style="justify-content:flex-start;gap:var(--sp-3);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              <span>Update Weekly Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tilt on stat cards (desktop)
  container.querySelectorAll('.stat-card').forEach(setupCardTilt);

  // Quick actions
  container.querySelector('#qa-add-customer').addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('bhojana:navigate', { detail: { page: 'customers', action: 'add' } }))
  );
  container.querySelector('#qa-schedule').addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('bhojana:navigate', { detail: { page: 'schedule' } }))
  );
  container.querySelector('#qa-menu').addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('bhojana:navigate', { detail: { page: 'menu' } }))
  );
}

/* ── Sub-renderers ───────────────────────────────────────── */

function renderGreetingTitle() {
  const h = new Date().getHours();
  let greet = 'Good morning';
  let icon = '☀️';
  let msg = "Let's get today's meals prepared and sorted.";

  if (h >= 12 && h < 17) {
    greet = 'Good afternoon';
    icon = '🌤️';
    msg = 'Hope the lunch deliveries went smoothly.';
  } else if (h >= 17 && h < 22) {
    greet = 'Good evening';
    icon = '🌙';
    msg = 'Ready for the evening dinner deliveries?';
  } else if (h >= 22 || h < 4) {
    greet = 'Good night';
    icon = '✨';
    msg = "Prepping for tomorrow's kitchen schedule.";
  }

  const parts = greet.split(' ');
  return {
    title: `${parts[0]} <em>${parts[1]}</em>.`,
    icon: icon,
    message: msg
  };
}

function statCard(indexStr, value, label, accentColor) {
  return `
    <div class="stat-card" style="--card-accent: ${accentColor}">
      <div class="stat-card__index">${indexStr}</div>
      <div class="stat-card__value">${value}</div>
      <div class="stat-card__label">${label}</div>
    </div>
  `;
}

function renderTodayHero(weekday, menu) {
  const specialBadge = menu.isSpecial
    ? `<span class="badge badge-special-hero">✦ ${escapeHtml(menu.label)} Overrides</span>`
    : '';

  return `
    <div class="today-hero">
      <div class="today-hero__body">
        <div class="today-hero__eyebrow" style="display:flex;align-items:center;gap:var(--sp-2);">
          <span>${weekday}'s Menu</span>${specialBadge}
        </div>
        <div class="today-hero__title">Today’s <em>Specials</em></div>
        <div class="today-hero__menu">
          ${['breakfast', 'lunch', 'dinner'].map(meal => `
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

function attentionItem(c) {
  const colorMap = {
    expiring: 'var(--gold-500)',
    expired:  'var(--rust-500)',
    soon:     'var(--leaf-400)',
  };
  const descMap = {
    expiring: `${daysLeftInPlan(c)} days remaining`,
    expired:  'Mess ended',
    soon:     `Starts ${formatDate(c.start_date)}`,
  };

  return `
    <div class="attention-item">
      <span class="attention-item__dot" style="background:${colorMap[c.status]};"></span>
      <div style="flex:1;min-width:0;">
        <div class="attention-item__name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.name)}</div>
        <div class="attention-item__desc">${escapeHtml(c.id)} &middot; ${descMap[c.status] || ''}</div>
      </div>
      ${getStatusBadgeHtml(c.status)}
    </div>
  `;
}

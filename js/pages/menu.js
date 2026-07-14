/**
 * BHOJANA — Menu Page (menu.js)
 */

import * as DB from '../db.js';
import { showToast } from '../components/toast.js';
import { createModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { formatDate, formatDateShort, escapeHtml } from '../utils.js';
import { icons } from '../icons.js';

const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEALS    = ['breakfast','lunch','dinner'];

export function renderMenu(container) {
  container.innerHTML = `
    <div class="page-container page-enter">
      <div class="section-header">
        <div>
          <div class="section-header__title">Weekly Menu</div>
          <div class="section-header__sub">Click any meal to edit</div>
        </div>
      </div>
      <div class="menu-days-grid" id="menu-days-grid"></div>

      <div class="section-header mt-6">
        <div>
          <div class="section-header__title">Special Days</div>
          <div class="section-header__sub">Override the weekly menu for holidays, feasts & events</div>
        </div>
        <button class="btn btn--primary btn--sm" id="add-special-day">＋ Add</button>
      </div>
      <div id="special-days-list"></div>
    </div>
  `;

  renderMenuGrid(container);
  renderSpecialDays(container);

  container.querySelector('#add-special-day').addEventListener('click', () => {
    openSpecialDayModal(null, container);
  });
}

/* ── Weekly Menu Grid ────────────────────────────────────── */
function renderMenuGrid(container) {
  const menuRows = DB.getWeeklyMenu();
  // Build lookup: {Monday: {breakfast:'...', lunch:'...', dinner:'...'}}
  const menuMap = {};
  menuRows.forEach(r => {
    if (!menuMap[r.weekday]) menuMap[r.weekday] = {};
    menuMap[r.weekday][r.meal] = r.name;
  });

  const grid = container.querySelector('#menu-days-grid');
  grid.innerHTML = WEEKDAYS.map(day => `
    <div class="menu-day-card" data-day="${day}">
      <div class="menu-day-card__header">
        <div class="day-name">${day}</div>
      </div>
      <div class="menu-day-card__body">
        ${MEALS.map(meal => {
          const val = menuMap[day]?.[meal] || '';
          return `
            <div class="menu-meal-row" data-day="${day}" data-meal="${meal}">
              <span class="menu-meal-row__label">${meal}</span>
              <span class="menu-meal-row__value meal-text" data-day="${day}" data-meal="${meal}">${escapeHtml(val) || '<span class="text-faint">—</span>'}</span>
              <button class="btn btn--ghost btn--sm btn--icon edit-meal-btn" aria-label="Edit ${meal} for ${day}" data-day="${day}" data-meal="${meal}" style="flex-shrink:0;width:32px;height:32px;padding:0;">${icons.edit}</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Set up tilt on cards
  import('../utils.js').then(({ setupCardTilt }) => {
    grid.querySelectorAll('.menu-day-card').forEach(setupCardTilt);
  });

  // Edit buttons → inline edit
  grid.querySelectorAll('.edit-meal-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const { day, meal } = btn.dataset;
      openMealEditModal(day, meal, menuMap[day]?.[meal] || '', container);
    });
  });
}

function openMealEditModal(day, meal, currentValue, container) {
  const modal = createModal({
    id: 'meal-edit-modal',
    title: `Edit ${meal.charAt(0).toUpperCase() + meal.slice(1)} — ${day}`,
    body: `
      <div class="form-group">
        <label class="form-label" for="meal-input">What's on the menu?</label>
        <input
          id="meal-input"
          class="form-input"
          type="text"
          value="${escapeHtml(currentValue)}"
          placeholder="e.g. Puttu &amp; Kadala Curry"
          maxlength="120"
        />
        <div class="form-hint">Leave blank to clear this meal slot.</div>
      </div>
    `,
    footer: `
      <button class="btn btn--ghost" id="meal-cancel">Cancel</button>
      <button class="btn btn--primary" id="meal-save">Save</button>
    `
  });

  modal.open();

  const input = document.getElementById('meal-input');
  input.select();

  document.getElementById('meal-cancel').addEventListener('click', modal.close);
  document.getElementById('meal-save').addEventListener('click', () => {
    const newVal = input.value.trim();
    DB.setMenuitem(day, meal, newVal);
    showToast(`${day} ${meal} updated`, 'success');
    modal.close();
    renderMenuGrid(container);
  });

  // Save on Enter
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('meal-save').click();
  });
}

/* ── Special Days ────────────────────────────────────────── */
function renderSpecialDays(container) {
  const days = DB.getSpecialDays();
  const list = container.querySelector('#special-days-list');

  if (days.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding:var(--sp-8) 0 var(--sp-4);">
        <div class="empty-state__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </div>
        <div class="empty-state__title" style="font-family:var(--font-display);font-weight:600;">No special days yet</div>
        <div class="empty-state__text">Add Onam, Vishu, festivals, or any day with a different menu.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = `<div class="flex flex-col gap-3">${days.map(sd => specialDayCard(sd)).join('')}</div>`;

  list.querySelectorAll('.special-day-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sd = days.find(d => d.id === btn.dataset.id);
      if (sd) openSpecialDayModal(sd, container);
    });
  });

  list.querySelectorAll('.special-day-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await showConfirm({
        title: 'Delete Special Day',
        message: 'This will remove the menu override for this date.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (ok) {
        DB.deleteSpecialDay(btn.dataset.id);
        showToast('Special day removed', 'success');
        renderSpecialDays(container);
      }
    });
  });
}

function specialDayCard(sd) {
  const d = new Date(sd.date + 'T00:00:00');
  const dayNum   = d.getDate();
  const monthStr = d.toLocaleDateString('en-IN', { month: 'short' });
  const yearStr  = d.getFullYear();
  const meals    = [sd.breakfast, sd.lunch, sd.dinner].filter(Boolean).join(' · ') || '—';

  return `
    <div class="special-day-card">
      <div class="flex-none text-center" style="min-width:48px;">
        <div class="special-day-card__date">${dayNum}</div>
        <div class="special-day-card__month">${monthStr}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-faint);">${yearStr}</div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="special-day-card__label">${escapeHtml(sd.label)}</div>
        <div class="special-day-card__meals">${escapeHtml(meals)}</div>
      </div>
      <div class="flex gap-2 flex-none">
        <button class="btn btn--ghost btn--sm btn--icon special-day-edit-btn" data-id="${sd.id}" aria-label="Edit" title="Edit">${icons.edit}</button>
        <button class="btn btn--danger btn--sm btn--icon special-day-delete-btn" data-id="${sd.id}" aria-label="Delete" title="Delete">${icons.trash}</button>
      </div>
    </div>
  `;
}

function openSpecialDayModal(sd, container) {
  const isEdit = !!sd;
  const modal = createModal({
    id: 'special-day-modal',
    title: isEdit ? 'Edit Special Day' : 'Add Special Day',
    body: `
      <div class="form-group">
        <label class="form-label form-label--required" for="sd-date">Date</label>
        <input id="sd-date" class="form-input" type="date" value="${sd?.date || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="sd-label">Event Name</label>
        <input id="sd-label" class="form-input" type="text" value="${escapeHtml(sd?.label || '')}" placeholder="e.g. Onam Sadhya, Christmas Special" maxlength="80" />
      </div>
      <div class="kasavu-rule kasavu-rule--card"></div>
      <div class="form-group">
        <label class="form-label" for="sd-breakfast">Breakfast</label>
        <input id="sd-breakfast" class="form-input" type="text" value="${escapeHtml(sd?.breakfast || '')}" placeholder="Optional" maxlength="120" />
      </div>
      <div class="form-group">
        <label class="form-label" for="sd-lunch">Lunch</label>
        <input id="sd-lunch" class="form-input" type="text" value="${escapeHtml(sd?.lunch || '')}" placeholder="Optional" maxlength="120" />
      </div>
      <div class="form-group">
        <label class="form-label" for="sd-dinner">Dinner</label>
        <input id="sd-dinner" class="form-input" type="text" value="${escapeHtml(sd?.dinner || '')}" placeholder="Optional" maxlength="120" />
      </div>
    `,
    footer: `
      <button class="btn btn--ghost" id="sd-cancel">Cancel</button>
      <button class="btn btn--primary" id="sd-save">${isEdit ? 'Save Changes' : 'Add Special Day'}</button>
    `
  });

  modal.open();

  document.getElementById('sd-cancel').addEventListener('click', modal.close);
  document.getElementById('sd-save').addEventListener('click', () => {
    const date  = document.getElementById('sd-date').value.trim();
    const label = document.getElementById('sd-label').value.trim();
    if (!date || !label) {
      showToast('Date and Event Name are required', 'error');
      return;
    }
    const data = {
      date,
      label,
      breakfast: document.getElementById('sd-breakfast').value.trim(),
      lunch:     document.getElementById('sd-lunch').value.trim(),
      dinner:    document.getElementById('sd-dinner').value.trim(),
    };
    if (isEdit) {
      DB.updateSpecialDay(sd.id, data);
      showToast('Special day updated', 'success');
    } else {
      DB.addSpecialDay(data);
      showToast('Special day added', 'success');
    }
    modal.close();
    renderSpecialDays(container);
  });
}

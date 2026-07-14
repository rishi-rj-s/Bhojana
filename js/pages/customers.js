/**
 * BHOJANA — Customers Page (customers.js)
 */

import * as DB from '../db.js';
import {
  todayISO, formatDate, formatCurrency, getPlanLabel,
  getStatusBadgeHtml, getCustomerStatus, getPlanEndDate,
  daysLeftInPlan, getInitials, calcBalance, escapeHtml,
  debounce, setupCardTilt
} from '../utils.js';
import { showToast } from '../components/toast.js';
import { createModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';

const PLAN_TYPES = [
  { value: 'full',           label: 'Full Day (Breakfast + Lunch + Dinner)' },
  { value: 'lunch_dinner',   label: 'Lunch & Dinner' },
  { value: 'lunch_only',     label: 'Lunch Only' },
  { value: 'breakfast_only', label: 'Breakfast Only' },
  { value: 'dinner_only',    label: 'Dinner Only' },
];

let searchQuery = '';

export function renderCustomers(container, opts = {}) {
  container.innerHTML = `
    <div class="page-container page-enter">
      <div class="section-header">
        <div class="section-header__title">Customers</div>
        <button class="btn btn--primary btn--sm" id="add-customer-btn">＋ Add Customer</button>
      </div>

      <!-- Search -->
      <div class="search-bar mb-4">
        <span class="search-bar__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          id="customer-search"
          class="search-bar__input"
          type="search"
          placeholder="Search by name or phone…"
          value="${escapeHtml(searchQuery)}"
          aria-label="Search customers"
        />
      </div>

      <div id="customers-list" class="customers-list"></div>
    </div>
  `;

  renderList(container);

  // Add customer button
  container.querySelector('#add-customer-btn').addEventListener('click', () => {
    openCustomerModal(null, container);
  });

  // Auto-open add if navigated with action
  if (opts.action === 'add') {
    openCustomerModal(null, container);
  }

  // Search
  const searchInput = container.querySelector('#customer-search');
  searchInput.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim();
    renderList(container);
  }, 200));
}

function renderList(container) {
  const today     = todayISO();
  const allCustomers = DB.getCustomers();
  const query = searchQuery.toLowerCase();

  const filtered = query
    ? allCustomers.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.id.toLowerCase().includes(query)
      )
    : allCustomers;

  const list = container.querySelector('#customers-list');

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">👥</div>
        <div class="empty-state__title">${searchQuery ? 'No results found' : 'No customers yet'}</div>
        <div class="empty-state__text">${searchQuery ? 'Try a different name or phone number.' : 'Add your first customer to get started.'}</div>
        ${!searchQuery ? `<button class="btn btn--primary mt-4" id="empty-add-btn">＋ Add Customer</button>` : ''}
      </div>
    `;
    container.querySelector('#empty-add-btn')?.addEventListener('click', () => openCustomerModal(null, container));
    return;
  }

  // Sort: active first, then expiring, then soon, then expired
  const statusOrder = { active: 0, expiring: 1, soon: 2, expired: 3 };
  filtered.sort((a, b) => {
    const sa = getCustomerStatus(a, today);
    const sb = getCustomerStatus(b, today);
    return (statusOrder[sa] ?? 9) - (statusOrder[sb] ?? 9);
  });

  list.innerHTML = filtered.map(c => customerCard(c, today)).join('');

  // Setup interactions
  list.querySelectorAll('.customer-card').forEach(card => {
    setupCardTilt(card);
    card.addEventListener('click', e => {
      if (e.target.closest('.customer-card__actions')) return;
      openCustomerModal(DB.getCustomer(card.dataset.id), container);
    });
  });

  list.querySelectorAll('.customer-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openCustomerModal(DB.getCustomer(btn.dataset.id), container);
    });
  });

  list.querySelectorAll('.customer-delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const c = DB.getCustomer(btn.dataset.id);
      const ok = await showConfirm({
        title: `Delete ${c?.name || 'Customer'}?`,
        message: 'All attendance records will also be deleted. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (ok) {
        DB.deleteCustomer(btn.dataset.id);
        showToast('Customer deleted', 'success');
        renderList(container);
      }
    });
  });

  list.querySelectorAll('.customer-schedule-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('bhojana:navigate', {
        detail: { page: 'schedule', customerId: btn.dataset.id }
      }));
    });
  });
}

function customerCard(c, today) {
  const status   = getCustomerStatus(c, today);
  const endDate  = getPlanEndDate(c);
  const allAtt   = DB.getAttendanceForCustomer(c.id);
  const hadCount = allAtt.filter(a => a.status === 'had').length;
  const balance  = calcBalance(c, hadCount);
  const balClass = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero';

  return `
    <div class="customer-card" data-id="${c.id}" role="button" tabindex="0" aria-label="View ${escapeHtml(c.name)}">
      <div class="customer-card__avatar">${getInitials(c.name)}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="customer-card__id">${c.id}</span>
          ${getStatusBadgeHtml(status)}
        </div>
        <div class="customer-card__name truncate">${escapeHtml(c.name)}</div>
        <div class="customer-card__meta truncate">${escapeHtml(c.phone)} · ${getPlanLabel(c.plan_type)}</div>
        <div class="customer-card__meta">${formatDate(c.start_date)} → ${formatDate(endDate)}</div>
      </div>
      <div class="flex flex-col items-end gap-2 flex-none">
        <div class="customer-card__balance customer-card__balance--${balClass}">${formatCurrency(balance)}</div>
        <div class="customer-card__actions flex gap-2">
          <button class="btn btn--ghost btn--sm customer-schedule-btn" data-id="${c.id}" aria-label="Schedule">📅</button>
          <button class="btn btn--ghost btn--sm customer-edit-btn" data-id="${c.id}" aria-label="Edit">✎</button>
          <button class="btn btn--danger btn--sm customer-delete-btn" data-id="${c.id}" aria-label="Delete">✕</button>
        </div>
      </div>
    </div>
  `;
}

/* ── Customer Modal (Add/Edit) ───────────────────────────── */
function openCustomerModal(customer, container) {
  const isEdit = !!customer;
  const c = customer || {};

  const planOptions = PLAN_TYPES.map(pt =>
    `<option value="${pt.value}" ${c.plan_type === pt.value ? 'selected' : ''}>${pt.label}</option>`
  ).join('');

  const modal = createModal({
    id: 'customer-modal',
    title: isEdit ? `Edit — ${c.name}` : 'Add New Customer',
    body: `
      <div class="form-group">
        <label class="form-label form-label--required" for="c-name">Full Name</label>
        <input id="c-name" class="form-input" type="text" value="${escapeHtml(c.name || '')}" placeholder="e.g. Rajan Nair" maxlength="80" autocomplete="name" />
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="c-phone">Phone</label>
        <input id="c-phone" class="form-input" type="tel" value="${escapeHtml(c.phone || '')}" placeholder="10-digit number" maxlength="15" autocomplete="tel" />
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="c-plan">Meal Plan</label>
        <select id="c-plan" class="form-select">
          ${planOptions}
        </select>
      </div>
      <div class="flex gap-4">
        <div class="form-group flex-1">
          <label class="form-label form-label--required" for="c-cost">Daily Cost (₹)</label>
          <input id="c-cost" class="form-input" type="number" min="0" step="0.5" value="${c.daily_cost || ''}" placeholder="120" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label form-label--required" for="c-advance">Advance Paid (₹)</label>
          <input id="c-advance" class="form-input" type="number" min="0" step="1" value="${c.advance || ''}" placeholder="3000" />
        </div>
      </div>
      <div class="flex gap-4">
        <div class="form-group flex-1">
          <label class="form-label form-label--required" for="c-start">Start Date</label>
          <input id="c-start" class="form-input" type="date" value="${c.start_date || todayISO()}" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label form-label--required" for="c-duration">Duration (days)</label>
          <input id="c-duration" class="form-input" type="number" min="1" max="365" value="${c.duration_days || 30}" />
        </div>
      </div>
      <div id="c-preview" class="form-hint" style="padding: var(--sp-2) var(--sp-3); background: var(--leaf-50); border-radius: var(--radius-sm);"></div>
    `,
    footer: `
      <button class="btn btn--ghost" id="c-cancel">Cancel</button>
      <button class="btn btn--primary" id="c-save">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
    `
  });

  modal.open();

  // Live preview
  const updatePreview = () => {
    const cost     = parseFloat(document.getElementById('c-cost')?.value)     || 0;
    const advance  = parseFloat(document.getElementById('c-advance')?.value)  || 0;
    const duration = parseInt(document.getElementById('c-duration')?.value)   || 0;
    const start    = document.getElementById('c-start')?.value;
    const preview  = document.getElementById('c-preview');
    if (!preview) return;
    if (cost && duration && start) {
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + duration - 1);
      const endStr = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const total = cost * duration;
      preview.innerHTML = `Ends <strong>${endStr}</strong> · Total: <strong>${formatCurrency(total)}</strong> · Advance covers <strong>${Math.floor(advance / cost)} days</strong>`;
    } else {
      preview.innerHTML = '';
    }
  };

  ['c-cost','c-advance','c-start','c-duration'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });
  updatePreview();

  document.getElementById('c-cancel').addEventListener('click', modal.close);
  document.getElementById('c-save').addEventListener('click', () => {
    const name     = document.getElementById('c-name').value.trim();
    const phone    = document.getElementById('c-phone').value.trim();
    const plan     = document.getElementById('c-plan').value;
    const cost     = parseFloat(document.getElementById('c-cost').value);
    const advance  = parseFloat(document.getElementById('c-advance').value);
    const start    = document.getElementById('c-start').value;
    const duration = parseInt(document.getElementById('c-duration').value);

    if (!name || !phone || !plan || isNaN(cost) || isNaN(advance) || !start || isNaN(duration)) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const data = { name, phone, plan_type: plan, daily_cost: cost, advance, start_date: start, duration_days: duration };

    if (isEdit) {
      DB.updateCustomer(c.id, data);
      showToast('Customer updated', 'success');
    } else {
      const newId = DB.addCustomer(data);
      showToast(`Customer added — ${newId}`, 'success');
    }

    modal.close();
    renderList(container);
  });
}

/**
 * BHOJANA — Schedule Page (schedule.js)
 * Per-customer monthly attendance calendar + report card.
 */

import * as DB from '../db.js';
import {
  todayISO, formatDate, formatCurrency, formatMonthYear,
  getDaysInMonth, getFirstWeekdayOfMonth, isDateInPlan,
  isDateToday, getPlanEndDate, getInitials, calcBalance,
  getCustomerStatus, getStatusBadgeHtml, escapeHtml,
  debounce, animateBalanceTick
} from '../utils.js';
import { showToast } from '../components/toast.js';
import { icons }     from '../icons.js';

let selectedCustomerId = null;
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth() + 1; // 1-indexed

export function renderSchedule(container, opts = {}) {
  if (opts.customerId) selectedCustomerId = opts.customerId;

  const customers = DB.getCustomers();

  container.innerHTML = `
    <div class="page-container page-enter">
      <div class="section-header">
        <div class="section-header__title">Attendance</div>
        <div class="section-header__sub">Tap past days to toggle attendance</div>
      </div>

      <div class="schedule-layout">
        <!-- Customer selector -->
        <div class="schedule-customer-panel">
          <div class="card__header" style="padding:var(--sp-3) var(--sp-4);border-bottom:1px solid var(--color-border);">
            <div class="search-bar" style="margin:0;">
              <span class="search-bar__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input id="sched-search" class="search-bar__input" type="search" placeholder="Search…" style="padding-left:calc(14px + var(--sp-4) + var(--sp-2));" aria-label="Search customers" />
            </div>
          </div>
          <div class="schedule-customer-list" id="sched-customer-list"></div>
        </div>

        <!-- Calendar + report -->
        <div class="schedule-calendar-panel" id="sched-calendar-panel">
          ${customers.length === 0
            ? `<div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">No customers</div><div class="empty-state__text">Add customers first, then track their attendance here.</div></div>`
            : `<div class="empty-state"><div class="empty-state__icon">👈</div><div class="empty-state__title">Select a customer</div><div class="empty-state__text">Choose a customer from the list to view their calendar.</div></div>`
          }
        </div>
      </div>
    </div>
  `;

  renderCustomerList(container, customers);

  // Auto-select first or specified customer
  if (!selectedCustomerId && customers.length > 0) {
    selectedCustomerId = customers[0].id;
  }
  if (selectedCustomerId) {
    selectCustomer(selectedCustomerId, container, customers);
  }

  // Search
  container.querySelector('#sched-search').addEventListener('input', debounce(e => {
    const q = e.target.value.toLowerCase();
    const filtered = q
      ? customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      : customers;
    renderCustomerList(container, filtered);
    // Re-highlight selected
    highlightSelected(container);
  }, 200));
}

function renderCustomerList(container, customers) {
  const list = container.querySelector('#sched-customer-list');
  if (!list) return;

  if (customers.length === 0) {
    list.innerHTML = `<div class="text-mid text-sm p-4">No customers found</div>`;
    return;
  }

  const today = todayISO();
  list.innerHTML = customers.map(c => {
    const status = getCustomerStatus(c, today);
    return `
      <div class="customer-select-row${c.id === selectedCustomerId ? ' is-active' : ''}"
           data-id="${c.id}" role="button" tabindex="0" aria-label="${escapeHtml(c.name)}">
        <div class="customer-card__avatar" style="width:36px;height:36px;font-size:var(--text-sm);">${getInitials(c.name)}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm weight-semibold truncate">${escapeHtml(c.name)}</div>
          <div class="text-xs text-mid">${c.id}</div>
        </div>
        ${getStatusBadgeHtml(status)}
      </div>
    `;
  }).join('');

  list.querySelectorAll('.customer-select-row').forEach(row => {
    row.addEventListener('click', () => {
      selectedCustomerId = row.dataset.id;
      selectCustomer(selectedCustomerId, container, customers);
      highlightSelected(container);
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') row.click();
    });
  });
}

function highlightSelected(container) {
  container.querySelectorAll('.customer-select-row').forEach(row => {
    row.classList.toggle('is-active', row.dataset.id === selectedCustomerId);
  });
}

function selectCustomer(customerId, container, customers) {
  const customer = customers.find(c => c.id === customerId) || DB.getCustomer(customerId);
  if (!customer) return;
  renderCalendarPanel(container, customer);
}

/* ── Calendar Panel ──────────────────────────────────────── */
function renderCalendarPanel(container, customer) {
  const panel = container.querySelector('#sched-calendar-panel');
  if (!panel) return;

  const attRows = DB.getAttendanceForMonth(customer.id, viewYear, viewMonth);
  const attMap  = {};
  attRows.forEach(r => { attMap[r.date] = r.status; });

  const allAtt  = DB.getAttendanceForCustomer(customer.id);
  const hadCount = allAtt.filter(a => a.status === 'had').length;
  const balance  = calcBalance(customer, hadCount);

  // Month stats for this customer
  const monthHad     = attRows.filter(a => a.status === 'had').length;
  const monthSkipped = attRows.filter(a => a.status === 'skipped').length;

  panel.innerHTML = `
    <!-- Month navigation -->
    <div class="card">
      <div class="card__body">
        <div class="month-nav" style="margin-bottom:var(--sp-4);">
          <button class="month-nav__btn" id="prev-month" aria-label="Previous month">${icons.chevronLeft}</button>
          <div class="month-nav__title">${formatMonthYear(viewYear, viewMonth)}</div>
          <button class="month-nav__btn" id="next-month" aria-label="Next month">${icons.chevronRight}</button>
        </div>

        <!-- Weekday headers -->
        <div class="calendar-grid">
          ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d =>
            `<div class="calendar-weekday">${d}</div>`
          ).join('')}
          ${buildCalendarDays(customer, viewYear, viewMonth, attMap)}
        </div>

        <!-- Legend -->
        <div class="flex gap-4 flex-wrap mt-4" style="font-size:var(--text-xs);color:var(--color-text-mid);">
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--leaf-500);display:inline-block;"></span> Had food</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--rust-500);display:inline-block;"></span> Skipped</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;border-radius:3px;border:1.5px solid var(--gold-500);display:inline-block;"></span> Today</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--ink-100);display:inline-block;opacity:0.45;"></span> Outside plan</span>
        </div>
      </div>
    </div>

    <!-- Report card -->
    <div class="report-card" id="report-card-${customer.id}">
      <div class="report-card__header">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--sp-3);">
          <div>
            <div class="report-card__title">${escapeHtml(customer.name)}</div>
            <div class="report-card__period">${customer.id} · ${formatDate(customer.start_date)} → ${formatDate(getPlanEndDate(customer))}</div>
          </div>
          ${getStatusBadgeHtml(getCustomerStatus(customer, todayISO()))}
        </div>
      </div>

      <div class="report-stats">
        <div class="report-stat">
          <div class="report-stat__value" style="color:var(--leaf-500);">${monthHad}</div>
          <div class="report-stat__label">Had (this month)</div>
        </div>
        <div class="report-stat">
          <div class="report-stat__value" style="color:var(--rust-500);">${monthSkipped}</div>
          <div class="report-stat__label">Skipped</div>
        </div>
        <div class="report-stat">
          <div class="report-stat__value">${hadCount}</div>
          <div class="report-stat__label">Had (total)</div>
        </div>
      </div>

      <div class="report-balance">
        <div>
          <div class="report-balance__label">Advance Balance</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-faint);">
            ₹${customer.advance} − (${hadCount} × ₹${customer.daily_cost})
          </div>
        </div>
        <div class="report-balance__value report-balance__value--${balance >= 0 ? 'positive' : 'negative'}" id="balance-value">
          ${formatCurrency(balance)}
        </div>
      </div>
    </div>

    <!-- Export actions -->
    <div class="report-export-actions flex gap-3">
      <button class="btn btn--ghost flex-1" id="export-pdf">🖨 Export as PDF</button>
      <button class="btn btn--ghost flex-1" id="export-img">🖼 Download Image</button>
    </div>
  `;

  // Month nav
  panel.querySelector('#prev-month').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 1) { viewMonth = 12; viewYear--; }
    renderCalendarPanel(container, customer);
  });
  panel.querySelector('#next-month').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 12) { viewMonth = 1; viewYear++; }
    renderCalendarPanel(container, customer);
  });

  // Day cell click
  panel.querySelectorAll('.cal-day:not(.cal-day--locked):not(.cal-day--empty)').forEach(cell => {
    cell.addEventListener('click', () => {
      const date    = cell.dataset.date;
      const current = cell.dataset.status || '';

      // Cycle: none → had → skipped → none
      let next = current === '' ? 'had' : current === 'had' ? 'skipped' : '';

      DB.setAttendance(customer.id, date, next || null);

      // Update cell visually
      cell.dataset.status = next;
      cell.classList.remove('cal-day--had', 'cal-day--skipped');
      if (next === 'had')     cell.classList.add('cal-day--had');
      if (next === 'skipped') cell.classList.add('cal-day--skipped');

      // Update balance with tick animation
      const allAttNow  = DB.getAttendanceForCustomer(customer.id);
      const newHad     = allAttNow.filter(a => a.status === 'had').length;
      const newBalance = calcBalance(customer, newHad);
      const balEl = panel.querySelector('#balance-value');
      if (balEl) {
        const newText = formatCurrency(newBalance);
        animateBalanceTick(balEl, newText, balEl.textContent);
        balEl.className = `report-balance__value report-balance__value--${newBalance >= 0 ? 'positive' : 'negative'}`;
      }

      // Update month stats
      const updatedAtt = DB.getAttendanceForMonth(customer.id, viewYear, viewMonth);
      const mHad = updatedAtt.filter(a => a.status === 'had').length;
      const mSkip = updatedAtt.filter(a => a.status === 'skipped').length;
      panel.querySelectorAll('.report-stat__value')[0].textContent = mHad;
      panel.querySelectorAll('.report-stat__value')[1].textContent = mSkip;
      panel.querySelectorAll('.report-stat__value')[2].textContent = newHad;

      showToast(
        next === 'had' ? 'Marked: Had food ✓' : next === 'skipped' ? 'Marked: Skipped' : 'Attendance cleared',
        next ? 'success' : 'info'
      );
    });
  });

  // Export as PDF
  panel.querySelector('#export-pdf').addEventListener('click', () => {
    window.print();
  });

  // Download as Image
  panel.querySelector('#export-img').addEventListener('click', async () => {
    const reportEl = document.getElementById(`report-card-${customer.id}`);
    if (!window.html2canvas) {
      showToast('Image export not available', 'error');
      return;
    }
    try {
      showToast('Generating image…', 'info');
      const canvas = await window.html2canvas(reportEl, {
        backgroundColor: '#FFFDF9',
        scale: 2,
        useCORS: false,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `bhojana-${customer.id}-${viewYear}-${String(viewMonth).padStart(2,'0')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Image downloaded!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Image export failed', 'error');
    }
  });
}

/* ── Calendar day builder ────────────────────────────────── */
function buildCalendarDays(customer, year, month, attMap) {
  const today      = todayISO();
  const daysCount  = getDaysInMonth(year, month);
  const firstDay   = getFirstWeekdayOfMonth(year, month); // 0=Sun..6=Sat
  const planEnd    = getPlanEndDate(customer);

  let html = '';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day cal-day--empty" aria-hidden="true"></div>`;
  }

  for (let d = 1; d <= daysCount; d++) {
    const isoDate = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = isDateToday(isoDate);
    const inPlan  = isDateInPlan(customer, isoDate);
    const isFuture = isoDate > today;
    const status  = attMap[isoDate] || '';

    let classes = 'cal-day';
    let attrs   = `data-date="${isoDate}" data-status="${status}"`;
    let ariaLabel = `${d}: `;

    if (!inPlan || isFuture) {
      classes += ' cal-day--locked';
      ariaLabel += !inPlan ? 'outside plan' : 'future';
    } else {
      if (status === 'had')     { classes += ' cal-day--had';     ariaLabel += 'had food'; }
      else if (status === 'skipped') { classes += ' cal-day--skipped'; ariaLabel += 'skipped'; }
      else                           { ariaLabel += 'not logged'; }
    }

    if (isToday) classes += ' cal-day--today';

    html += `
      <div class="${classes}" ${attrs}
           role="${!inPlan || isFuture ? 'presentation' : 'button'}"
           aria-label="${ariaLabel}"
           ${!inPlan || isFuture ? 'aria-hidden="true"' : 'tabindex="0"'}>
        ${d}
      </div>
    `;
  }

  return html;
}

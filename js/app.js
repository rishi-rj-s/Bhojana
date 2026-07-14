/**
 * BHOJANA — App Shell (app.js)
 * Router, boot sequence, SW registration, install prompts.
 */

import { initDB, resetDB, getSetting, setSetting } from './db.js';
import { renderHome }      from './pages/home.js';
import { renderMenu }      from './pages/menu.js';
import { renderCustomers } from './pages/customers.js';
import { renderSchedule }  from './pages/schedule.js';
import { showToast }       from './components/toast.js';
import { showConfirm }     from './components/confirm.js';
import { isIOS, isInStandaloneMode } from './utils.js';
import { icons, iconLg }  from './icons.js';

/* ── State ───────────────────────────────────────────────── */
let currentPage = 'home';
let deferredInstallPrompt = null;

/* ── Router ──────────────────────────────────────────────── */
const PAGES = {
  home:      renderHome,
  menu:      renderMenu,
  customers: renderCustomers,
  schedule:  renderSchedule,
};

const PAGE_LABELS = {
  home:      'Home',
  menu:      'Menu',
  customers: 'Customers',
  schedule:  'Attendance',
};

function navigate(page, opts = {}) {
  if (!PAGES[page]) return;
  currentPage = page;

  // Update nav active state (sidebar + bottom)
  document.querySelectorAll('.nav-item, .bottom-nav__item').forEach(el => {
    el.classList.toggle('is-active', el.dataset.page === page);
  });

  // Update URL hash (for bookmarking / back button)
  history.replaceState(null, '', `#${page}`);

  // Render page
  const main = document.getElementById('main-content');
  main.scrollTop = 0;
  PAGES[page](main, opts);
}

/* ── Boot Sequence ───────────────────────────────────────── */
async function boot() {
  try {
    await initDB();
  } catch (err) {
    console.error('DB init failed:', err);
    // Show error in loading overlay
    const loadText = document.querySelector('.loading-text');
    if (loadText) loadText.textContent = 'Failed to load database. Please refresh.';
    return;
  }

  // Hide loading overlay
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('is-hiding');
    setTimeout(() => overlay.remove(), 500);
  }

  // Determine initial page from hash
  const hash = window.location.hash.slice(1);
  const startPage = PAGES[hash] ? hash : 'home';
  navigate(startPage);

  // Setup iOS install nudge
  setupInstallNudge();
}

/* ── App Init ────────────────────────────────────────────── */
function initApp() {
  buildNavigation();
  setupEventListeners();
  setupServiceWorker();
  setupInstallPrompt();
  boot();
}

/* ── Navigation Builder ──────────────────────────────────── */
function buildNavigation() {
  const navItems = Object.entries(PAGES).map(([page]) => ({
    page, label: PAGE_LABELS[page], icon: getNavIcon(page)
  }));

  // Sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const nav = sidebar.querySelector('#sidebar-nav');
    if (nav) {
      nav.innerHTML = navItems.map(({ page, label, icon }) => `
        <button class="nav-item" data-page="${page}" aria-label="${label}" id="sidebar-nav-${page}">
          <span class="nav-item__icon">${icon}</span>
          <span class="nav-item__label">${label}</span>
        </button>
      `).join('');
      nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.page));
      });
    }
  }

  // Bottom nav
  const bottomNav = document.getElementById('bottom-nav-items');
  if (bottomNav) {
    bottomNav.innerHTML = navItems.map(({ page, label, icon }) => `
      <button class="bottom-nav__item" data-page="${page}" aria-label="${label}" id="bottom-nav-${page}">
        <span class="bottom-nav__icon">${icon}</span>
        <span class="bottom-nav__label">${label}</span>
      </button>
    `).join('');
    bottomNav.querySelectorAll('.bottom-nav__item').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.page));
    });
  }

  // Settings button
  document.getElementById('settings-btn')?.addEventListener('click', openSettings);
}

function getNavIcon(page) {
  return icons[{ home: 'home', menu: 'menu', customers: 'customers', schedule: 'schedule' }[page]] || '';
}

/* ── Event Listeners ─────────────────────────────────────── */
function setupEventListeners() {
  // Custom navigation events (from quick actions, customer list → schedule, etc.)
  window.addEventListener('bhojana:navigate', e => {
    const { page, action, customerId } = e.detail;
    navigate(page, { action, customerId });
  });

  // Browser back/forward
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (PAGES[hash] && hash !== currentPage) navigate(hash);
  });

  // Android install button
  document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('install-btn-container')?.remove();
      showToast('Bhojana installed! 🎉', 'success');
    }
    deferredInstallPrompt = null;
  });
}

/* ── Service Worker ──────────────────────────────────────── */
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }
}

/* ── Install Prompt (Android/Chrome) ────────────────────── */
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;

    // Show install button
    const installContainer = document.getElementById('install-btn-container');
    if (installContainer) {
      installContainer.style.display = 'block';
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.getElementById('install-btn-container')?.remove();
  });
}

/* ── iOS Install Nudge ───────────────────────────────────── */
function setupInstallNudge() {
  if (!isIOS() || isInStandaloneMode()) return;
  if (getSetting('ios_nudge_dismissed') === '1') return;

  const nudge = document.createElement('div');
  nudge.className = 'install-nudge';
  nudge.id = 'ios-nudge';
  nudge.innerHTML = `
    <span class="install-nudge__icon">📲</span>
    <div class="install-nudge__text">
      <strong>Install Bhojana</strong> — Tap the <strong>Share</strong> icon (↑) in Safari, then choose <strong>"Add to Home Screen"</strong> to use the app offline.
    </div>
    <button class="install-nudge__close" id="ios-nudge-close" aria-label="Dismiss">✕</button>
  `;

  const main = document.getElementById('main-content');
  main.insertAdjacentElement('afterbegin', nudge);

  document.getElementById('ios-nudge-close').addEventListener('click', () => {
    setSetting('ios_nudge_dismissed', '1');
    nudge.remove();
  });
}

/* ── Settings Modal ──────────────────────────────────────── */
async function openSettings() {
  // Simple inline settings panel — no external modal needed for just reset
  const panel = document.createElement('div');
  panel.className = 'confirm-overlay';
  panel.id = 'settings-overlay';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Settings');

  panel.innerHTML = `
    <div class="confirm-dialog" style="max-width:440px;width:100%;">
      <div class="confirm-dialog__body">
        <h2 class="confirm-dialog__title">Settings</h2>
        <div style="margin-top:var(--sp-5);">

          <!-- Android install button -->
          <div id="install-settings-row" style="display:none;padding:var(--sp-3) 0;border-bottom:1px solid var(--color-border);">
            <div class="settings-row__label">Install App</div>
            <div class="settings-row__sub">Add Bhojana to your home screen</div>
            <button class="btn btn--primary btn--sm" style="margin-top:var(--sp-2);width:100%;" id="settings-install-btn">Add to Home Screen</button>
          </div>

          <div class="settings-row" id="reset-row" style="cursor:pointer;">
            <div>
              <div class="settings-row__label" style="color:var(--rust-500);">Reset App Data</div>
              <div class="settings-row__sub">Deletes all customers, attendance & menu overrides. Weekly menu reverts to defaults.</div>
            </div>
            <span>›</span>
          </div>

          <div style="padding:var(--sp-4) 0;font-size:var(--text-xs);color:var(--color-text-faint);">
            Bhojana Mess Manager · All data stored locally on this device.
          </div>
        </div>
        <button class="btn btn--ghost w-full" id="settings-close" style="margin-top:var(--sp-2);">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-open')));

  // Show install if available
  if (deferredInstallPrompt) {
    const row = document.getElementById('install-settings-row');
    if (row) row.style.display = 'block';
    document.getElementById('settings-install-btn')?.addEventListener('click', async () => {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Bhojana installed! 🎉', 'success');
        deferredInstallPrompt = null;
      }
      closeSettings();
    });
  }

  document.getElementById('settings-close').addEventListener('click', closeSettings);
  document.getElementById('reset-row').addEventListener('click', async () => {
    closeSettings();
    const ok = await showConfirm({
      title: 'Reset All App Data?',
      message: 'This will permanently delete ALL customers, attendance records, and special days. The weekly menu will reset to defaults. This cannot be undone.',
      confirmLabel: 'Reset Everything',
      danger: true,
    });
    if (ok) {
      resetDB();
      showToast('App data reset', 'info');
      navigate('home');
    }
  });

  panel.addEventListener('click', e => { if (e.target === panel) closeSettings(); });

  function closeSettings() {
    panel.classList.remove('is-open');
    panel.addEventListener('transitionend', () => panel.remove(), { once: true });
  }
}

/* ── Start ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initApp);

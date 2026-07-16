/**
 * BHOJANA — Toast Notifications (toast.js)
 * Premium, interactive glassmorphic toasts with inline SVGs and countdowns.
 */

const SVG_ICONS = {
  success: `
    <svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  `,
  error: `
    <svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  `,
  info: `
    <svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  `
};

const DURATION = 3500;

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.setProperty('--toast-duration', `${DURATION}ms`);

  toast.innerHTML = `
    <div class="toast__main">
      <div class="toast__icon-badge">
        ${SVG_ICONS[type] || SVG_ICONS.info}
      </div>
      <div class="toast__message">${message}</div>
      <button class="toast__close-btn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="toast__progress"></div>
  `;

  container.appendChild(toast);

  // Trigger entrance transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('is-visible'));
  });

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), DURATION);

  // Manual close trigger
  toast.querySelector('.toast__close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    clearTimeout(timer);
    dismissToast(toast);
  });
}

function dismissToast(toast) {
  if (toast.classList.contains('is-hiding')) return;
  toast.classList.remove('is-visible');
  toast.classList.add('is-hiding');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

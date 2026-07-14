/**
 * BHOJANA — Toast Notifications (toast.js)
 * Usage: showToast('Saved!', 'success')
 *        showToast('Error occurred', 'error')
 *        showToast('FYI', 'info')
 */

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };
const DURATION = 3200;

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="toast__icon">${ICONS[type] || ICONS.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger entrance (next frame to allow transition)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('is-visible'));
  });

  // Auto-dismiss
  setTimeout(() => dismissToast(toast), DURATION);
}

function dismissToast(toast) {
  toast.classList.remove('is-visible');
  toast.classList.add('is-hiding');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

/**
 * BHOJANA — Confirmation Dialog (confirm.js)
 *
 * Usage:
 *   const ok = await showConfirm({
 *     title: 'Delete Customer',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true
 *   });
 *   if (ok) { ... }
 */

export function showConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    document.getElementById('confirm-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.id = 'confirm-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-title');
    overlay.setAttribute('aria-describedby', 'confirm-message');

    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-dialog__body">
          <h2 class="confirm-dialog__title" id="confirm-title">${title}</h2>
          <p  class="confirm-dialog__message" id="confirm-message">${message}</p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--ghost flex-1" id="confirm-cancel">${cancelLabel}</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--primary'} flex-1" id="confirm-ok">${confirmLabel}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('is-open'));
    });

    overlay.querySelector('#confirm-ok').addEventListener('click', () => done(true));
    overlay.querySelector('#confirm-cancel').addEventListener('click', () => done(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) done(false); });

    const onEsc = e => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', onEsc);

    // Focus the confirm button
    setTimeout(() => overlay.querySelector('#confirm-ok')?.focus(), 100);

    function done(result) {
      overlay.classList.remove('is-open');
      overlay.addEventListener('transitionend', () => {
        overlay.remove();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      }, { once: true });
    }
  });
}

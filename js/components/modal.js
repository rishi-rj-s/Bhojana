/**
 * BHOJANA — Modal Shell (modal.js)
 *
 * Usage:
 *   const m = createModal({ title: 'Edit Item', body: '<p>...</p>' });
 *   m.open();
 *   m.close();
 *   m.setBody('<p>new content</p>');
 */

export function createModal({ title, body = '', footer = '', id = 'modal-main' }) {
  // Remove any existing modal with same id
  document.getElementById(id)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = id;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  overlay.innerHTML = `
    <div class="modal" role="document">
      <div class="modal__handle" aria-hidden="true"></div>
      <div class="modal__header">
        <h2 class="modal__title">${title}</h2>
        <button class="modal__close" aria-label="Close dialog" id="${id}-close">✕</button>
      </div>
      <div class="modal__body" id="${id}-body">
        ${body}
      </div>
      ${footer ? `<div class="modal__footer" id="${id}-footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Close on X button
  overlay.querySelector(`#${id}-close`).addEventListener('click', close);

  // Close on Escape
  const onEsc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);

  function open() {
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('is-open'));
    });
    // Focus first focusable element
    setTimeout(() => {
      const first = overlay.querySelector('input, select, textarea, button:not([disabled])');
      first?.focus();
    }, 100);
  }

  function close() {
    overlay.classList.remove('is-open');
    overlay.addEventListener('transitionend', () => {
      overlay.remove();
      document.removeEventListener('keydown', onEsc);
    }, { once: true });
  }

  function setBody(html) {
    const bodyEl = document.getElementById(`${id}-body`);
    if (bodyEl) bodyEl.innerHTML = html;
  }

  function setTitle(text) {
    const titleEl = overlay.querySelector('.modal__title');
    if (titleEl) titleEl.textContent = text;
  }

  function getBody() {
    return document.getElementById(`${id}-body`);
  }

  return { open, close, setBody, setTitle, getBody, overlay };
}

/**
 * BHOJANA — SVG Icon Library (icons.js)
 * Clean, stroke-based icons. All 24×24 viewBox.
 * Used in navigation and throughout the app.
 */

const ICON_BASE = (path, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extra}>${path}</svg>`;

export const icons = {
  home: ICON_BASE(
    `<path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
     <path d="M9 21V12h6v9"/>`
  ),
  menu: ICON_BASE(
    `<rect x="3" y="4" width="7" height="7" rx="1"/>
     <rect x="14" y="4" width="7" height="7" rx="1"/>
     <rect x="3" y="14" width="7" height="7" rx="1"/>
     <rect x="14" y="14" width="7" height="7" rx="1"/>`
  ),
  customers: ICON_BASE(
    `<circle cx="9" cy="7" r="4"/>
     <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
     <path d="M16 3.13a4 4 0 010 7.75"/>
     <path d="M21 21v-2a4 4 0 00-3-3.87"/>`
  ),
  schedule: ICON_BASE(
    `<rect x="3" y="4" width="18" height="18" rx="2"/>
     <path d="M16 2v4M8 2v4M3 10h18"/>
     <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>`
  ),
  settings: ICON_BASE(
    `<circle cx="12" cy="12" r="3"/>
     <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>`
  ),
  plus: ICON_BASE(`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`),
  search: ICON_BASE(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`),
  edit: ICON_BASE(
    `<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
     <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>`
  ),
  trash: ICON_BASE(
    `<polyline points="3 6 5 6 21 6"/>
     <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
     <path d="M10 11v6M14 11v6"/>
     <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>`
  ),
  chevronLeft:  ICON_BASE(`<polyline points="15 18 9 12 15 6"/>`),
  chevronRight: ICON_BASE(`<polyline points="9 18 15 12 9 6"/>`),
  chevronDown:  ICON_BASE(`<polyline points="6 9 12 15 18 9"/>`),
  close: ICON_BASE(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),
  phone: ICON_BASE(`<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>`),
  alertTriangle: ICON_BASE(`<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`),
  calendarCheck: ICON_BASE(`<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>`),
  install: ICON_BASE(`<path d="M12 2v9m0 0l-3-3m3 3l3-3M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4"/>`),
  trendingUp: ICON_BASE(`<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`),
};

/* Larger versions for loading / hero contexts */
export function iconLg(name, size = 28) {
  return icons[name]?.replace('width="20" height="20"', `width="${size}" height="${size}"`);
}

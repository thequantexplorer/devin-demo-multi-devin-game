// HUD system. See "HUD and audio" in docs/game-design.md.

const SEPARATOR = ' · ';

const BANNERS = {
  won: { title: 'You win!', hint: 'Press R to play again' },
  lost: { title: 'Game over.', hint: 'Press R to try again' },
};

/** 65 -> "1:05" */
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function hudParts({ collected, total, lives, time }) {
  return [
    { key: 'crystals', label: 'Crystals ', value: `${collected}/${total}` },
    { key: 'lives', label: 'Lives ', value: String(lives) },
    { key: 'time', label: '', value: formatTime(time) },
  ];
}

/** The text in the top bar. */
export function hudText(state) {
  return hudParts(state)
    .map((part) => part.label + part.value)
    .join(SEPARATOR);
}

/** The text in the middle of the screen, or '' while playing. */
export function bannerText(status) {
  const banner = BANNERS[status];
  return banner ? `${banner.title} ${banner.hint}` : '';
}

function el(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

/** Create the HUD elements inside root. Returns { update(state) }. */
export function createHud(root) {
  const bar = el('div', 'hud-bar');
  bar.setAttribute('role', 'status');
  const banner = el('div', 'hud-banner');
  banner.setAttribute('aria-live', 'polite');
  root.append(bar, banner);

  // Child spans keep bar.textContent === hudText(state) and banner.textContent === bannerText(status).
  const values = {};
  hudParts({ collected: 0, total: 0, lives: 0, time: 0 }).forEach((part, i) => {
    if (i > 0) bar.append(el('span', 'hud-sep', SEPARATOR));
    const item = el('span', `hud-item hud-${part.key}`);
    if (part.label) item.append(el('span', 'hud-label', part.label));
    values[part.key] = el('span', 'hud-value');
    item.append(values[part.key]);
    bar.append(item);
  });

  let lastBar = null;
  let lastStatus = null;

  return {
    update(state) {
      const text = hudText(state);
      if (text !== lastBar) {
        lastBar = text;
        for (const part of hudParts(state)) values[part.key].textContent = part.value;
        bar.classList.toggle('is-low', state.lives <= 1);
      }

      if (state.status !== lastStatus) {
        lastStatus = state.status;
        const info = BANNERS[state.status];
        banner.replaceChildren();
        if (info) {
          banner.append(el('span', 'hud-banner-title', info.title), el('span', 'hud-banner-hint', ` ${info.hint}`));
        }
        banner.dataset.status = state.status;
        banner.classList.toggle('is-visible', Boolean(info));
      }
    },
  };
}

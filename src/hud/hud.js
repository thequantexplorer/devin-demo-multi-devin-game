import './hud.css';
import { CRYSTAL_COUNT, LIVES } from '../config.js';
import { formatCrystals, formatHud, formatTime } from './format.js';

const DEFAULT_HINT = 'WASD or arrow keys to move · R to restart';
const PULSE_CLASS = 'is-pulsing';

const BANNERS = {
  won: { title: 'You win!', text: 'Press R to play again' },
  lost: { title: 'Game over', text: 'Press R to play again' },
};

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function pulse(node) {
  node.classList.remove(PULSE_CLASS);
  // Force a reflow so the animation restarts when values change quickly.
  void node.offsetWidth;
  node.classList.add(PULSE_CLASS);
}

export function createHud(root) {
  const doc = root.ownerDocument;
  const element = el(doc, 'div', 'hud');

  const bar = el(doc, 'div', 'hud-bar');
  bar.setAttribute('role', 'status');
  const values = {};
  const items = [
    ['crystals', 'Crystals'],
    ['lives', 'Lives'],
    ['time', null],
  ];
  items.forEach(([key, label], i) => {
    if (i > 0) {
      const sep = el(doc, 'span', 'hud-sep', ' · ');
      sep.setAttribute('aria-hidden', 'true');
      bar.append(sep);
    }
    const item = el(doc, 'span', `hud-item hud-item--${key}`);
    item.dataset.key = key;
    if (label) {
      item.append(el(doc, 'span', 'hud-label', label), doc.createTextNode(' '));
    }
    const value = el(doc, 'span', 'hud-value');
    item.append(value);
    values[key] = value;
    bar.append(item);
  });

  const hint = el(doc, 'p', 'hud-hint', DEFAULT_HINT);

  const banner = el(doc, 'div', 'hud-panel hud-banner');
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-hidden', 'true');
  const bannerTitle = el(doc, 'h2', 'hud-banner-title');
  const bannerText = el(doc, 'p', 'hud-banner-text');
  banner.append(bannerTitle, doc.createTextNode(' '), bannerText);

  const errorPanel = el(doc, 'div', 'hud-panel hud-error');
  errorPanel.setAttribute('role', 'alert');
  errorPanel.hidden = true;
  const errorTitle = el(doc, 'h2', 'hud-error-title', 'Crystal Keep could not start');
  const errorText = el(doc, 'p', 'hud-error-text');
  errorPanel.append(errorTitle, doc.createTextNode(' '), errorText);

  element.append(bar, hint, banner, errorPanel);
  root.append(element);

  const shown = { crystals: null, lives: null, time: null };
  let label = null;

  function setValue(key, text, animate) {
    if (shown[key] === text) return false;
    const first = shown[key] === null;
    shown[key] = text;
    values[key].textContent = text;
    if (animate && !first) pulse(values[key]);
    return true;
  }

  function update({ collected, total, lives, time }) {
    const changed = [
      setValue('crystals', formatCrystals(collected, total), true),
      setValue('lives', String(lives), true),
      setValue('time', formatTime(time), false),
    ].some(Boolean);
    if (changed) {
      const next = formatHud({ collected, total, lives, time });
      if (next !== label) {
        label = next;
        bar.setAttribute('aria-label', next);
      }
    }
  }

  function showBanner(status) {
    const copy = BANNERS[status];
    if (!copy) return;
    bannerTitle.textContent = copy.title;
    bannerText.textContent = copy.text;
    banner.dataset.status = status;
    banner.setAttribute('aria-hidden', 'false');
    banner.classList.add('is-visible');
  }

  function hideBanner() {
    banner.classList.remove('is-visible');
    banner.setAttribute('aria-hidden', 'true');
    delete banner.dataset.status;
  }

  function setHint(text) {
    if (text === null || text === undefined || text === '') {
      hint.hidden = true;
      return;
    }
    hint.textContent = text;
    hint.hidden = false;
  }

  function showError(message) {
    errorText.textContent = message;
    errorPanel.hidden = false;
    bar.hidden = true;
    hint.hidden = true;
    hideBanner();
  }

  values.crystals.addEventListener('animationend', () => values.crystals.classList.remove(PULSE_CLASS));
  values.lives.addEventListener('animationend', () => values.lives.classList.remove(PULSE_CLASS));

  update({ collected: 0, total: CRYSTAL_COUNT, lives: LIVES, time: 0 });

  return { update, showBanner, hideBanner, setHint, showError, element };
}

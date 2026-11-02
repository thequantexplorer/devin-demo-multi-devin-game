// HUD system. See "HUD and audio" in docs/game-design.md.

const BANNERS = {
  playing: '',
  won: 'You win! Press R to play again',
  lost: 'Game over. Press R to try again',
};

/** 65 -> "1:05" */
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** The text in the top bar. */
export function hudText({ collected, total, lives, time }) {
  return `Crystals ${collected}/${total} · Lives ${lives} · ${formatTime(time)}`;
}

/** The text in the middle of the screen, or '' while playing. */
export function bannerText(status) {
  return BANNERS[status] ?? '';
}

/** Create the HUD elements inside root. Returns { update(state) }. */
export function createHud(root) {
  const doc = root.ownerDocument;
  const bar = doc.createElement('div');
  bar.className = 'hud-bar';
  const banner = doc.createElement('div');
  banner.className = 'hud-banner';
  root.append(bar, banner);

  return {
    update(state) {
      const barText = hudText(state);
      if (bar.textContent !== barText) bar.textContent = barText;
      const message = bannerText(state.status);
      if (banner.textContent !== message) banner.textContent = message;
    },
  };
}

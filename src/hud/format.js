// Pure text formatting for the HUD bar.

export function formatTime(seconds) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatCrystals(collected, total) {
  return `${collected}/${total}`;
}

export function formatHud({ collected, total, lives, time }) {
  return `Crystals ${formatCrystals(collected, total)} · Lives ${lives} · ${formatTime(time)}`;
}

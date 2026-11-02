// HUD system. See "HUD and audio" in docs/game-design.md.

/** 65 -> "1:05" */
export function formatTime(seconds) {
  throw new Error('Not implemented: formatTime');
}

/** The text in the top bar. */
export function hudText(state) {
  throw new Error('Not implemented: hudText');
}

/** The text in the middle of the screen, or '' while playing. */
export function bannerText(status) {
  throw new Error('Not implemented: bannerText');
}

/** Create the HUD elements inside root. Returns { update(state) }. */
export function createHud(root) {
  throw new Error('Not implemented: createHud');
}

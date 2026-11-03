export function createCrystals(positions) {
  return positions.map(({ x, y }) => ({ x, y, collected: false }));
}

export function collectAt(crystals, x, y) {
  const index = crystals.findIndex((c) => !c.collected && c.x === x && c.y === y);
  if (index !== -1) crystals[index].collected = true;
  return index;
}

export function remainingCrystals(crystals) {
  return crystals.reduce((n, c) => n + (c.collected ? 0 : 1), 0);
}

export function resetCrystals(crystals) {
  for (const c of crystals) c.collected = false;
  return crystals;
}

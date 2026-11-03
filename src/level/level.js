const WALLS = new Set(['#', 'T']);
const KNOWN = new Set(['#', 'T', '.', 'P', 'C', 'H', 'V']);

function patrolRange(rows, x, y, dx, dy) {
  const open = (cx, cy) => {
    const row = rows[cy];
    return row !== undefined && cx >= 0 && cx < row.length && !WALLS.has(row[cx]);
  };
  let min = dx ? x : y;
  let max = min;
  while (open(dx ? min - 1 : x, dy ? min - 1 : y)) min -= 1;
  while (open(dx ? max + 1 : x, dy ? max + 1 : y)) max += 1;
  return { min, max };
}

export function parseLevel(text) {
  if (typeof text !== 'string') throw new Error('parseLevel: map text must be a string');
  const tiles = text.trim().split('\n').map((row) => row.replace(/\r$/, ''));
  if (tiles.length === 0 || tiles[0].length === 0) throw new Error('parseLevel: map is empty');
  const width = tiles[0].length;
  const height = tiles.length;

  let start = null;
  const crystals = [];
  const guards = [];
  const torches = [];

  tiles.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(
        `parseLevel: row ${y} has length ${row.length}, expected ${width} (all rows must be the same length)`,
      );
    }
    for (let x = 0; x < width; x += 1) {
      const ch = row[x];
      if (!KNOWN.has(ch)) {
        throw new Error(`parseLevel: unknown character "${ch}" at (${x}, ${y})`);
      }
      if (ch === 'P') {
        if (start) {
          throw new Error(
            `parseLevel: more than one player start "P" (at (${start.x}, ${start.y}) and (${x}, ${y}))`,
          );
        }
        start = { x, y };
      } else if (ch === 'C') {
        crystals.push({ x, y });
      } else if (ch === 'T') {
        torches.push({ x, y });
      } else if (ch === 'H' || ch === 'V') {
        const axis = ch === 'H' ? 'x' : 'y';
        const { min, max } = axis === 'x' ? patrolRange(tiles, x, y, 1, 0) : patrolRange(tiles, x, y, 0, 1);
        guards.push({ x, y, axis, min, max });
      }
    }
  });

  if (!start) throw new Error('parseLevel: no player start "P" found');

  return { width, height, tiles, start, crystals, guards, torches };
}

export function isWall(level, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return true;
  if (y < 0 || y >= level.height || x < 0 || x >= level.width) return true;
  return WALLS.has(level.tiles[y][x]);
}

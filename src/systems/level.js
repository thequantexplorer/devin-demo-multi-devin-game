// Level system. See "Level" in docs/game-design.md.
import * as THREE from 'three';

const WALL_COLOR = 0x3a3f4a;
const WALL_TOP_COLOR = 0x555b68;
const FLOOR_COLOR = 0x1c1f26;
const CRYSTAL_COLOR = 0x5ce1ff;
const TORCH_COLOR = 0xffb45c;
const WALL_HEIGHT = 1;

/**
 * Turn an ASCII map into level data.
 * @param {string} text
 * @returns {{ width: number, height: number, spawn: {x: number, z: number},
 *   crystals: {x: number, z: number}[], enemies: {x: number, z: number, axis: 'x' | 'z'}[],
 *   isWall: (x: number, z: number) => boolean }}
 */
export function parseLevel(text) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (!lines.length) throw new Error('Level is empty');

  const width = lines[0].length;
  const height = lines.length;
  const walls = [];
  const crystals = [];
  const enemies = [];
  let spawn = null;

  lines.forEach((line, z) => {
    if (line.length !== width) {
      throw new Error(`Row ${z} has length ${line.length}, expected ${width}`);
    }
    const row = [];
    for (let x = 0; x < width; x++) {
      const ch = line[x];
      row.push(ch === '#');
      switch (ch) {
        case '#':
        case '.':
          break;
        case 'P':
          if (spawn) throw new Error('Level has more than one P');
          spawn = { x, z };
          break;
        case 'C':
          crystals.push({ x, z });
          break;
        case 'E':
          enemies.push({ x, z, axis: 'x' });
          break;
        case 'V':
          enemies.push({ x, z, axis: 'z' });
          break;
        default:
          throw new Error(`Unknown character '${ch}' at (${x}, ${z})`);
      }
    }
    walls.push(row);
  });

  if (!spawn) throw new Error('Level has no P');

  const isWall = (x, z) => {
    const tx = Math.round(x);
    const tz = Math.round(z);
    if (tx < 0 || tz < 0 || tx >= width || tz >= height) return true;
    return walls[tz][tx];
  };

  return { width, height, spawn, crystals, enemies, isWall };
}

function makeCanvasTexture(size, draw) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function speckle(ctx, size, count, alpha) {
  for (let i = 0; i < count; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// Two-by-two checker: one cell per tile.
function makeFloorTexture() {
  return makeCanvasTexture(128, (ctx, size) => {
    const half = size / 2;
    const shades = ['#20242c', '#191c23'];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = shades[(i + j) % 2];
        ctx.fillRect(i * half, j * half, half, half);
      }
    }
    speckle(ctx, size, 900, 0.08);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * half, 0);
      ctx.lineTo(i * half, size);
      ctx.moveTo(0, i * half);
      ctx.lineTo(size, i * half);
      ctx.stroke();
    }
  });
}

function makeBrickTexture() {
  return makeCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#23262d';
    ctx.fillRect(0, 0, size, size);
    const rows = 4;
    const brickH = size / rows;
    const brickW = size / 2;
    const gap = 3;
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 ? brickW / 2 : 0;
      for (let c = -1; c < 3; c++) {
        const x = c * brickW + offset;
        const l = 22 + Math.floor(Math.random() * 8);
        ctx.fillStyle = `hsl(220, 12%, ${l}%)`;
        ctx.fillRect(x + gap / 2, r * brickH + gap / 2, brickW - gap, brickH - gap);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x + gap / 2, r * brickH + gap / 2, brickW - gap, 2);
      }
    }
    speckle(ctx, size, 700, 0.1);
  });
}

function makeTopTexture() {
  return makeCanvasTexture(64, (ctx, size) => {
    ctx.fillStyle = '#555b68';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, 300, 0.12);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  });
}

function makeFloor(level) {
  const { width, height } = level;
  const texture = makeFloorTexture();
  if (texture) texture.repeat.set(width / 2, height / 2);
  const material = new THREE.MeshStandardMaterial({
    color: texture ? 0xffffff : FLOOR_COLOR,
    map: texture,
    roughness: 0.92,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((width - 1) / 2, 0, (height - 1) / 2);
  floor.receiveShadow = true;
  return floor;
}

function makeWallMaterials() {
  const brick = makeBrickTexture();
  const top = makeTopTexture();
  const side = new THREE.MeshStandardMaterial({
    color: brick ? 0xffffff : WALL_COLOR,
    map: brick,
    roughness: 0.85,
    metalness: 0.05,
  });
  const cap = new THREE.MeshStandardMaterial({
    color: top ? 0xffffff : WALL_TOP_COLOR,
    map: top,
    roughness: 0.8,
    metalness: 0.05,
  });
  // BoxGeometry face order: +x, -x, +y (top), -y, +z, -z.
  return [side, side, cap, side, side, side];
}

function makeCrystal(position, index, geometry, material) {
  const crystal = new THREE.Mesh(geometry, material);
  crystal.name = 'crystal';
  crystal.userData.index = index;
  crystal.position.set(position.x, 0.5, position.z);
  crystal.castShadow = false;
  const light = new THREE.PointLight(CRYSTAL_COLOR, 1.6, 3, 2);
  light.name = 'crystalLight';
  crystal.add(light);
  return crystal;
}

// Wall tiles that face open floor; good spots for torches.
function torchSpots(level, maxTorches) {
  const { width, height, isWall } = level;
  const spots = [];
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      if (!isWall(x, z)) continue;
      const onBorder = x === 0 || z === 0 || x === width - 1 || z === height - 1;
      if (!onBorder) continue;
      for (const [dx, dz] of dirs) {
        if (!isWall(x + dx, z + dz)) {
          spots.push({ x, z, dx, dz });
          break;
        }
      }
    }
  }
  if (spots.length <= maxTorches) return spots;
  const picked = [];
  const step = spots.length / maxTorches;
  for (let i = 0; i < maxTorches; i++) picked.push(spots[Math.floor(i * step + step / 2)]);
  return picked;
}

function makeTorch(spot, parts) {
  const torch = new THREE.Group();
  torch.name = 'torch';
  torch.position.set(spot.x + spot.dx * 0.55, 0.75, spot.z + spot.dz * 0.55);

  const bracket = new THREE.Mesh(parts.bracketGeometry, parts.bracketMaterial);
  bracket.name = 'torchBracket';
  bracket.position.y = -0.08;
  torch.add(bracket);

  const flame = new THREE.Mesh(parts.flameGeometry, parts.flameMaterial);
  flame.name = 'torchFlame';
  flame.position.y = 0.06;
  torch.add(flame);

  const light = new THREE.PointLight(TORCH_COLOR, 3, 6, 1.6);
  light.name = 'torchLight';
  light.position.set(spot.dx * 0.15, 0.1, spot.dz * 0.15);
  torch.add(light);
  return torch;
}

/**
 * Build the 3D meshes for the floor, walls and crystals.
 * @returns {import('three').Group}
 */
export function buildLevel(level) {
  const group = new THREE.Group();
  group.name = 'level';

  group.add(makeFloor(level));

  const wallGeometry = new THREE.BoxGeometry(1, WALL_HEIGHT, 1);
  const wallMaterials = makeWallMaterials();
  for (let z = 0; z < level.height; z++) {
    for (let x = 0; x < level.width; x++) {
      if (!level.isWall(x, z)) continue;
      const wall = new THREE.Mesh(wallGeometry, wallMaterials);
      wall.name = 'wall';
      wall.position.set(x, WALL_HEIGHT / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
  }

  const crystalGeometry = new THREE.OctahedronGeometry(0.25, 0);
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: CRYSTAL_COLOR,
    emissive: CRYSTAL_COLOR,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.1,
    flatShading: true,
  });
  level.crystals.forEach((c, i) => {
    group.add(makeCrystal(c, i, crystalGeometry, crystalMaterial));
  });

  const torchParts = {
    bracketGeometry: new THREE.CylinderGeometry(0.04, 0.06, 0.2, 8),
    bracketMaterial: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7, metalness: 0.4 }),
    flameGeometry: new THREE.SphereGeometry(0.07, 12, 8),
    flameMaterial: new THREE.MeshStandardMaterial({
      color: TORCH_COLOR,
      emissive: TORCH_COLOR,
      emissiveIntensity: 3,
    }),
  };
  const maxTorches = Math.max(2, Math.min(6, Math.round((level.width + level.height) / 4)));
  for (const spot of torchSpots(level, maxTorches)) group.add(makeTorch(spot, torchParts));

  return group;
}

// Level system. See "Level" in docs/game-design.md.
import * as THREE from 'three';

const TILES = {
  '#': 'wall',
  '.': 'floor',
  P: 'spawn',
  C: 'crystal',
  E: 'enemy-x',
  V: 'enemy-z',
};

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
  if (lines.length === 0) throw new Error('Level is empty');

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
      const kind = TILES[ch];
      if (!kind) throw new Error(`Unknown character '${ch}' at (${x}, ${z})`);
      row.push(kind === 'wall');
      if (kind === 'spawn') {
        if (spawn) throw new Error('Level has more than one P');
        spawn = { x, z };
      } else if (kind === 'crystal') {
        crystals.push({ x, z });
      } else if (kind === 'enemy-x') {
        enemies.push({ x, z, axis: 'x' });
      } else if (kind === 'enemy-z') {
        enemies.push({ x, z, axis: 'z' });
      }
    }
    walls.push(row);
  });

  if (!spawn) throw new Error('Level has no P');

  function isWall(x, z) {
    const tx = Math.round(x);
    const tz = Math.round(z);
    if (!(tx >= 0 && tx < width && tz >= 0 && tz < height)) return true;
    return walls[tz][tx];
  }

  return { width, height, spawn, crystals, enemies, isWall };
}

/**
 * Build the 3D meshes for the floor, walls and crystals.
 * @returns {import('three').Group}
 */
export function buildLevel(level) {
  const group = new THREE.Group();
  group.name = 'level';

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(level.width, level.height),
    new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.9 }),
  );
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((level.width - 1) / 2, 0, (level.height - 1) / 2);
  floor.receiveShadow = true;
  group.add(floor);

  const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x7a6a8c, roughness: 0.7 });
  for (let z = 0; z < level.height; z++) {
    for (let x = 0; x < level.width; x++) {
      if (!level.isWall(x, z)) continue;
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.name = 'wall';
      wall.position.set(x, 0.5, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
  }

  const crystalGeometry = new THREE.OctahedronGeometry(0.3);
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0x5ff4ff,
    emissive: 0x22c8ff,
    emissiveIntensity: 1.2,
    metalness: 0.2,
    roughness: 0.2,
  });
  level.crystals.forEach((c, index) => {
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystal.name = 'crystal';
    crystal.position.set(c.x, 0.5, c.z);
    crystal.userData.index = index;
    crystal.castShadow = true;
    group.add(crystal);
  });

  return group;
}

// Player system. See "Player" in docs/game-design.md.
import * as THREE from 'three';
import { PLAYER_SPEED } from '../config.js';

const DIRECTIONS = {
  up: { dx: 0, dz: -1 },
  down: { dx: 0, dz: 1 },
  left: { dx: -1, dz: 0 },
  right: { dx: 1, dz: 0 },
};
const DIRECTION_ORDER = ['up', 'down', 'left', 'right'];

const KEY_BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

/** @returns {{ x: number, z: number, targetX: number, targetZ: number, facing: 'up' | 'down' | 'left' | 'right' }} */
export function createPlayer(spawn) {
  return { x: spawn.x, z: spawn.z, targetX: spawn.x, targetZ: spawn.z, facing: 'down' };
}

/** Map pressed keys to { up, down, left, right } booleans. */
export function readInput(keysDown) {
  const input = {};
  for (const dir of DIRECTION_ORDER) {
    input[dir] = KEY_BINDINGS[dir].some((code) => keysDown.has(code));
  }
  return input;
}

/** Move the player one frame. Mutates and returns the player. */
export function updatePlayer(player, input, dt, level) {
  if (player.x === player.targetX && player.z === player.targetZ) {
    const dir = DIRECTION_ORDER.find((d) => input[d]);
    if (dir) {
      player.facing = dir;
      const { dx, dz } = DIRECTIONS[dir];
      const nextX = player.targetX + dx;
      const nextZ = player.targetZ + dz;
      if (!level.isWall(nextX, nextZ)) {
        player.targetX = nextX;
        player.targetZ = nextZ;
      }
    }
  }

  const dx = player.targetX - player.x;
  const dz = player.targetZ - player.z;
  const distance = Math.hypot(dx, dz);
  if (distance === 0) return player;

  const step = PLAYER_SPEED * dt;
  if (step >= distance) {
    player.x = player.targetX;
    player.z = player.targetZ;
  } else {
    player.x += (dx / distance) * step;
    player.z += (dz / distance) * step;
  }
  return player;
}

/** @returns {import('three').Object3D} */
export function createPlayerMesh() {
  const radius = 0.25;
  const height = 0.8;
  const geometry = new THREE.CapsuleGeometry(radius, height - radius * 2, 4, 12);
  const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
  const body = new THREE.Mesh(geometry, material);
  body.position.y = height / 2;
  body.castShadow = true;

  const group = new THREE.Group();
  group.name = 'player';
  group.add(body);
  return group;
}

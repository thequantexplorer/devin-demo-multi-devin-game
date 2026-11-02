// Enemy system. See "Enemies" in docs/game-design.md.
import * as THREE from 'three';
import { ENEMY_SPEED, HIT_DISTANCE } from '../config.js';

function patrolRange(x, z, axis, level) {
  const blocked = (t) => (axis === 'x' ? level.isWall(t, z) : level.isWall(x, t));
  const start = axis === 'x' ? x : z;
  let min = start;
  let max = start;
  while (!blocked(min - 1)) min -= 1;
  while (!blocked(max + 1)) max += 1;
  return { min, max };
}

/** @returns {{ x: number, z: number, axis: 'x' | 'z', dir: 1 | -1, min: number, max: number }[]} */
export function createEnemies(spawns, level) {
  return spawns.map(({ x, z, axis }) => {
    const { min, max } = patrolRange(x, z, axis, level);
    return { x, z, axis, dir: 1, min, max };
  });
}

/** Move every enemy one frame. Mutates and returns the array. */
export function updateEnemies(enemies, dt) {
  for (const e of enemies) {
    if (e.min === e.max) continue;
    const next = e[e.axis] + e.dir * ENEMY_SPEED * dt;
    if (next >= e.max) {
      e[e.axis] = e.max;
      e.dir = -1;
    } else if (next <= e.min) {
      e[e.axis] = e.min;
      e.dir = 1;
    } else {
      e[e.axis] = next;
    }
  }
  return enemies;
}

/** True when the enemy is close enough to hurt the player. */
export function hitsPlayer(enemy, player) {
  return Math.hypot(enemy.x - player.x, enemy.z - player.z) < HIT_DISTANCE;
}

/** @returns {import('three').Object3D} */
export function createEnemyMesh() {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0xd62828 }),
  );
  mesh.position.y = 0.4;
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

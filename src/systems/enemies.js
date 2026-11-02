// Enemy system. See "Enemies" in docs/game-design.md.
import * as THREE from 'three';
import { ENEMY_SPEED, HIT_DISTANCE } from '../config.js';

const ARMOR_COLOR = 0xb23a3a;
const LANTERN_COLOR = 0xff9a3c;

function patrolRange(x, z, axis, level) {
  const blocked = (p) => (axis === 'x' ? level.isWall(p, z) : level.isWall(x, p));
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
    const sx = Math.round(x);
    const sz = Math.round(z);
    const { min, max } = patrolRange(sx, sz, axis, level);
    return { x: sx, z: sz, axis, dir: 1, min, max };
  });
}

/** Move every enemy one frame. Mutates and returns the array. */
export function updateEnemies(enemies, dt) {
  for (const e of enemies) {
    if (e.min === e.max) continue;
    let pos = e[e.axis] + e.dir * ENEMY_SPEED * dt;
    if (pos >= e.max) {
      pos = e.max;
      e.dir = -1;
    } else if (pos <= e.min) {
      pos = e.min;
      e.dir = 1;
    }
    e[e.axis] = pos;
  }
  return enemies;
}

/** True when the enemy is close enough to hurt the player. */
export function hitsPlayer(enemy, player) {
  return Math.hypot(enemy.x - player.x, enemy.z - player.z) < HIT_DISTANCE;
}

/** @returns {import('three').Object3D} */
export function createEnemyMesh() {
  const group = new THREE.Group();
  group.name = 'guard';

  const armor = new THREE.MeshStandardMaterial({ color: ARMOR_COLOR, metalness: 0.6, roughness: 0.38 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x3a1416, metalness: 0.7, roughness: 0.45 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x120607, metalness: 0.3, roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.62, 20), armor);
  body.position.y = 0.31;
  group.add(body);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.03, 8, 24), trim);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.3;
  group.add(belt);

  const pauldrons = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.08, 20), trim);
  pauldrons.position.y = 0.64;
  group.add(pauldrons);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), armor);
  helmet.position.y = 0.8;
  group.add(helmet);

  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.06), visor);
  slit.position.set(0, 0.8, 0.14);
  group.add(slit);

  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 12), trim);
  spike.position.y = 1.0;
  group.add(spike);

  const lantern = new THREE.Group();
  lantern.name = 'lantern';
  lantern.position.set(0.3, 0.42, 0.12);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 12),
    new THREE.MeshStandardMaterial({ color: LANTERN_COLOR, emissive: LANTERN_COLOR, emissiveIntensity: 2.5, roughness: 0.4 }),
  );
  lantern.add(glow);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.04, 12), trim);
  cap.position.y = 0.075;
  lantern.add(cap);
  const light = new THREE.PointLight(LANTERN_COLOR, 0.8, 2.5, 2);
  lantern.add(light);
  group.add(lantern);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  glow.castShadow = false;

  return group;
}

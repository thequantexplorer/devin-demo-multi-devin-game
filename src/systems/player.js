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

const KEYS = {
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
  for (const dir of DIRECTION_ORDER) input[dir] = KEYS[dir].some((code) => keysDown.has(code));
  return input;
}

/** Move the player one frame. Mutates and returns the player. */
export function updatePlayer(player, input, dt, level) {
  const onTarget = player.x === player.targetX && player.z === player.targetZ;
  if (onTarget) {
    const dir = DIRECTION_ORDER.find((d) => input[d]);
    if (dir) {
      player.facing = dir;
      const nextX = player.targetX + DIRECTIONS[dir].dx;
      const nextZ = player.targetZ + DIRECTIONS[dir].dz;
      if (!level.isWall(nextX, nextZ)) {
        player.targetX = nextX;
        player.targetZ = nextZ;
      }
    }
  }

  const dx = player.targetX - player.x;
  const dz = player.targetZ - player.z;
  const distance = Math.abs(dx) + Math.abs(dz);
  const step = PLAYER_SPEED * dt;
  if (distance === 0) return player;
  if (step >= distance) {
    player.x = player.targetX;
    player.z = player.targetZ;
  } else {
    player.x += Math.sign(dx) * Math.min(step, Math.abs(dx));
    player.z += Math.sign(dz) * Math.min(step, Math.abs(dz));
  }
  return player;
}

/** @returns {import('three').Object3D} */
export function createPlayerMesh() {
  const group = new THREE.Group();
  group.name = 'player';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf4ede1, roughness: 0.55, metalness: 0.05 });
  const visorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1d24,
    roughness: 0.25,
    metalness: 0.2,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd9a0,
    emissive: 0xffb45c,
    emissiveIntensity: 1.4,
  });

  // Body: capsule 0.56 tall overall (radius 0.2), resting on y = 0.
  const bodyRadius = 0.2;
  const bodyLength = 0.16;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(bodyRadius, bodyLength, 8, 20), bodyMaterial);
  body.position.y = bodyRadius + bodyLength / 2;
  group.add(body);

  // Head: small sphere on top; top of head lands at y = 0.8.
  const headRadius = 0.13;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 24, 16), bodyMaterial);
  head.position.y = 0.8 - headRadius;
  group.add(head);

  // Visor and eyes on the +z side so facing reads clearly.
  const visor = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.82, 24, 12, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.36, Math.PI * 0.26), visorMaterial);
  visor.position.copy(head.position);
  visor.position.z += 0.035;
  group.add(visor);

  const eyeGeometry = new THREE.SphereGeometry(0.022, 12, 8);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(side * 0.045, head.position.y + 0.005, head.position.z + 0.145);
    group.add(eye);
  }

  // Small belt band for a bit of shape.
  const belt = new THREE.Mesh(new THREE.TorusGeometry(bodyRadius * 1.0, 0.022, 8, 28), visorMaterial);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.2;
  group.add(belt);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

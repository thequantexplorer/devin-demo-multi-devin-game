import * as THREE from 'three';
import { BLINK_RATE, COLORS, PLAYER_MOVE_TIME, TILE_SIZE, tileToWorld } from '../config.js';
import { isSafe } from './player.js';

// Local look-and-feel numbers (world units unless noted).
const BODY_RADIUS = 0.2;
const BODY_LENGTH = 0.24; // straight part of the capsule
const BODY_HEIGHT = BODY_LENGTH + BODY_RADIUS * 2;
const HEAD_RADIUS = 0.15;
const HEAD_Y = BODY_HEIGHT + 0.08;
const HOP_HEIGHT = 0.12;
const TURN_RATE = 28; // 1/s, exponential turn-to-face speed
const SNAP_DISTANCE = 1.5 * TILE_SIZE; // farther jumps (respawn) snap instead of tweening
const IDLE_BOB = 0.012;
const IDLE_SPEED = 2.4; // radians per second
const VISOR_COLOR = 0x151922;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// Facing { dx, dy } in tiles -> rotation around world y. The model looks
// along +z (south, toward the camera) at angle 0.
export function facingToAngle(facing) {
  if (!facing || (facing.dx === 0 && facing.dy === 0)) return 0;
  return Math.atan2(facing.dx, facing.dy);
}

function buildModel() {
  const rig = new THREE.Group();
  rig.name = 'playerRig';

  const skin = new THREE.MeshStandardMaterial({
    color: COLORS.player,
    roughness: 0.55,
    metalness: 0.0,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(BODY_RADIUS, BODY_LENGTH, 6, 16), skin);
  body.name = 'body';
  body.position.y = BODY_HEIGHT / 2;

  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 20, 14), skin);
  head.name = 'head';
  head.position.y = HEAD_Y;

  const visor = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.045, 0.14, 4, 10),
    new THREE.MeshStandardMaterial({ color: VISOR_COLOR, roughness: 0.25, metalness: 0.4 }),
  );
  visor.name = 'visor';
  visor.rotation.z = Math.PI / 2;
  visor.position.set(0, HEAD_Y + 0.01, HEAD_RADIUS * 0.82);

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.crystal,
    emissive: COLORS.crystal,
    emissiveIntensity: 0.9,
    roughness: 0.4,
  });
  const eyeGeometry = new THREE.SphereGeometry(0.022, 8, 6);
  const eyes = [-0.045, 0.045].map((x, i) => {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.name = i === 0 ? 'eyeLeft' : 'eyeRight';
    eye.position.set(x, HEAD_Y + 0.012, HEAD_RADIUS * 0.82 + 0.035);
    return eye;
  });

  const pack = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 0.1, 4, 10),
    new THREE.MeshStandardMaterial({ color: COLORS.wallTop, roughness: 0.7 }),
  );
  pack.name = 'backpack';
  pack.position.set(0, BODY_HEIGHT * 0.58, -BODY_RADIUS * 0.95);

  const parts = [body, head, visor, ...eyes, pack];
  for (const mesh of parts) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rig.add(mesh);
  }
  return rig;
}

export function createPlayerView(scene) {
  const group = new THREE.Group();
  group.name = 'player';
  const rig = buildModel();
  group.add(rig);

  const glow = new THREE.PointLight(COLORS.player, 0.6, 2.2, 2);
  glow.name = 'playerGlow';
  glow.position.y = HEAD_Y + 0.25;
  group.add(glow);

  scene.add(group);

  const tween = { fromX: 0, fromZ: 0, toX: 0, toZ: 0, t: 1 };
  let tileX = null;
  let tileY = null;

  function snapTo(x, y) {
    const w = tileToWorld(x, y);
    tileX = x;
    tileY = y;
    tween.fromX = tween.toX = w.x;
    tween.fromZ = tween.toZ = w.z;
    tween.t = 1;
    group.position.set(w.x, 0, w.z);
    rig.position.y = 0;
  }

  function startTween(x, y) {
    const w = tileToWorld(x, y);
    const dist = Math.hypot(w.x - group.position.x, w.z - group.position.z);
    if (tileX === null || dist > SNAP_DISTANCE) {
      snapTo(x, y);
      return;
    }
    tileX = x;
    tileY = y;
    tween.fromX = group.position.x;
    tween.fromZ = group.position.z;
    tween.toX = w.x;
    tween.toZ = w.z;
    tween.t = 0;
  }

  function update(player, dt, time = 0) {
    if (player.x !== tileX || player.y !== tileY) startTween(player.x, player.y);

    let hop = 0;
    if (tween.t < 1) {
      tween.t = Math.min(1, tween.t + (PLAYER_MOVE_TIME > 0 ? dt / PLAYER_MOVE_TIME : 1));
      const e = easeOutCubic(tween.t);
      group.position.x = tween.fromX + (tween.toX - tween.fromX) * e;
      group.position.z = tween.fromZ + (tween.toZ - tween.fromZ) * e;
      hop = Math.sin(Math.PI * tween.t) * HOP_HEIGHT;
    } else {
      group.position.x = tween.toX;
      group.position.z = tween.toZ;
    }
    rig.position.y = hop + (tween.t >= 1 ? Math.sin(time * IDLE_SPEED) * IDLE_BOB : 0);

    const target = facingToAngle(player.facing);
    const diff = wrapAngle(target - rig.rotation.y);
    const k = 1 - Math.exp(-TURN_RATE * Math.max(0, dt));
    rig.rotation.y = Math.abs(diff) < 1e-3 ? target : wrapAngle(rig.rotation.y + diff * k);

    if (isSafe(player)) {
      // Two visibility toggles per blink.
      group.visible = Math.floor(player.safeTime * BLINK_RATE * 2) % 2 === 0;
    } else {
      group.visible = true;
    }
  }

  return { group, snapTo, update };
}

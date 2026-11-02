import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildLevel } from './systems/level.js';
import { readInput, createPlayerMesh } from './systems/player.js';
import { createEnemyMesh } from './systems/enemies.js';
import { createHud } from './systems/hud.js';
import { createAudio } from './systems/audio.js';
import { createGame, stepGame } from './game.js';
import level1 from './levels/level1.js';

const BACKGROUND = 0x0b0e14;
const TORCH = 0xffb45c;
const CRYSTAL = 0x5ce1ff;
const HIT = 0xff5a4a;
const MAX_DT = 0.05;

const params = new URLSearchParams(window.location.search);
const speedParam = Number.parseFloat(params.get('speed'));
const speed = Number.isFinite(speedParam) && speedParam > 0 ? speedParam : 1;

// Renderer

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BACKGROUND);
scene.fog = new THREE.Fog(BACKGROUND, 18, 34);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.55, 0.62);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Lights

scene.add(new THREE.AmbientLight(0x8ea4c8, 0.35));
scene.add(new THREE.HemisphereLight(0x6f86b0, 0x1a1410, 0.35));

const moon = new THREE.DirectionalLight(0xffd6a0, 1.6);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.bias = -0.0005;
moon.shadow.normalBias = 0.02;
moon.shadow.radius = 4;
scene.add(moon, moon.target);

// World

let game = createGame(level1);
let levelGroup;
let crystalMeshes = [];
let torchLights = [];
const { width, height } = game.level;
const center = new THREE.Vector3((width - 1) / 2, 0, (height - 1) / 2);

function enableShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = child.name !== 'floor';
      child.receiveShadow = true;
    }
  });
}

function addTorches(group) {
  if (group.getObjectByName('torch')) return;
  // Warm torches on a few inner wall faces around the keep.
  const spots = [
    [center.x, 0.6],
    [center.x, height - 1.6],
    [0.6, center.z],
    [width - 1.6, center.z],
    [0.6, 0.6],
    [width - 1.6, height - 1.6],
  ];
  for (const [x, z] of spots) {
    const torch = new THREE.Group();
    torch.name = 'torch';
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      new THREE.MeshStandardMaterial({ color: TORCH, emissive: TORCH, emissiveIntensity: 3 }),
    );
    const light = new THREE.PointLight(TORCH, 2.2, 6, 1.6);
    light.name = 'torchLight';
    torch.add(flame, light);
    torch.position.set(x, 1.15, z);
    group.add(torch);
  }
}

function buildWorld() {
  if (levelGroup) scene.remove(levelGroup);
  levelGroup = buildLevel(game.level);
  enableShadows(levelGroup);
  addTorches(levelGroup);
  scene.add(levelGroup);

  crystalMeshes = [];
  levelGroup.traverse((child) => {
    if (child.name === 'crystal') crystalMeshes[child.userData.index] = child;
  });
  for (const mesh of crystalMeshes) mesh.userData.baseY = mesh.position.y;

  torchLights = [];
  levelGroup.traverse((child) => {
    if (child.isPointLight && child.parent?.name === 'torch') {
      torchLights.push({ light: child, base: child.intensity, phase: Math.random() * Math.PI * 2 });
    }
  });
}

buildWorld();

const playerMesh = createPlayerMesh();
enableShadows(playerMesh);
scene.add(playerMesh);

let enemyMeshes = [];
function buildEnemies() {
  for (const mesh of enemyMeshes) scene.remove(mesh);
  enemyMeshes = game.enemies.map(() => {
    const mesh = createEnemyMesh();
    enableShadows(mesh);
    scene.add(mesh);
    return mesh;
  });
}
buildEnemies();

// Camera: above and behind, framing the whole level.

const cameraBase = new THREE.Vector3();
function frameCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const margin = 1.25;
  const fitHeight = ((height + 1) * margin) / 2 / Math.tan(vFov / 2);
  const fitWidth = ((width + 1) * margin) / 2 / Math.tan(hFov / 2);
  const distance = Math.max(fitHeight, fitWidth) * 0.92;
  const angle = THREE.MathUtils.degToRad(58);
  cameraBase.set(center.x, Math.sin(angle) * distance, center.z + Math.cos(angle) * distance);
  camera.position.copy(cameraBase);
  camera.lookAt(center.x, 0, center.z + 0.4);
  camera.updateProjectionMatrix();

  moon.position.set(center.x - 6, 14, center.z + 6);
  moon.target.position.copy(center);
  const s = Math.max(width, height) * 0.7;
  Object.assign(moon.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 40 });
  moon.shadow.camera.updateProjectionMatrix();
}
frameCamera();

// Particles

const bursts = [];
function burst(x, z, color, count) {
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions.set([x, 0.5, z], i * 3);
    const a = Math.random() * Math.PI * 2;
    const up = 1.5 + Math.random() * 2.5;
    const out = 1 + Math.random() * 2.5;
    velocities.push(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size: 0.12,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  bursts.push({ points, velocities, life: 0, duration: 0.7 });
}

function updateBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life += dt;
    const pos = b.points.geometry.attributes.position;
    b.velocities.forEach((v, j) => {
      v.y -= 6 * dt;
      pos.setXYZ(j, pos.getX(j) + v.x * dt, Math.max(0.02, pos.getY(j) + v.y * dt), pos.getZ(j) + v.z * dt);
    });
    pos.needsUpdate = true;
    b.points.material.opacity = Math.max(0, 1 - b.life / b.duration);
    if (b.life >= b.duration) {
      scene.remove(b.points);
      b.points.geometry.dispose();
      b.points.material.dispose();
      bursts.splice(i, 1);
    }
  }
}

let shake = 0;

// HUD, audio and input

const hud = createHud(document.getElementById('hud'));
const audio = createAudio(window.AudioContext || window.webkitAudioContext);

const keys = new Set();
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR']);

function restart() {
  game = createGame(level1);
  window.__game = game;
  buildEnemies();
  for (const mesh of crystalMeshes) mesh.visible = true;
  shake = 0;
}

window.addEventListener('keydown', (event) => {
  if (GAME_KEYS.has(event.code)) event.preventDefault();
  if (event.code === 'KeyR' && !event.repeat) {
    restart();
    return;
  }
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
renderer.domElement.addEventListener('pointerdown', () => window.focus());

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  frameCamera();
});

const FACING_ANGLE = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

function turnToward(current, target, t) {
  let diff = target - current;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return current + diff * Math.min(1, t);
}

function playEvents(events) {
  for (const event of events) {
    audio.play(event);
    if (event === 'hit') {
      const e = game.enemies.reduce((a, b) =>
        Math.hypot(a.x - game.player.x, a.z - game.player.z) < Math.hypot(b.x - game.player.x, b.z - game.player.z) ? a : b,
      );
      burst(e.x, e.z, HIT, 40);
      shake = 0.35;
    }
  }
}

window.__game = game;

// Loop

const clock = new THREE.Clock();
let elapsed = 0;

renderer.setAnimationLoop(() => {
  const realDt = Math.min(clock.getDelta(), MAX_DT);
  const dt = realDt * speed;
  elapsed += dt;

  const crystalsBefore = game.crystals.map((c) => c.taken);
  const events = stepGame(game, readInput(keys), dt);
  // Burst at the crystal itself, not wherever the player ended up.
  if (events.includes('pickup')) {
    game.crystals.forEach((c, i) => {
      if (c.taken && !crystalsBefore[i]) burst(c.x, c.z, CRYSTAL, 48);
    });
  }
  playEvents(events);

  // Player
  const { player } = game;
  playerMesh.position.set(player.x, 0, player.z);
  const moving = player.x !== player.targetX || player.z !== player.targetZ;
  playerMesh.position.y = moving ? Math.abs(Math.sin(elapsed * 18)) * 0.06 : 0;
  playerMesh.rotation.y = turnToward(playerMesh.rotation.y, FACING_ANGLE[player.facing] ?? 0, realDt * 18);
  playerMesh.visible = game.invulnerable > 0 ? Math.floor(game.invulnerable * 10) % 2 === 0 : true;

  // Guards
  game.enemies.forEach((enemy, i) => {
    const mesh = enemyMeshes[i];
    mesh.position.set(enemy.x, 0, enemy.z);
    const angle = enemy.axis === 'x' ? (enemy.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : enemy.dir > 0 ? 0 : Math.PI;
    mesh.rotation.y = turnToward(mesh.rotation.y, angle, realDt * 10);
  });

  // Crystals
  game.crystals.forEach((crystal, i) => {
    const mesh = crystalMeshes[i];
    if (!mesh) return;
    mesh.visible = !crystal.taken;
    mesh.rotation.y = elapsed * 1.6 + i;
    mesh.position.y = (mesh.userData.baseY ?? 0.5) + Math.sin(elapsed * 2.4 + i * 1.3) * 0.08;
  });

  // Torches flicker
  for (const t of torchLights) {
    t.light.intensity = t.base * (0.88 + 0.12 * Math.sin(elapsed * 9 + t.phase) * Math.sin(elapsed * 5.3 + t.phase * 2));
  }

  updateBursts(dt);

  // Camera shake on hit
  if (shake > 0) {
    shake = Math.max(0, shake - realDt);
    const k = shake * 0.5;
    camera.position.set(
      cameraBase.x + (Math.random() - 0.5) * k,
      cameraBase.y + (Math.random() - 0.5) * k,
      cameraBase.z + (Math.random() - 0.5) * k,
    );
  } else {
    camera.position.copy(cameraBase);
  }

  hud.update(game);
  composer.render();
});

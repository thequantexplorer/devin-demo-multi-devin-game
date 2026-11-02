import * as THREE from 'three';
import { createGame, stepGame } from './game.js';
import { buildLevel } from './systems/level.js';
import { readInput, createPlayerMesh } from './systems/player.js';
import { createEnemyMesh } from './systems/enemies.js';
import { createHud } from './systems/hud.js';
import { createAudio } from './systems/audio.js';
import level1 from './levels/level1.js';

const MAX_DT = 0.05;
const speedParam = Number(new URLSearchParams(window.location.search).get('speed'));
const speed = Number.isFinite(speedParam) && speedParam > 0 ? speedParam : 1;

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(5, 12, 8);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

const hud = createHud(document.getElementById('hud'));
const audio = createAudio(window.AudioContext || window.webkitAudioContext);

let game = createGame(level1);
const { level } = game;
const center = new THREE.Vector3((level.width - 1) / 2, 0, (level.height - 1) / 2);

const levelGroup = buildLevel(level);
scene.add(levelGroup);
const crystalMeshes = levelGroup.children.filter((m) => m.name === 'crystal');

const playerMesh = createPlayerMesh();
scene.add(playerMesh);
const enemyMeshes = game.enemies.map(() => {
  const mesh = createEnemyMesh();
  scene.add(mesh);
  return mesh;
});

function fitCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  // Keep the whole level in view from above and behind, whatever the window shape.
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const radius = Math.hypot(level.width, level.height) / 2 + 0.5;
  const distance = radius / Math.sin(Math.min(vFov, hFov) / 2);
  const dir = new THREE.Vector3(0, 1.4, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
fitCamera();
window.addEventListener('resize', fitCamera);

function newGame() {
  game = createGame(level1);
  window.__game = game;
}
window.__game = game;

const keys = new Set();
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
window.addEventListener('keydown', (event) => {
  if (GAME_KEYS.has(event.code)) event.preventDefault();
  if (event.code === 'KeyR' && !event.repeat) newGame();
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), MAX_DT) * speed;

  for (const event of stepGame(game, readInput(keys), dt)) audio.play(event);

  playerMesh.position.set(game.player.x, 0, game.player.z);
  playerMesh.visible = game.invulnerable <= 0 || Math.floor(game.invulnerable * 8) % 2 === 0;
  game.enemies.forEach((enemy, i) => enemyMeshes[i].position.set(enemy.x, 0, enemy.z));
  for (const mesh of crystalMeshes) {
    mesh.visible = !game.crystals[mesh.userData.index].taken;
    mesh.rotation.y += dt * 2;
  }

  hud.update(game);
  renderer.render(scene, camera);
});

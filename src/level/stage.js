import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CAMERA_FOV, CAMERA_MARGIN, CAMERA_TILT, COLORS, TILE_SIZE, WALL_HEIGHT } from '../config.js';

const BLOOM_STRENGTH = 0.85;
const BLOOM_RADIUS = 0.45;
const BLOOM_THRESHOLD = 0.75;
const FOG_NEAR_FACTOR = 0.9;
const FOG_FAR_FACTOR = 2.2;

export function levelCenter(level) {
  return new THREE.Vector3(((level.width - 1) / 2) * TILE_SIZE, 0, ((level.height - 1) / 2) * TILE_SIZE);
}

function levelCorners(level) {
  const x0 = -TILE_SIZE / 2;
  const z0 = -TILE_SIZE / 2;
  const x1 = (level.width - 0.5) * TILE_SIZE;
  const z1 = (level.height - 0.5) * TILE_SIZE;
  const pts = [];
  for (const x of [x0, x1]) for (const y of [0, WALL_HEIGHT]) for (const z of [z0, z1]) pts.push(new THREE.Vector3(x, y, z));
  return pts;
}

// Places the camera south of the level (+z), CAMERA_TILT degrees above the
// horizon, looking at the level center, at the smallest distance where every
// corner of the level (incl. wall tops) fits, then backs off by CAMERA_MARGIN.
export function frameCamera(camera, level, aspect) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const tilt = THREE.MathUtils.degToRad(CAMERA_TILT);
  const center = levelCenter(level);
  const back = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
  const right = new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3(0, Math.cos(tilt), -Math.sin(tilt));

  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov ?? CAMERA_FOV) / 2);
  const tanH = tanV * safeAspect;

  let distance = 0;
  const rel = new THREE.Vector3();
  for (const p of levelCorners(level)) {
    rel.subVectors(p, center);
    const along = rel.dot(back);
    const r = Math.abs(rel.dot(right)) * CAMERA_MARGIN;
    const u = Math.abs(rel.dot(up)) * CAMERA_MARGIN;
    distance = Math.max(distance, r / tanH + along, u / tanV + along);
  }

  camera.aspect = safeAspect;
  camera.position.copy(center).addScaledVector(back, distance);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.near = Math.max(0.1, distance * 0.05);
  camera.far = distance * 4;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { position: camera.position.clone(), target: center, distance };
}

function containerSize(container) {
  const w = container?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 0) || 800;
  const h = container?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 0) || 600;
  return { width: w, height: h };
}

export function createStage(container) {
  if (typeof document === 'undefined') {
    throw new Error('WebGL is not available: no document to create a canvas in.');
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    throw new Error(`WebGL is not available in this browser (${err?.message ?? err}).`);
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  // three r18x removed PCFSoftShadowMap; PCFShadowMap + light.shadow.radius gives soft edges.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2));
  renderer.setClearColor(COLORS.background, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  scene.fog = new THREE.Fog(COLORS.background, 10, 60);

  const { width, height } = containerSize(container);
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 200);

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.setAttribute?.('aria-label', 'Crystal Keep game view');
  container.appendChild(canvas);

  const cameraBase = new THREE.Vector3();
  let currentLevel = null;

  function reframe() {
    if (!currentLevel) return;
    const { distance } = frameCamera(camera, currentLevel, camera.aspect);
    cameraBase.copy(camera.position);
    scene.fog.near = distance * FOG_NEAR_FACTOR;
    scene.fog.far = distance * FOG_FAR_FACTOR;
  }

  function resize() {
    const size = containerSize(container);
    renderer.setSize(size.width, size.height);
    composer.setSize(size.width, size.height);
    bloom.resolution?.set(size.width, size.height);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    reframe();
  }

  function setLevel(level) {
    currentLevel = level;
    reframe();
  }

  function render() {
    composer.render();
  }

  resize();

  return { renderer, scene, camera, composer, setLevel, resize, render, cameraBase };
}

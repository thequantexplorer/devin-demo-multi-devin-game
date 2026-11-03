import * as THREE from 'three';
import { COLORS, TILE_SIZE, WALL_HEIGHT, tileToWorld } from '../config.js';
import { isWall } from './level.js';
import { createBrickTexture, createFloorTexture } from './textures.js';

const TORCH_LIGHT_INTENSITY = 7;
const TORCH_LIGHT_DISTANCE = 6 * TILE_SIZE;
const TORCH_HEIGHT = WALL_HEIGHT * 0.72;
const SUN_INTENSITY = 1.05;
const TOP_TORCH_LIGHT_FACTOR = 0.5;
const HEMI_INTENSITY = 0.45;
const AMBIENT_INTENSITY = 0.12;
const SHADOW_MAP_SIZE = 2048;

const NEIGHBORS = [
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
];

// Direction from a wall tile toward the floor it faces. A torch with no
// floor next to it faces the level interior and sits on the wall top.
export function torchFacing(level, x, y) {
  const open = NEIGHBORS.find(({ dx, dy }) => !isWall(level, x + dx, y + dy));
  if (open) return open;
  const toCx = (level.width - 1) / 2 - x;
  const toCy = (level.height - 1) / 2 - y;
  if (Math.abs(toCy) >= Math.abs(toCx)) return { dx: 0, dy: toCy < 0 ? -1 : 1 };
  return { dx: toCx < 0 ? -1 : 1, dy: 0 };
}

export function torchMount(level, x, y) {
  const { dx, dy } = torchFacing(level, x, y);
  return isWall(level, x + dx, y + dy) ? 'top' : 'wall';
}

function buildFloor(level) {
  const texture = createFloorTexture();
  if (texture) texture.repeat.set(level.width / 2, level.height / 2);
  const material = new THREE.MeshStandardMaterial({
    color: texture ? 0xffffff : COLORS.floor,
    map: texture,
    roughness: 0.92,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(level.width * TILE_SIZE, level.height * TILE_SIZE), material);
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(((level.width - 1) / 2) * TILE_SIZE, 0, ((level.height - 1) / 2) * TILE_SIZE);
  floor.receiveShadow = true;
  return floor;
}

function buildWalls(level) {
  const group = new THREE.Group();
  group.name = 'walls';
  const brick = createBrickTexture();
  const side = new THREE.MeshStandardMaterial({
    color: brick ? 0xffffff : COLORS.wall,
    map: brick,
    roughness: 0.85,
    metalness: 0.0,
  });
  const top = new THREE.MeshStandardMaterial({ color: COLORS.wallTop, roughness: 0.75, metalness: 0.0 });
  // BoxGeometry groups: +x, -x, +y (top), -y, +z, -z
  const materials = [side, side, top, side, side, side];
  const geometry = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (!isWall(level, x, y)) continue;
      const w = tileToWorld(x, y);
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.name = 'wall';
      mesh.position.set(w.x, WALL_HEIGHT / 2, w.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.tile = { x, y };
      group.add(mesh);
    }
  }
  return group;
}

function buildTorches(level) {
  const group = new THREE.Group();
  group.name = 'torches';
  const bracketGeo = new THREE.BoxGeometry(0.08, 0.22, 0.08);
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.6, metalness: 0.4 });
  const flameGeo = new THREE.ConeGeometry(0.06, 0.18, 10);
  const flameMat = new THREE.MeshStandardMaterial({
    color: COLORS.torch,
    emissive: COLORS.torch,
    emissiveIntensity: 2.5,
    roughness: 1,
  });

  for (const { x, y } of level.torches) {
    const facing = torchFacing(level, x, y);
    const mount = torchMount(level, x, y);
    const w = tileToWorld(x, y);
    const torch = new THREE.Group();
    torch.name = 'torch';
    torch.userData.tile = { x, y };
    torch.userData.facing = facing;
    torch.userData.mount = mount;
    if (mount === 'top') {
      torch.position.set(w.x, WALL_HEIGHT - TORCH_HEIGHT + 0.12, w.z);
    } else {
      const face = TILE_SIZE / 2;
      torch.position.set(w.x + facing.dx * face, 0, w.z + facing.dy * face);
    }

    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.name = 'torchBracket';
    bracket.position.set(facing.dx * 0.06, TORCH_HEIGHT - 0.1, facing.dy * 0.06);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.name = 'torchFlame';
    flame.position.set(facing.dx * 0.08, TORCH_HEIGHT + 0.08, facing.dy * 0.08);

    const intensity = TORCH_LIGHT_INTENSITY * (mount === 'top' ? TOP_TORCH_LIGHT_FACTOR : 1);
    const light = new THREE.PointLight(COLORS.torch, intensity, TORCH_LIGHT_DISTANCE, 2);
    light.name = 'torchLight';
    light.position.set(facing.dx * 0.3, TORCH_HEIGHT + 0.1, facing.dy * 0.3);

    torch.add(bracket, flame, light);
    group.add(torch);
  }
  return group;
}

function buildLights(level) {
  const group = new THREE.Group();
  group.name = 'lights';
  const cx = ((level.width - 1) / 2) * TILE_SIZE;
  const cz = ((level.height - 1) / 2) * TILE_SIZE;
  const span = Math.max(level.width, level.height) * TILE_SIZE;

  const ambient = new THREE.AmbientLight(COLORS.ambient, AMBIENT_INTENSITY);
  ambient.name = 'ambient';
  const hemi = new THREE.HemisphereLight(COLORS.ambient, COLORS.background, HEMI_INTENSITY);
  hemi.name = 'hemisphere';

  const sun = new THREE.DirectionalLight(COLORS.sun, SUN_INTENSITY);
  sun.name = 'sun';
  sun.position.set(cx - span * 0.35, span * 0.9, cz + span * 0.45);
  sun.target.position.set(cx, 0, cz);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  const half = Math.hypot(level.width, level.height) * TILE_SIZE * 0.5 + TILE_SIZE;
  const cam = sun.shadow.camera;
  cam.left = -half;
  cam.right = half;
  cam.top = half;
  cam.bottom = -half;
  cam.near = 0.5;
  cam.far = sun.position.distanceTo(sun.target.position) + half * 2;
  cam.updateProjectionMatrix();
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;

  group.add(ambient, hemi, sun, sun.target);
  return group;
}

export function createLevelView(scene, level) {
  const group = new THREE.Group();
  group.name = 'level';
  group.add(buildFloor(level), buildWalls(level), buildTorches(level), buildLights(level));
  scene.add(group);
  return { group };
}

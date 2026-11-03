// Rendering for the patrolling guards: red-armored figures carrying a lantern.
import * as THREE from 'three';
import { COLORS, tileToWorld } from '../config.js';

const TURN_SPEED = 12; // radians per second the guard turns toward its heading
const WALK_BOB_HEIGHT = 0.06; // world units
const WALK_BOB_SPEED = 11; // radians per second
const IDLE_BOB_HEIGHT = 0.015;
const IDLE_BOB_SPEED = 2.4;
const LANTERN_INTENSITY = 3;
const LANTERN_DISTANCE = 3.5;
const LANTERN_FLICKER = 0.12; // fraction of intensity

const STEEL = 0x2a2e36;

function createParts() {
  return {
    geometries: {
      body: new THREE.CapsuleGeometry(0.22, 0.3, 6, 16),
      pauldron: new THREE.SphereGeometry(0.1, 12, 8),
      helmet: new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      crest: new THREE.BoxGeometry(0.04, 0.08, 0.26),
      visor: new THREE.BoxGeometry(0.2, 0.035, 0.03),
      belt: new THREE.TorusGeometry(0.215, 0.025, 6, 20),
      handle: new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6),
      lantern: new THREE.SphereGeometry(0.06, 12, 8),
    },
    materials: {
      armor: new THREE.MeshStandardMaterial({ color: COLORS.guard, metalness: 0.55, roughness: 0.4 }),
      steel: new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.7, roughness: 0.35 }),
      visor: new THREE.MeshStandardMaterial({
        color: COLORS.lantern,
        emissive: COLORS.lantern,
        emissiveIntensity: 1.6,
      }),
      lantern: new THREE.MeshStandardMaterial({
        color: COLORS.lantern,
        emissive: COLORS.lantern,
        emissiveIntensity: 2.4,
      }),
    },
  };
}

function mesh(geometry, material, name) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Local +z is the guard's front.
function buildGuard(parts, index) {
  const { geometries: g, materials: m } = parts;
  const group = new THREE.Group();
  group.name = `guard-${index}`;

  const model = new THREE.Group();
  model.name = 'model';
  group.add(model);

  const body = mesh(g.body, m.armor, 'body');
  body.position.y = 0.37;
  model.add(body);

  const belt = mesh(g.belt, m.steel, 'belt');
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.36;
  model.add(belt);

  for (const side of [-1, 1]) {
    const pauldron = mesh(g.pauldron, m.steel, 'pauldron');
    pauldron.position.set(0.2 * side, 0.55, 0);
    model.add(pauldron);
  }

  const helmet = mesh(g.helmet, m.steel, 'helmet');
  helmet.position.y = 0.66;
  model.add(helmet);

  const crest = mesh(g.crest, m.armor, 'crest');
  crest.position.set(0, 0.84, -0.01);
  model.add(crest);

  const visor = mesh(g.visor, m.visor, 'visor');
  visor.castShadow = false;
  visor.position.set(0, 0.72, 0.155);
  model.add(visor);

  const lanternGroup = new THREE.Group();
  lanternGroup.name = 'lantern';
  lanternGroup.position.set(0.25, 0.36, 0.16);
  const handle = mesh(g.handle, m.steel, 'lantern-handle');
  handle.position.y = 0.08;
  lanternGroup.add(handle);
  const glow = mesh(g.lantern, m.lantern, 'lantern-glow');
  glow.castShadow = false;
  lanternGroup.add(glow);
  const light = new THREE.PointLight(COLORS.lantern, LANTERN_INTENSITY, LANTERN_DISTANCE, 2);
  light.name = 'lantern-light';
  lanternGroup.add(light);
  model.add(lanternGroup);

  return { group, model, light, phase: index * 1.7, lastX: null, lastY: null };
}

export function headingFor(guard) {
  const dx = guard.axis === 'y' ? 0 : guard.dir;
  const dz = guard.axis === 'y' ? guard.dir : 0;
  return Math.atan2(dx, dz);
}

function turnToward(current, target, maxStep) {
  let delta = (target - current) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

export function createGuardView(scene, guards) {
  const parts = createParts();
  const group = new THREE.Group();
  group.name = 'guards';
  const views = guards.map((_, i) => buildGuard(parts, i));
  for (const view of views) group.add(view.group);
  scene.add(group);

  function update(currentGuards, dt = 0, time = 0) {
    const step = Math.max(dt, 0) * TURN_SPEED;
    currentGuards.forEach((guard, i) => {
      const view = views[i];
      if (!view) return;
      const world = tileToWorld(guard.x, guard.y);
      view.group.position.set(world.x, 0, world.z);

      const target = headingFor(guard);
      const first = view.lastX === null;
      view.group.rotation.y = first ? target : turnToward(view.group.rotation.y, target, step);

      const moving = !first && (guard.x !== view.lastX || guard.y !== view.lastY);
      const t = time + view.phase;
      if (moving) {
        view.model.position.y = Math.abs(Math.sin(t * WALK_BOB_SPEED)) * WALK_BOB_HEIGHT;
        view.model.rotation.z = Math.sin(t * WALK_BOB_SPEED) * 0.06;
      } else {
        view.model.position.y = (Math.sin(t * IDLE_BOB_SPEED) * 0.5 + 0.5) * IDLE_BOB_HEIGHT;
        view.model.rotation.z = 0;
      }
      view.light.intensity =
        LANTERN_INTENSITY * (1 + LANTERN_FLICKER * Math.sin(t * 13) * Math.sin(t * 7.3));

      view.lastX = guard.x;
      view.lastY = guard.y;
    });
  }

  function dispose() {
    scene.remove(group);
    Object.values(parts.geometries).forEach((g) => g.dispose());
    Object.values(parts.materials).forEach((m) => m.dispose());
  }

  update(guards, 0, 0);
  return { group, update, dispose };
}

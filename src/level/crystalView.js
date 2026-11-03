import * as THREE from 'three';
import {
  COLORS,
  CRYSTAL_BOB_HEIGHT,
  CRYSTAL_BOB_SPEED,
  CRYSTAL_HEIGHT,
  CRYSTAL_SPIN_SPEED,
  TILE_SIZE,
  tileToWorld,
} from '../config.js';

const CRYSTAL_RADIUS = 0.2 * TILE_SIZE;
const CRYSTAL_STRETCH = 1.45;
const CRYSTAL_EMISSIVE = 2.2;
const CRYSTAL_LIGHT_INTENSITY = 1.6;
const CRYSTAL_LIGHT_DISTANCE = 2.5 * TILE_SIZE;

export function createCrystalView(scene, crystals) {
  const group = new THREE.Group();
  group.name = 'crystals';
  const geometry = new THREE.OctahedronGeometry(CRYSTAL_RADIUS, 0);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.crystal,
    emissive: COLORS.crystal,
    emissiveIntensity: CRYSTAL_EMISSIVE,
    roughness: 0.15,
    metalness: 0.1,
    flatShading: true,
  });

  const items = crystals.map((crystal, index) => {
    const w = tileToWorld(crystal.x, crystal.y);
    const holder = new THREE.Group();
    holder.name = 'crystal';
    holder.userData.index = index;
    holder.position.set(w.x, CRYSTAL_HEIGHT, w.z);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'crystalMesh';
    mesh.scale.set(1, CRYSTAL_STRETCH, 1);
    mesh.castShadow = true;

    const light = new THREE.PointLight(COLORS.crystal, CRYSTAL_LIGHT_INTENSITY, CRYSTAL_LIGHT_DISTANCE, 2);
    light.name = 'crystalLight';

    holder.add(mesh, light);
    holder.visible = !crystal.collected;
    group.add(holder);
    return { holder, mesh, phase: index * 1.3 };
  });

  scene.add(group);

  function update(dt, time) {
    for (const item of items) {
      item.mesh.rotation.y += CRYSTAL_SPIN_SPEED * dt;
      item.holder.position.y = CRYSTAL_HEIGHT + Math.sin(time * CRYSTAL_BOB_SPEED + item.phase) * CRYSTAL_BOB_HEIGHT;
    }
  }

  function hide(index) {
    if (items[index]) items[index].holder.visible = false;
  }

  function reset() {
    for (const item of items) item.holder.visible = true;
  }

  function positionOf(index) {
    const item = items[index];
    if (!item) return null;
    const { x, y, z } = item.holder.position;
    return { x, y, z };
  }

  return { group, update, hide, reset, positionOf };
}

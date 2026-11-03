// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createLevelView, torchFacing, torchMount } from './levelView.js';
import { isWall, parseLevel } from './level.js';
import { LEVEL_MAP } from './map.js';
import { COLORS, WALL_HEIGHT } from '../config.js';

const level = parseLevel(LEVEL_MAP);

function build() {
  const scene = new THREE.Scene();
  const view = createLevelView(scene, level);
  return { scene, view };
}

const byName = (root, name) => {
  const out = [];
  root.traverse((o) => o.name === name && out.push(o));
  return out;
};

describe('createLevelView', () => {
  it('adds a group to the scene', () => {
    const { scene, view } = build();
    expect(view.group).toBeInstanceOf(THREE.Group);
    expect(view.group.parent).toBe(scene);
  });

  it('builds a shadow-receiving floor covering the level', () => {
    const { view } = build();
    const [floor] = byName(view.group, 'floor');
    expect(floor.receiveShadow).toBe(true);
    expect(floor.position.y).toBe(0);
    floor.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    floor.geometry.boundingBox.getSize(size);
    expect(size.x).toBe(level.width);
    expect(size.y).toBe(level.height);
    expect(floor.position.x).toBeCloseTo((level.width - 1) / 2);
    expect(floor.position.z).toBeCloseTo((level.height - 1) / 2);
    // jsdom has no 2D canvas: falls back to the floor color
    expect(floor.material.map).toBeNull();
    expect(floor.material.color.getHex()).toBe(COLORS.floor);
  });

  it('builds one wall box per wall tile with a lighter top', () => {
    const { view } = build();
    const walls = byName(view.group, 'wall');
    let count = 0;
    for (let y = 0; y < level.height; y += 1)
      for (let x = 0; x < level.width; x += 1) if (isWall(level, x, y)) count += 1;
    expect(walls).toHaveLength(count);
    for (const w of walls) {
      expect(w.castShadow).toBe(true);
      expect(w.receiveShadow).toBe(true);
      expect(w.position.y).toBeCloseTo(WALL_HEIGHT / 2);
      expect(isWall(level, w.userData.tile.x, w.userData.tile.y)).toBe(true);
      expect(w.position.x).toBe(w.userData.tile.x);
      expect(w.position.z).toBe(w.userData.tile.y);
    }
    const mats = walls[0].material;
    expect(mats).toHaveLength(6);
    expect(mats[2].color.getHex()).toBe(COLORS.wallTop);
    expect(mats[0].color.getHex()).toBe(COLORS.wall);
  });

  it('puts a torch with a warm light on the floor side of each T tile', () => {
    const { view } = build();
    const torches = byName(view.group, 'torch');
    expect(torches).toHaveLength(level.torches.length);
    for (const t of torches) {
      const { x, y } = t.userData.tile;
      expect(level.tiles[y][x]).toBe('T');
      const { dx, dy } = t.userData.facing;
      const light = t.children.find((c) => c.isPointLight);
      const flame = t.children.find((c) => c.name === 'torchFlame');
      expect(light.color.getHex()).toBe(COLORS.torch);
      expect(flame).toBeTruthy();
      const lp = new THREE.Vector3();
      light.getWorldPosition(lp);
      if (t.userData.mount === 'wall') {
        expect(isWall(level, x + dx, y + dy)).toBe(false);
        // light sits past the wall face, over the floor tile it faces
        expect(Math.round(lp.x)).toBe(x + dx);
        expect(Math.round(lp.z)).toBe(y + dy);
        expect(lp.y).toBeGreaterThan(0);
        expect(lp.y).toBeLessThan(WALL_HEIGHT);
      } else {
        // no floor beside it: burns on the wall top, above the wall
        expect(lp.y).toBeGreaterThan(WALL_HEIGHT);
      }
      // the light never ends up outside the map
      expect(lp.x).toBeGreaterThan(-0.5);
      expect(lp.x).toBeLessThan(level.width - 0.5);
      expect(lp.z).toBeGreaterThan(-0.5);
      expect(lp.z).toBeLessThan(level.height - 0.5);
    }
  });

  it('torchFacing picks the open side, else faces the interior on the wall top', () => {
    expect(torchFacing(level, 4, 0)).toEqual({ dx: 0, dy: 1 });
    expect(torchFacing(level, 12, 12)).toEqual({ dx: 0, dy: -1 });
    expect(torchFacing(level, 0, 5)).toEqual({ dx: 1, dy: 0 });
    expect(torchFacing(level, 16, 5)).toEqual({ dx: -1, dy: 0 });
    expect(torchMount(level, 4, 0)).toBe('wall');
    // (4, 12) has walls on every side in the shipped map
    expect(torchFacing(level, 4, 12)).toEqual({ dx: 0, dy: -1 });
    expect(torchMount(level, 4, 12)).toBe('top');
  });

  it('adds dim cool fill light and one warm shadow-casting sun sized to the level', () => {
    const { view } = build();
    const lights = [];
    view.group.traverse((o) => o.isLight && lights.push(o));
    const dirs = lights.filter((l) => l.isDirectionalLight);
    expect(dirs).toHaveLength(1);
    const sun = dirs[0];
    expect(sun.castShadow).toBe(true);
    expect(sun.color.getHex()).toBe(COLORS.sun);
    expect(sun.target.parent).toBeTruthy();
    expect(sun.target.position.x).toBeCloseTo((level.width - 1) / 2);
    const cam = sun.shadow.camera;
    expect(cam.right - cam.left).toBeGreaterThanOrEqual(Math.hypot(level.width, level.height));
    expect(cam.top - cam.bottom).toBeGreaterThanOrEqual(Math.hypot(level.width, level.height));
    expect(cam.far).toBeGreaterThan(sun.position.distanceTo(sun.target.position));

    const fill = lights.filter((l) => l.isAmbientLight || l.isHemisphereLight);
    expect(fill.length).toBeGreaterThanOrEqual(1);
    for (const l of fill) {
      expect(l.color.getHex()).toBe(COLORS.ambient);
      expect(l.intensity).toBeLessThan(sun.intensity);
    }
    const shadowCasters = lights.filter((l) => l.castShadow);
    expect(shadowCasters).toEqual([sun]);
  });
});

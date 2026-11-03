// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { frameCamera, createStage, levelCenter } from './stage.js';
import { parseLevel } from './level.js';
import { LEVEL_MAP } from './map.js';
import { CAMERA_FOV, CAMERA_MARGIN, CAMERA_TILT, TILE_SIZE, WALL_HEIGHT } from '../config.js';

const level = parseLevel(LEVEL_MAP);

function corners(lvl) {
  const out = [];
  for (const x of [-0.5, lvl.width - 0.5])
    for (const y of [0, WALL_HEIGHT])
      for (const z of [-0.5, lvl.height - 0.5]) out.push(new THREE.Vector3(x * TILE_SIZE, y, z * TILE_SIZE));
  return out;
}

function ndcExtent(camera, lvl) {
  let mx = 0;
  let my = 0;
  for (const p of corners(lvl)) {
    const v = p.clone().project(camera);
    mx = Math.max(mx, Math.abs(v.x));
    my = Math.max(my, Math.abs(v.y));
    expect(v.z).toBeGreaterThan(-1);
    expect(v.z).toBeLessThan(1);
  }
  return { mx, my };
}

describe('frameCamera', () => {
  for (const aspect of [16 / 9, 4 / 3, 1, 9 / 16, 0.5, 2.5]) {
    it(`fits the whole level at aspect ${aspect.toFixed(2)}`, () => {
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
      frameCamera(camera, level, aspect);
      expect(camera.aspect).toBeCloseTo(aspect);
      const { mx, my } = ndcExtent(camera, level);
      expect(mx).toBeLessThanOrEqual(1 / CAMERA_MARGIN + 1e-6);
      expect(my).toBeLessThanOrEqual(1 / CAMERA_MARGIN + 1e-6);
      // tight in at least one direction
      expect(Math.max(mx, my)).toBeGreaterThan(1 / CAMERA_MARGIN - 0.01);
    });
  }

  it('looks at the level center from the south at CAMERA_TILT degrees', () => {
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    const { position, target, distance } = frameCamera(camera, level, 16 / 9);
    const center = levelCenter(level);
    expect(target.x).toBeCloseTo((level.width - 1) / 2);
    expect(target.z).toBeCloseTo((level.height - 1) / 2);
    expect(position.x).toBeCloseTo(center.x);
    expect(position.z).toBeGreaterThan(center.z);
    const offset = position.clone().sub(center);
    expect(offset.length()).toBeCloseTo(distance);
    const elevation = THREE.MathUtils.radToDeg(Math.asin(offset.y / offset.length()));
    expect(elevation).toBeCloseTo(CAMERA_TILT);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    expect(dir.dot(center.clone().sub(position).normalize())).toBeCloseTo(1);
    expect(camera.near).toBeLessThan(distance * 0.5);
    expect(camera.far).toBeGreaterThan(distance * 2);
  });

  it('backs off further for a narrow aspect', () => {
    const cam = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    const wide = frameCamera(cam, level, 2).distance;
    const narrow = frameCamera(cam, level, 0.5).distance;
    expect(narrow).toBeGreaterThan(wide);
  });

  it('treats an invalid aspect as 1', () => {
    const cam = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    frameCamera(cam, level, 0);
    expect(cam.aspect).toBe(1);
    frameCamera(cam, level, NaN);
    expect(cam.aspect).toBe(1);
  });
});

describe('createStage without WebGL', () => {
  it('throws a clear Error and appends nothing', () => {
    const container = document.createElement('div');
    expect(() => createStage(container)).toThrow(/WebGL is not available/);
    expect(container.children).toHaveLength(0);
  });
});

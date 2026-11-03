import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BLINK_RATE, COLORS, PLAYER_MOVE_TIME, SAFE_TIME, tileToWorld } from '../config.js';
import { createPlayer, respawn, tryMove, updatePlayer } from './player.js';
import { createPlayerView, facingToAngle } from './playerView.js';

const open = () => false;

function setup(start = { x: 2, y: 3 }) {
  const scene = new THREE.Scene();
  const view = createPlayerView(scene);
  const player = createPlayer(start);
  view.snapTo(start.x, start.y);
  return { scene, view, player, rig: view.group.getObjectByName('playerRig') };
}

function meshes(group) {
  const out = [];
  group.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
}

function step(view, player, total, dt = 1 / 60, startTime = 0) {
  let t = startTime;
  for (let elapsed = 0; elapsed < total - 1e-9; elapsed += dt) {
    updatePlayer(player, dt);
    t += dt;
    view.update(player, dt, t);
  }
  return t;
}

describe('createPlayerView scene graph', () => {
  it('adds one group to the scene and returns the API', () => {
    const { scene, view } = setup();
    expect(view.group).toBeInstanceOf(THREE.Group);
    expect(scene.children).toContain(view.group);
    expect(typeof view.snapTo).toBe('function');
    expect(typeof view.update).toBe('function');
  });

  it('works with any Object3D parent', () => {
    const parent = new THREE.Object3D();
    const view = createPlayerView(parent);
    expect(view.group.parent).toBe(parent);
  });

  it('has a warm-white capsule body above a head, with a visor in front', () => {
    const { view } = setup();
    const body = view.group.getObjectByName('body');
    const head = view.group.getObjectByName('head');
    const visor = view.group.getObjectByName('visor');
    expect(body.geometry).toBeInstanceOf(THREE.CapsuleGeometry);
    expect(head.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(body.material.color.getHex()).toBe(new THREE.Color(COLORS.player).getHex());
    expect(head.material.color.getHex()).toBe(new THREE.Color(COLORS.player).getHex());
    expect(head.position.y).toBeGreaterThan(body.position.y);
    expect(visor.position.z).toBeGreaterThan(0);
    expect(view.group.getObjectByName('backpack').position.z).toBeLessThan(0);
  });

  it('stands on the floor and stays below the wall tops', () => {
    const { view } = setup();
    const box = new THREE.Box3().setFromObject(view.group);
    expect(box.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(box.max.y).toBeLessThan(1.1);
    expect(box.max.x - box.min.x).toBeLessThan(1);
  });

  it('every mesh casts shadows', () => {
    const { view } = setup();
    const list = meshes(view.group);
    expect(list.length).toBeGreaterThanOrEqual(3);
    for (const m of list) expect(m.castShadow).toBe(true);
  });

  it('has a small, non-shadow-casting glow light', () => {
    const { view } = setup();
    const light = view.group.getObjectByName('playerGlow');
    expect(light).toBeInstanceOf(THREE.PointLight);
    expect(light.castShadow).toBe(false);
    expect(light.distance).toBeGreaterThan(0);
  });
});

describe('snapTo', () => {
  it('places the group on the tile with no easing', () => {
    const { view } = setup();
    view.snapTo(7, 4);
    const w = tileToWorld(7, 4);
    expect(view.group.position.x).toBe(w.x);
    expect(view.group.position.z).toBe(w.z);
    expect(view.group.position.y).toBe(0);
  });

  it('stays put on the next update when the player is there', () => {
    const { view, player } = setup({ x: 5, y: 5 });
    view.update(player, 1 / 60, 0);
    const w = tileToWorld(5, 5);
    expect(view.group.position.x).toBe(w.x);
    expect(view.group.position.z).toBe(w.z);
  });

  it('cancels a running tween', () => {
    const { view, player } = setup({ x: 1, y: 1 });
    tryMove(player, 1, 0, open);
    view.update(player, PLAYER_MOVE_TIME / 3, 0);
    view.snapTo(player.x, player.y);
    expect(view.group.position.x).toBe(tileToWorld(2, 1).x);
    view.update(player, 1 / 60, 0);
    expect(view.group.position.x).toBe(tileToWorld(2, 1).x);
  });
});

describe('update: movement', () => {
  it('eases toward the new tile and arrives after about PLAYER_MOVE_TIME', () => {
    const { view, player, rig } = setup({ x: 1, y: 1 });
    tryMove(player, 1, 0, open);
    const from = tileToWorld(1, 1).x;
    const to = tileToWorld(2, 1).x;

    view.update(player, PLAYER_MOVE_TIME / 2, 0);
    const mid = view.group.position.x;
    expect(mid).toBeGreaterThan(from);
    expect(mid).toBeLessThan(to);
    expect(rig.position.y).toBeGreaterThan(0.05); // hop

    view.update(player, PLAYER_MOVE_TIME / 2 + 1e-6, 0);
    expect(view.group.position.x).toBeCloseTo(to, 6);
    expect(rig.position.y).toBeLessThan(0.02);
  });

  it('moves monotonically toward the target', () => {
    const { view, player } = setup({ x: 1, y: 1 });
    tryMove(player, 0, 1, open);
    let last = view.group.position.z;
    for (let i = 0; i < 12; i++) {
      view.update(player, PLAYER_MOVE_TIME / 10, 0);
      expect(view.group.position.z).toBeGreaterThanOrEqual(last);
      last = view.group.position.z;
    }
    expect(last).toBeCloseTo(tileToWorld(1, 2).z, 6);
  });

  it('handles a new move starting mid-tween smoothly', () => {
    const { view, player } = setup({ x: 1, y: 1 });
    tryMove(player, 1, 0, open);
    view.update(player, PLAYER_MOVE_TIME * 0.9, 0);
    const x = view.group.position.x;
    player.moveCooldown = 0;
    tryMove(player, 1, 0, open);
    view.update(player, 0.001, 0);
    expect(Math.abs(view.group.position.x - x)).toBeLessThan(0.1);
    step(view, player, PLAYER_MOVE_TIME * 1.5);
    expect(view.group.position.x).toBeCloseTo(tileToWorld(3, 1).x, 6);
  });

  it('jumps (no tween) when the player teleports far, e.g. a forgotten snapTo on respawn', () => {
    const { view, player } = setup({ x: 1, y: 1 });
    player.x = 9;
    player.y = 7;
    view.update(player, 1 / 60, 0);
    const w = tileToWorld(9, 7);
    expect(view.group.position.x).toBe(w.x);
    expect(view.group.position.z).toBe(w.z);
  });

  it('places the player on its tile if update is called before snapTo', () => {
    const view = createPlayerView(new THREE.Scene());
    const player = createPlayer({ x: 4, y: 6 });
    view.update(player, 1 / 60, 0);
    expect(view.group.position.x).toBe(tileToWorld(4, 6).x);
    expect(view.group.position.z).toBe(tileToWorld(4, 6).z);
  });

  it('survives dt = 0', () => {
    const { view, player } = setup({ x: 1, y: 1 });
    tryMove(player, 1, 0, open);
    view.update(player, 0, 0);
    expect(Number.isFinite(view.group.position.x)).toBe(true);
    expect(Number.isFinite(view.group.getObjectByName('playerRig').rotation.y)).toBe(true);
  });
});

describe('update: facing', () => {
  it('maps facing to angles with +z (down) at 0', () => {
    expect(facingToAngle({ dx: 0, dy: 1 })).toBeCloseTo(0);
    expect(facingToAngle({ dx: 1, dy: 0 })).toBeCloseTo(Math.PI / 2);
    expect(facingToAngle({ dx: -1, dy: 0 })).toBeCloseTo(-Math.PI / 2);
    expect(Math.abs(facingToAngle({ dx: 0, dy: -1 }))).toBeCloseTo(Math.PI);
    expect(facingToAngle({ dx: 0, dy: 0 })).toBe(0);
    expect(facingToAngle(undefined)).toBe(0);
  });

  it.each([
    [1, 0],
    [-1, 0],
    [0, -1],
    [0, 1],
  ])('turns the model so its visor points along (%i, %i)', (dx, dy) => {
    const { view, player } = setup({ x: 3, y: 3 });
    tryMove(player, dx, dy, () => true); // turn in place
    step(view, player, 0.5);
    const visor = view.group.getObjectByName('visor');
    const head = view.group.getObjectByName('head');
    view.group.updateMatrixWorld(true);
    const v = visor.getWorldPosition(new THREE.Vector3());
    const h = head.getWorldPosition(new THREE.Vector3());
    const dir = v.sub(h).setY(0).normalize();
    expect(dir.x).toBeCloseTo(dx, 3);
    expect(dir.z).toBeCloseTo(dy, 3);
  });

  it('turns gradually rather than instantly', () => {
    const { view, player, rig } = setup({ x: 3, y: 3 });
    tryMove(player, 1, 0, () => true);
    view.update(player, 1 / 60, 0);
    expect(rig.rotation.y).toBeGreaterThan(0);
    expect(rig.rotation.y).toBeLessThan(Math.PI / 2);
  });

  it('takes the short way around', () => {
    const { view, player, rig } = setup({ x: 3, y: 3 });
    tryMove(player, -1, 0, () => true);
    step(view, player, 0.5);
    expect(rig.rotation.y).toBeCloseTo(-Math.PI / 2, 3);
    tryMove(player, 0, -1, () => true);
    view.update(player, 1 / 60, 0);
    // from -90deg to 180deg the short way is through -135deg, not through 0
    expect(rig.rotation.y).toBeLessThan(-Math.PI / 2);
  });
});

describe('update: blinking while safe', () => {
  it('is visible when not safe', () => {
    const { view, player } = setup();
    view.group.visible = false;
    view.update(player, 1 / 60, 0);
    expect(view.group.visible).toBe(true);
  });

  it('toggles visibility at BLINK_RATE while safe, then ends visible', () => {
    const { view, player } = setup({ x: 1, y: 1 });
    respawn(player, { x: 1, y: 1 });
    view.snapTo(1, 1);
    const dt = 1 / 240;
    const samples = [];
    let elapsed = 0;
    while (elapsed < SAFE_TIME + 0.2) {
      updatePlayer(player, dt);
      elapsed += dt;
      view.update(player, dt, elapsed);
      samples.push(view.group.visible);
    }
    let toggles = 0;
    for (let i = 1; i < samples.length; i++) if (samples[i] !== samples[i - 1]) toggles++;
    const expected = SAFE_TIME * BLINK_RATE * 2;
    expect(toggles).toBeGreaterThanOrEqual(expected - 2);
    expect(toggles).toBeLessThanOrEqual(expected + 2);
    expect(samples.some((v) => !v)).toBe(true);
    expect(samples[samples.length - 1]).toBe(true);
  });
});

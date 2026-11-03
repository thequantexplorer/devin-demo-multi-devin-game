// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

const composerCalls = vi.hoisted(() => ({ passes: [], renders: 0, sizes: [] }));

vi.mock('three', async (importOriginal) => {
  const THREE = await importOriginal();
  class FakeRenderer {
    constructor(params) {
      this.params = params;
      this.domElement = document.createElement('canvas');
      this.shadowMap = { enabled: false, type: null };
      this.sizes = [];
    }
    setSize(w, h) {
      this.sizes.push([w, h]);
    }
    setPixelRatio(r) {
      this.pixelRatio = r;
    }
    setClearColor() {}
  }
  return { ...THREE, WebGLRenderer: FakeRenderer };
});

vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: class {
    constructor(renderer) {
      this.renderer = renderer;
      this.passes = composerCalls.passes;
    }
    addPass(p) {
      this.passes.push(p);
    }
    setSize(w, h) {
      composerCalls.sizes.push([w, h]);
    }
    render() {
      composerCalls.renders += 1;
    }
  },
}));
vi.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: class {
    constructor(scene, camera) {
      this.kind = 'render';
      this.scene = scene;
      this.camera = camera;
    }
  },
}));
vi.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', async () => {
  const { Vector2 } = await vi.importActual('three');
  return {
    UnrealBloomPass: class {
      constructor(resolution, strength, radius, threshold) {
        this.kind = 'bloom';
        this.resolution = new Vector2().copy(resolution);
        Object.assign(this, { strength, radius, threshold });
      }
    },
  };
});
vi.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({
  OutputPass: class {
    constructor() {
      this.kind = 'output';
    }
  },
}));

const THREE = await import('three');
const { createStage, frameCamera } = await import('./stage.js');
const { parseLevel } = await import('./level.js');
const { LEVEL_MAP } = await import('./map.js');
const { CAMERA_FOV, COLORS } = await import('../config.js');

function makeContainer(w, h) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: w });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });
  return el;
}

describe('createStage (mocked WebGL)', () => {
  it('sets up the renderer, scene, camera and composer', () => {
    const container = makeContainer(800, 450);
    const stage = createStage(container);
    const { renderer, scene, camera, composer } = stage;

    expect(renderer.params.antialias).toBe(true);
    expect(renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace);
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(renderer.shadowMap.type).toBe(THREE.PCFShadowMap);
    expect(container.contains(renderer.domElement)).toBe(true);

    expect(scene).toBeInstanceOf(THREE.Scene);
    expect(scene.background.getHex()).toBe(COLORS.background);
    expect(scene.fog).toBeInstanceOf(THREE.Fog);
    expect(scene.fog.color.getHex()).toBe(COLORS.background);

    expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(camera.fov).toBe(CAMERA_FOV);
    expect(camera.aspect).toBeCloseTo(800 / 450);

    expect(composer.passes.map((p) => p.kind)).toEqual(['render', 'bloom', 'output']);
    expect(composer.passes[0].scene).toBe(scene);
    expect(composer.passes[0].camera).toBe(camera);
    expect(stage.cameraBase).toBeInstanceOf(THREE.Vector3);
  });

  it('setLevel frames the camera and stores cameraBase', () => {
    const stage = createStage(makeContainer(800, 450));
    const level = parseLevel(LEVEL_MAP);
    stage.setLevel(level);
    const ref = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    frameCamera(ref, level, 800 / 450);
    expect(stage.cameraBase.distanceTo(ref.position)).toBeLessThan(1e-9);
    expect(stage.camera.position.distanceTo(stage.cameraBase)).toBeLessThan(1e-9);
    expect(stage.scene.fog.far).toBeGreaterThan(stage.scene.fog.near);
  });

  it('resize follows the container and re-frames', () => {
    const container = makeContainer(800, 450);
    const stage = createStage(container);
    stage.setLevel(parseLevel(LEVEL_MAP));
    const before = stage.cameraBase.clone();
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 400 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 800 });
    stage.resize();
    expect(stage.renderer.sizes.at(-1)).toEqual([400, 800]);
    expect(composerCalls.sizes.at(-1)).toEqual([400, 800]);
    expect(stage.camera.aspect).toBeCloseTo(0.5);
    expect(stage.cameraBase.equals(before)).toBe(false);
    expect(stage.camera.position.equals(stage.cameraBase)).toBe(true);
  });

  it('render goes through the composer', () => {
    const stage = createStage(makeContainer(320, 240));
    const n = composerCalls.renders;
    stage.render();
    expect(composerCalls.renders).toBe(n + 1);
  });
});

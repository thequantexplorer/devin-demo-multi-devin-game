// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createBrickTexture, createFloorTexture } from './textures.js';

function fakeContext() {
  return new Proxy(
    { calls: 0 },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => {
          target.calls += 1;
        };
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    },
  );
}

afterEach(() => vi.restoreAllMocks());

describe('textures', () => {
  it('returns null when no 2D context is available (jsdom)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(createFloorTexture()).toBeNull();
    expect(createBrickTexture()).toBeNull();
  });

  it('returns null when getContext throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('nope');
    });
    expect(createFloorTexture()).toBeNull();
  });

  it('builds repeating sRGB canvas textures when a 2D context exists', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    for (const make of [createFloorTexture, createBrickTexture]) {
      const tex = make();
      expect(tex).toBeInstanceOf(THREE.CanvasTexture);
      expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(tex.wrapS).toBe(THREE.RepeatWrapping);
      expect(tex.wrapT).toBe(THREE.RepeatWrapping);
      expect(tex.image.width).toBeGreaterThan(0);
    }
    expect(ctx.calls).toBeGreaterThan(10);
  });
});

import { describe, expect, it } from 'vitest';
import { createBrickTexture, createFloorTexture } from './textures.js';

describe('textures without a DOM', () => {
  it('returns null instead of throwing', () => {
    expect(createFloorTexture()).toBeNull();
    expect(createBrickTexture()).toBeNull();
  });
});

import * as THREE from 'three';
import { COLORS } from '../config.js';

const SIZE = 128;

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

function get2dContext() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  return ctx ? { canvas, ctx } : null;
}

// Deterministic noise so textures look the same on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finish(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

// A 2x2 checker of dark stone tiles; one texture repeat covers 2x2 tiles.
// Returns null when no 2D canvas is available (callers fall back to color).
export function createFloorTexture() {
  const c = get2dContext();
  if (!c) return null;
  const { canvas, ctx } = c;
  const half = SIZE / 2;
  const a = shade(COLORS.floor, 0.02);
  const b = shade(COLORS.floor, -0.02);
  const rand = rng(7);
  for (let i = 0; i < 2; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      ctx.fillStyle = (i + j) % 2 === 0 ? a : b;
      ctx.fillRect(i * half, j * half, half, half);
    }
  }
  for (let n = 0; n < 220; n += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.015 + rand() * 0.02})`;
    ctx.fillRect(rand() * SIZE, rand() * SIZE, 1 + rand() * 2, 1 + rand() * 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * half, 0);
    ctx.lineTo(i * half, SIZE);
    ctx.moveTo(0, i * half);
    ctx.lineTo(SIZE, i * half);
    ctx.stroke();
  }
  return finish(canvas);
}

// Running-bond bricks in the wall stone color. One repeat covers one wall face.
export function createBrickTexture() {
  const c = get2dContext();
  if (!c) return null;
  const { canvas, ctx } = c;
  const rows = 6;
  const cols = 3;
  const bh = SIZE / rows;
  const bw = SIZE / cols;
  const rand = rng(13);
  ctx.fillStyle = shade(COLORS.wall, -0.1);
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let r = 0; r < rows; r += 1) {
    const offset = r % 2 === 0 ? 0 : bw / 2;
    for (let k = -1; k <= cols; k += 1) {
      const x = k * bw + offset;
      ctx.fillStyle = shade(COLORS.wall, (rand() - 0.5) * 0.06);
      ctx.fillRect(x + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let r = 0; r < rows; r += 1) ctx.fillRect(0, r * bh + 1.5, SIZE, 1.5);
  return finish(canvas);
}

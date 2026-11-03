import * as THREE from 'three';
import { BURST_DURATION, BURST_PARTICLES, COLORS, SHAKE_DURATION, SHAKE_STRENGTH } from '../config.js';

const PARTICLE_SIZE = 0.14; // world units
const BURST_SPEED_MIN = 1.4; // world units per second
const BURST_SPEED_MAX = 3.2;
const BURST_GRAVITY = 7; // world units per second^2
const SHAKE_VERTICAL = 0.5; // vertical shake relative to horizontal

let sharedSprite;

function particleSprite() {
  if (sharedSprite !== undefined) return sharedSprite;
  sharedSprite = null;
  if (typeof document === 'undefined') return sharedSprite;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return sharedSprite;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  sharedSprite = new THREE.CanvasTexture(canvas);
  sharedSprite.colorSpace = THREE.SRGBColorSpace;
  return sharedSprite;
}

function makeBurst(position, color) {
  const count = BURST_PARTICLES;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const up = 0.25 + Math.random() * 0.75; // mostly upward hemisphere
    const side = Math.sqrt(1 - up * up);
    const speed = BURST_SPEED_MIN + Math.random() * (BURST_SPEED_MAX - BURST_SPEED_MIN);
    velocities[i * 3] = Math.cos(theta) * side * speed;
    velocities[i * 3 + 1] = up * speed;
    velocities[i * 3 + 2] = Math.sin(theta) * side * speed;
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const map = particleSprite();
  const material = new THREE.PointsMaterial({
    color: new THREE.Color(color ?? COLORS.crystal),
    size: PARTICLE_SIZE,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: map || null,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'fx-burst';
  points.frustumCulled = false;
  return { points, velocities, age: 0 };
}

function disposeBurst(burst) {
  burst.points.removeFromParent();
  burst.points.geometry.dispose();
  burst.points.material.dispose();
}

export function createEffects(scene) {
  const bursts = [];
  const shakeState = { strength: 0, duration: 0, elapsed: 0 };

  function burst(position, color = COLORS.crystal) {
    const b = makeBurst(position, color);
    scene.add(b.points);
    bursts.push(b);
    return b.points;
  }

  function shake(strength = SHAKE_STRENGTH, duration = SHAKE_DURATION) {
    if (!(duration > 0) || !(strength > 0)) return;
    shakeState.strength = strength;
    shakeState.duration = duration;
    shakeState.elapsed = 0;
  }

  function updateBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.age += dt;
      if (b.age >= BURST_DURATION) {
        disposeBurst(b);
        bursts.splice(i, 1);
        continue;
      }
      const attr = b.points.geometry.attributes.position;
      const p = attr.array;
      const v = b.velocities;
      for (let j = 0; j < p.length; j += 3) {
        v[j + 1] -= BURST_GRAVITY * dt;
        p[j] += v[j] * dt;
        p[j + 1] += v[j + 1] * dt;
        p[j + 2] += v[j + 2] * dt;
      }
      attr.needsUpdate = true;
      const life = 1 - b.age / BURST_DURATION;
      b.points.material.opacity = life * life;
    }
  }

  function shakeOffset(dt) {
    if (shakeState.duration <= 0) return { x: 0, y: 0, z: 0 };
    shakeState.elapsed += dt;
    if (shakeState.elapsed >= shakeState.duration) {
      shakeState.duration = 0;
      shakeState.strength = 0;
      return { x: 0, y: 0, z: 0 };
    }
    const k = 1 - shakeState.elapsed / shakeState.duration;
    const amp = shakeState.strength * k * k;
    return {
      x: (Math.random() * 2 - 1) * amp,
      y: (Math.random() * 2 - 1) * amp * SHAKE_VERTICAL,
      z: (Math.random() * 2 - 1) * amp,
    };
  }

  function update(dt) {
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    updateBursts(step);
    return shakeOffset(step);
  }

  function clear() {
    for (const b of bursts) disposeBurst(b);
    bursts.length = 0;
    shakeState.strength = 0;
    shakeState.duration = 0;
    shakeState.elapsed = 0;
  }

  return { burst, shake, update, clear };
}

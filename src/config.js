// Shared numbers for every system. Times are in seconds, distances in tiles
// unless noted. Systems read these; only the integration step changes them.

export const TILE_SIZE = 1; // world units per tile
export const WALL_HEIGHT = 1.1;

export const LIVES = 3;
export const CRYSTAL_COUNT = 5;
export const GUARD_COUNT = 3;

// Player
export const PLAYER_MOVE_TIME = 0.14; // tween time per tile; also the input cooldown
export const SAFE_TIME = 2.0; // invulnerable time after a hit
export const BLINK_RATE = 10; // blinks per second while safe

// Guards
export const GUARD_SPEED = 2.2; // tiles per second
export const HIT_DISTANCE = 0.6; // player/guard distance (tiles) that counts as a hit

// Crystals
export const CRYSTAL_SPIN_SPEED = 1.6; // radians per second
export const CRYSTAL_BOB_HEIGHT = 0.12; // world units
export const CRYSTAL_BOB_SPEED = 2.2; // radians per second
export const CRYSTAL_HEIGHT = 0.55; // resting height above the floor

// Camera
export const CAMERA_FOV = 40; // degrees
export const CAMERA_TILT = 58; // degrees above the horizon, looking down at the level
export const CAMERA_MARGIN = 1.12; // >1 leaves room around the level

// Effects
export const BURST_PARTICLES = 28;
export const BURST_DURATION = 0.7;
export const SHAKE_STRENGTH = 0.18; // world units
export const SHAKE_DURATION = 0.35;

export const COLORS = {
  background: 0x0b0e14,
  floor: 0x1b1f27,
  wall: 0x3a3f4a,
  wallTop: 0x4b515e,
  torch: 0xffb45c,
  ambient: 0x8fa3c7,
  sun: 0xffd6a0,
  crystal: 0x5ce1ff,
  player: 0xf4efe6,
  guard: 0xb23a3a,
  lantern: 0xff8a3d,
};

// Tile (x = column, y = row) to world position. World y is up; the level
// lies on the x/z plane with tile (0, 0) at the origin.
export function tileToWorld(x, y) {
  return { x: x * TILE_SIZE, z: y * TILE_SIZE };
}

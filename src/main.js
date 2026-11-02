import * as THREE from 'three';

// Starting point: an empty scene with a camera, lights and a floor.
// The game itself is not wired up yet. See docs/game-design.md.

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6, 14, 14);
camera.lookAt(6, 0, 5);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(5, 12, 8);
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(13, 11),
  new THREE.MeshStandardMaterial({ color: 0x30363d }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(6, 0, 5);
scene.add(floor);

document.getElementById('hud').innerHTML =
  '<div class="hud-banner">Empty scene. The game is described in docs/game-design.md.</div>';

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FACE_COLORS, Move, TURN, Vec3, parseMove } from '@/lib/rubiks/cube';

interface Props {
  /** Moves applied instantly when the component (re)starts. */
  scramble: Move[];
  /** Moves animated in order. Only newly appended moves are animated. */
  moves: Move[];
  /** Change this to reset the cube to solved + scramble. */
  resetKey: number;
  /** Milliseconds per animated turn. */
  turnMs?: number;
  className?: string;
}

const CUBIE = 0.94;
const INNER = '#111318';
const AXES: THREE.Vector3[] = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
];

// three.js BoxGeometry material order: +x, -x, +y, -y, +z, -z
const MATERIAL_FACES = ['R', 'L', 'U', 'D', 'F', 'B'] as const;

function buildCubie(pos: Vec3): THREE.Mesh {
  const materials = MATERIAL_FACES.map((face, i) => {
    const axis = Math.floor(i / 2);
    const sign = i % 2 === 0 ? 1 : -1;
    const exposed = pos[axis] === sign;
    return new THREE.MeshStandardMaterial({
      color: exposed ? FACE_COLORS[face].hex : INNER,
      roughness: exposed ? 0.55 : 0.9,
      metalness: 0.05,
    });
  });
  const geometry = new THREE.BoxGeometry(CUBIE, CUBIE, CUBIE);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.set(pos[0], pos[1], pos[2]);
  return mesh;
}

function snap(mesh: THREE.Object3D) {
  mesh.position.set(Math.round(mesh.position.x), Math.round(mesh.position.y), Math.round(mesh.position.z));
  const e = mesh.rotation;
  const q = Math.PI / 2;
  mesh.rotation.set(Math.round(e.x / q) * q, Math.round(e.y / q) * q, Math.round(e.z / q) * q);
}

function turnAngle(move: Move): { axis: 0 | 1 | 2; layer: 1 | -1; angle: number } {
  const { face, quarterTurns } = parseMove(move);
  const { axis, layer } = TURN[face];
  // A clockwise turn of a positive-axis face is a negative rotation about that axis.
  const angle = -layer * (Math.PI / 2) * (quarterTurns === 3 ? -1 : quarterTurns);
  return { axis, layer, angle };
}

export default function Cube3D({ scramble, moves, resetKey, turnMs = 220, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<{ instant: (m: Move) => void; enqueue: (m: Move) => void; reset: () => void } | null>(null);
  const appliedCount = useRef(0);
  const turnMsRef = useRef(turnMs);
  turnMsRef.current = turnMs;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(4.6, 4.2, 6.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(5, 8, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-6, -2, -4);
    scene.add(fill);

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    const pivot = new THREE.Group();
    cubeGroup.add(pivot);

    let cubies: THREE.Mesh[] = [];
    const build = () => {
      for (const c of cubies) {
        c.removeFromParent();
        c.geometry.dispose();
        (c.material as THREE.Material[]).forEach((m) => m.dispose());
      }
      cubies = [];
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const mesh = buildCubie([x, y, z]);
        cubies.push(mesh);
        cubeGroup.add(mesh);
      }
    };
    build();

    const layerCubies = (axis: number, layer: number) =>
      cubies.filter((c) => Math.round(c.position.getComponent(axis)) === layer);

    const instant = (move: Move) => {
      const { axis, layer, angle } = turnAngle(move);
      for (const c of layerCubies(axis, layer)) {
        c.position.applyAxisAngle(AXES[axis], angle);
        c.rotateOnWorldAxis(AXES[axis], angle);
        snap(c);
      }
    };

    const queue: Move[] = [];
    let active: { axis: number; angle: number; start: number; duration: number } | null = null;

    const startNext = (now: number) => {
      const move = queue.shift();
      if (!move) return;
      const { axis, layer, angle } = turnAngle(move);
      for (const c of layerCubies(axis, layer)) pivot.attach(c);
      pivot.rotation.set(0, 0, 0);
      active = { axis, angle, start: now, duration: Math.max(60, turnMsRef.current) };
    };

    const finishActive = () => {
      if (!active) return;
      pivot.rotation.set(0, 0, 0);
      pivot.rotation.setFromVector3(new THREE.Vector3().setComponent(active.axis, active.angle));
      pivot.updateMatrixWorld(true);
      for (const c of [...pivot.children]) {
        cubeGroup.attach(c);
        snap(c);
      }
      pivot.rotation.set(0, 0, 0);
      active = null;
    };

    let raf = 0;
    let disposed = false;
    const animate = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      if (!active && queue.length) startNext(now);
      if (active) {
        const t = Math.min(1, (now - active.start) / active.duration);
        const eased = 1 - Math.pow(1 - t, 3);
        pivot.rotation.setFromVector3(new THREE.Vector3().setComponent(active.axis, active.angle * eased));
        if (t >= 1) {
          finishActive();
          if (queue.length) startNext(now);
        }
      }
      cubeGroup.rotation.y += 0.0025;
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = mount.clientWidth || 200;
      const h = mount.clientHeight || 200;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    applyRef.current = {
      instant,
      enqueue: (m) => queue.push(m),
      reset: () => {
        queue.length = 0;
        if (active) finishActive();
        build();
      },
    };

    raf = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      applyRef.current = null;
      for (const c of cubies) {
        c.geometry.dispose();
        (c.material as THREE.Material[]).forEach((m) => m.dispose());
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Reset to solved, then apply the scramble instantly.
  useEffect(() => {
    const api = applyRef.current;
    if (!api) return;
    api.reset();
    for (const m of scramble) api.instant(m);
    appliedCount.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, scramble]);

  // Animate any moves appended since the last render.
  useEffect(() => {
    const api = applyRef.current;
    if (!api) return;
    for (let i = appliedCount.current; i < moves.length; i++) api.enqueue(moves[i]);
    appliedCount.current = moves.length;
  }, [moves]);

  return <div ref={mountRef} className={className} />;
}

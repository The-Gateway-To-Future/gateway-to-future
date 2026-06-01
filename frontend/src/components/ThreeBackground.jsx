import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import '../styles/threeBackground.css';

export default function ThreeBackground() {
  const canvasRef = useRef(null);
  const [isVR, setIsVR] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    scene.add(camera);

    // Simple particle system
    const particles = new THREE.BufferGeometry();
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
    const points = new THREE.Points(particles, material);
    scene.add(points);

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    let frameId;
    const animate = () => {
      points.rotation.x += 0.0005;
      points.rotation.y += 0.001;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    };
  }, []);

  // Hide animation for users who prefer reduced motion
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches && canvasRef.current) {
      canvasRef.current.style.display = 'none';
    }
  }, []);

  return (
    <>
      <canvas id="three-bg" ref={canvasRef} className={isVR ? 'vr' : ''} />
      <button
        id="vr-toggle"
        aria-label="Toggle VR mode"
        className="vr-toggle"
        onClick={() => setIsVR(prev => !prev)}
      >
        {isVR ? '🛑' : '🕶️'}
      </button>
    </>
  );
}

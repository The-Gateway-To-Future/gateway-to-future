// Immersive Background with Three.js
let scene, camera, renderer, particles;

function initThreeJS() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 5000; i++) {
        vertices.push(THREE.MathUtils.randFloatSpread(2000));
        vertices.push(THREE.MathUtils.randFloatSpread(2000));
        vertices.push(THREE.MathUtils.randFloatSpread(2000));
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.PointsMaterial({ color: 0x1d4ed8, size: 2 }); // Hex matching primary brand color
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 500;
}

function animate() {
    requestAnimationFrame(animate);
    if (particles) {
        particles.rotation.x += 0.0005;
        particles.rotation.y += 0.001;
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Initialize and animate
initThreeJS();
animate();

// Interactivity
document.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        if (particles) particles.material.color.setHex(0x1e40af); // Darker blue on hover
    });
    card.addEventListener('mouseleave', () => {
        if (particles) particles.material.color.setHex(0x1d4ed8); // Default blue
    });
});

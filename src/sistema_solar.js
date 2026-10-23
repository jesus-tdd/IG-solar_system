import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer, info;
let camera, camcontrols;
let objects = [], planets = [];
let shadows = false;
let t0 = 0;
let timestamp;
let global_acc = 0.001;

function init() {
    info = document.createElement("div");
    info.id = "info";
    info.innerHTML = "sistema solar";
    document.body.appendChild(info);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 10);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camcontrols = new OrbitControls(camera, renderer.domElement);

    // --- Luces -----------------------------------------------------
    ambientLight();
    
    // --- Sistema Solar ---------------------------------------------
    stars(300, 100, 500);
    sun();
    planet(0.5, 4, 1, 0x2266ff, 1, 0.8);

    t0 = Date.now();
}

function animationLoop() {
    timestamp = (Date.now() - t0) * global_acc;
    requestAnimationFrame(animationLoop);
    
    for (let planet of planets) {
        planet.position.x = getPlanetX(planet, timestamp);
        planet.position.y = getPlanetY(planet, timestamp);
    }

    renderer.render(scene, camera);
}

function sphere(px, py, pz, radio, nx, ny, col) {
    let mesh = new THREE.Mesh(
        new THREE.SphereBufferGeometry(radio, nx, ny),
        new THREE.MeshBasicMaterial({color: col})
    );
    mesh.position.set(px, py, pz);
    
    if (shadows) mesh.castShadow = true;
    
    scene.add(mesh);
    objects.push(mesh);
}

function spherePhong(px, py, pz, radio, nx, ny, col) {
    let mesh = new THREE.Mesh(
        new THREE.SphereBufferGeometry(radio, nx, ny),
        new THREE.MeshPhongMaterial({color: col})
    );
    mesh.position.set(px, py, pz);
    
    if (shadows) mesh.castShadow = true;
    
    scene.add(mesh);
    objects.push(mesh);
}

function ambientLight() {
    const Lamb = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(Lamb);
}

function spotLight(px, py, pz, color, intensity) {
    // color, intensidad, distancia máxima, decaimiento
    const Lpunt = new THREE.PointLight(color, intensity, 0, 2);
    Lpunt.position.set(px, py, pz);
    if (shadows) Lpunt.castShadow = true;
    scene.add(Lpunt)

    /*const LpuntHelper = new THREE.PointLightHelper(Lpunt, 0.5);
    scene.add(LpuntHelper); /**/
}

function sun() {
    sphere(0, 0, 0, 2, 20, 20, 0xffdd00);
    spotLight(0, 0, 0, 0xffffff, 1);
}

function planet(r, d, v, color, f1, f2) {
    let planet = new THREE.Mesh(
        new THREE.SphereGeometry(r, 20, 20),
        new THREE.MeshPhongMaterial({color: color})
    );
    planet.userData.dist = d;
    planet.userData.speed = v;
    planet.userData.f1 = f1;
    planet.userData.f2 = f2;

    planets.push(planet);
    scene.add(planet);

    let curve = new THREE.EllipseCurve(
        0, 0,       // centro
        d*f1, d*f2  // radios
    );
    let points = curve.getPoints(50);
    let orbita = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({color:0xffffff})
    );
    scene.add(orbita);
}

function getPlanetX(p, t) {
    return Math.cos(t * p.userData.speed) * p.userData.f1 * p.userData.dist;
}

function getPlanetY(p, t) {
    return Math.sin(t * p.userData.speed) * p.userData.f2 * p.userData.dist;
}

function stars(n, gap, extent) {
    let count = 0
    while (count < n) {
        const x = (Math.random() * 2 - 1) * extent;
        const z = (Math.random() * 2 - 1) * extent;
        const y = (Math.random() * 2 - 1) * extent;

        const d = Math.sqrt(x * x + y * y + z * z);
        if (d < gap || d > extent) continue;

        sphere(x,y, z, 1, 5, 5, 0xffffff);
        count++;
    }
}

init();
animationLoop();    
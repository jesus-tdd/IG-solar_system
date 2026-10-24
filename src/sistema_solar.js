import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer, info;
let camera, camcontrols;
let planets = [];
let shadows = false;
let t0 = 0;
let timestamp;
let global_acc = 0.001;

// --- Escalas -------------------------------------------------------
const SUN_RADIUS = 5;
const SUN_RADIUS_KM =  696340;

const SIZE_EXP = 0.5;
const DISTANCE_EXP = 0.5;

const DISTANCE_SCALE = SUN_RADIUS;
const ORBIT_OFFSET = SUN_RADIUS * 1.5;
const ECCENTRICITY_BOOST = 1.5;
// ------------------------------------------------------------------

const PLANET_DATA = [
    { name: "Mercurio", km: 2440,  au: 0.387, ecc: 0.2056, color: 0xb1b1b1, period: 0.241 },
    { name: "Venus",    km: 6052,  au: 0.723, ecc: 0.0068, color: 0xe8c07a, period: 0.615 },
    { name: "Tierra",   km: 6371,  au: 1.000, ecc: 0.0167, color: 0x2266ff, period: 1.000 },
    { name: "Marte",    km: 3390,  au: 1.524, ecc: 0.0934, color: 0xc1440e, period: 1.881 },
    { name: "Júpiter",  km: 69911, au: 5.203, ecc: 0.0489, color: 0xd8a577, period: 11.86 },
    { name: "Saturno",  km: 58232, au: 9.537, ecc: 0.0565, color: 0xe3d29a, period: 29.46 },
    { name: "Urano",    km: 25362, au: 19.19, ecc: 0.0457, color: 0x9fd7e0, period: 84.01 },
    { name: "Neptuno",  km: 24622, au: 30.07, ecc: 0.0113, color: 0x3a5fcd, period: 164.8 }
]


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
    createStars(300, 100, 500);
    createSun();
    createPlanets();

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


function sphere(px, py, pz, radio, nx, ny, col) {
    let mesh = new THREE.Mesh(
        new THREE.SphereBufferGeometry(radio, nx, ny),
        new THREE.MeshBasicMaterial({color: col})
    );
    mesh.position.set(px, py, pz);
    return mesh;
}


function createSun() {
    scene.add(sphere(0, 0, 0, SUN_RADIUS, 25, 25, 0xffdd00));
    spotLight(0, 0, 0, 0xffffff, 1);
}


function createPlanets() {
    for (const p of PLANET_DATA) {
        const e = Math.min(p.ecc * ECCENTRICITY_BOOST, 0.95);
        const f1 = 1;
        const f2 = Math.sqrt(1 - e*e);
        createPlanet(
            getPlanetRadius(p.km),
            getOrbitDistance(p.au),
            1/p.period,
            p.color,
            f1, f2
        );
    }
}


function createPlanet(r, d, v, color, f1, f2) {
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


function createStars(n, gap, extent) {
    let count = 0
    while (count < n) {
        const x = (Math.random() * 2 - 1) * extent;
        const z = (Math.random() * 2 - 1) * extent;
        const y = (Math.random() * 2 - 1) * extent;

        const d = Math.sqrt(x * x + y * y + z * z);
        if (d < gap || d > extent) continue;

        scene.add(sphere(x,y, z, 1, 5, 5, 0xffffff));
        count++;
    }
}


function getPlanetRadius(km) {
    return SUN_RADIUS * Math.pow(km / SUN_RADIUS_KM, SIZE_EXP);
}

function getOrbitDistance(au) {
    return ORBIT_OFFSET + DISTANCE_SCALE * Math.pow(au, DISTANCE_EXP);
}


init();
animationLoop();    
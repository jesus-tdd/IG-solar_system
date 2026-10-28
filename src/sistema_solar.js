import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer, info, controlsPanel;
let camera, camcontrols;
let planets = [];
let shadows = true;
let t0 = 0;
let timestamp;
let global_acc = 0.001;

// --- Vista en primera persona (nave) ---------------------------------
let shipCamera, activeCamera;
const keys = {};
const ship = { yaw: Math.PI / 2, pitch: -0.1 };
const SHIP_SPEED = 10;   // unidades/segundo
const SHIP_TURN = 1.5;   // radianes/segundo
let lastFrame = 0;
// ------------------------------------------------------------------

// --- Escalas -------------------------------------------------------
const SUN_RADIUS = 5;
const SUN_RADIUS_KM =  696340;

const SIZE_EXP = 0.5;
const DISTANCE_EXP = 0.5;

const DISTANCE_SCALE = SUN_RADIUS;
const ORBIT_OFFSET = SUN_RADIUS * 1.5;
const ECCENTRICITY_BOOST = 1.5;

const MOON_SIZE_BOOST = 1.5;
const MOON_MIN_RADIUS = 0.08;
const ORBIT_MARGIN = 1;
// ------------------------------------------------------------------

const PLANET_DATA = [
    { name: "Mercurio", km: 2440,  au: 0.387, ecc: 0.2056, color: 0xb1b1b1, period: 0.241 },
    { name: "Venus",    km: 6052,  au: 0.723, ecc: 0.0068, color: 0xe8c07a, period: 0.615 },
    { name: "Tierra",   km: 6371,  au: 1.000, ecc: 0.0167, color: 0x2266ff, period: 1.000, texture: require("./earthmap1k.jpg"), texbump: require("./earthbump1k.jpg"), texspec: require("./earthspec1k.jpg")},
    { name: "Marte",    km: 3390,  au: 1.524, ecc: 0.0934, color: 0xc1440e, period: 1.881 },
    { name: "Júpiter",  km: 69911, au: 5.203, ecc: 0.0489, color: 0xd8a577, period: 11.86 },
    { name: "Saturno",  km: 58232, au: 9.537, ecc: 0.0565, color: 0xe3d29a, period: 29.46 },
    { name: "Urano",    km: 25362, au: 19.19, ecc: 0.0457, color: 0x9fd7e0, period: 84.01 },
    { name: "Neptuno",  km: 24622, au: 30.07, ecc: 0.0113, color: 0x3a5fcd, period: 164.8 }
]

const MOON_DATA = {
    Tierra:  [{ km: 1737, k: 2.5, period: 0.0748, color: 0xcccccc }],   // Luna
    Marte:   [{ km: 11,   k: 2.0, period: 0.0009, color: 0x998877 },    // Fobos
              { km: 6,    k: 3.0, period: 0.0035, color: 0x887766 }],   // Deimos
    Júpiter: [{ km: 1821, k: 1.8, period: 0.0048, color: 0xe8d070 },    // Ío
              { km: 1561, k: 2.3, period: 0.0097, color: 0xc9b79c },    // Europa
              { km: 2634, k: 2.9, period: 0.0196, color: 0x9c8f7a },    // Ganímedes
              { km: 2410, k: 3.6, period: 0.0457, color: 0x7a6e60 }],   // Calisto
    Saturno: [{ km: 2575, k: 2.8, period: 0.0437, color: 0xd9a441 }],   // Titán
    Urano:   [{ km: 788,  k: 2.2, period: 0.0069, color: 0xaaaaaa }],   // Titania
    Neptuno: [{ km: 1353, k: 2.5, period: 0.0161, color: 0xbbbbcc }],   // Tritón
};

function init() {
    // Panel superior: info (el estilo lo da tu CSS)
    info = document.createElement("div");
    info.id = "info";
    info.innerHTML = "sistema solar";
    document.body.appendChild(info);

    // Panel inferior: controles
    controlsPanel = document.createElement("div");
    controlsPanel.id = "controls";
    document.body.appendChild(controlsPanel);

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
    renderer.shadowMap.enabled = shadows;
    if (shadows) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    camcontrols = new OrbitControls(camera, renderer.domElement);

    // --- Luces -----------------------------------------------------
    ambientLight();
    
    // --- Sistema Solar ---------------------------------------------
    createSun();
    const lastD = createPlanets();
    createStars(300, lastD*1.5, lastD*4);

    // --- Vista general: abarca todo el sistema ----------------------
    camera.position.set(0, -lastD * 1.1, lastD * 0.8);
    camcontrols.update();

    // --- Vista en primera persona (el plano orbital es XY, "arriba" es Z)
    shipCamera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    shipCamera.up.set(0, 0, 1);
    shipCamera.position.set(0, -lastD * 0.6, 3);
    activeCamera = camera;

    window.addEventListener("keydown", e => {
        keys[e.code] = true;
        if (e.code === "KeyC") toggleView();
    });
    window.addEventListener("keyup", e => { keys[e.code] = false; });

    updateControls();

    lastFrame = Date.now();
    t0 = Date.now();
}


function toggleView() {
    const toShip = activeCamera !== shipCamera;
    activeCamera = toShip ? shipCamera : camera;
    camcontrols.enabled = !toShip;
    updateControls();
}


function updateControls() {
    const toShip = activeCamera === shipCamera;
    const title = toShip ? "Vista nave" : "Vista general";
    const rows = toShip
        ? [["W / S", "Avanzar / retroceder"],
           ["A / D", "Izquierda / derecha"],
           ["Flechas", "Girar cámara"],
           ["Shift", "Turbo"],
           ["C", "Vista general"]]
        : [["Ratón", "Orbitar, zoom y desplazar"],
           ["C", "Vista nave"]];

    controlsPanel.innerHTML =
        `<div class="controls-title">${title}</div>` +
        rows.map(([k, d]) =>
            `<div class="controls-row"><span class="controls-key">${k}</span>${d}</div>`
        ).join("");
}


function updateShip(dt) {
    if (keys.ArrowLeft)  ship.yaw   += SHIP_TURN * dt;
    if (keys.ArrowRight) ship.yaw   -= SHIP_TURN * dt;
    if (keys.ArrowUp)    ship.pitch += SHIP_TURN * dt;
    if (keys.ArrowDown)  ship.pitch -= SHIP_TURN * dt;
    ship.pitch = Math.max(-1.5, Math.min(1.5, ship.pitch));

    const dir = new THREE.Vector3(
        Math.cos(ship.pitch) * Math.cos(ship.yaw),
        Math.cos(ship.pitch) * Math.sin(ship.yaw),
        Math.sin(ship.pitch)
    );
    const right = new THREE.Vector3().crossVectors(dir, shipCamera.up).normalize();
    const step = SHIP_SPEED * (keys.ShiftLeft || keys.ShiftRight ? 4 : 1) * dt;

    if (keys.KeyW) shipCamera.position.addScaledVector(dir, step);
    if (keys.KeyS) shipCamera.position.addScaledVector(dir, -step);
    if (keys.KeyD) shipCamera.position.addScaledVector(right, step);
    if (keys.KeyA) shipCamera.position.addScaledVector(right, -step);

    shipCamera.lookAt(shipCamera.position.clone().add(dir));
}


function animationLoop() {
    const now = Date.now();
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    timestamp = (now - t0) * global_acc;
    requestAnimationFrame(animationLoop);

    updateShip(dt);
    
    for (let planet of planets) {
        planet.position.x = getPlanetX(planet, timestamp);
        planet.position.y = getPlanetY(planet, timestamp);

        for (let moon of planet.userData.moons) {
            moon.position.x = Math.cos(timestamp * moon.userData.speed) * moon.userData.dist;
            moon.position.y = Math.sin(timestamp * moon.userData.speed) * moon.userData.dist;
        }
    }
    
    renderer.render(scene, activeCamera);
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
    let prevD = 0, prevReach = 0;

    for (const p of PLANET_DATA) {
        const moonsData = MOON_DATA[p.name] || [];

        const r = getPlanetRadius(p.km);
        const reach = Math.max(     // lo que ocupará el planeta con sus lunas
            r,
            ...moonsData.map(m => r * m.k + moonRadius(m.km))
        );

        let d = getOrbitDistance(p.au);
        if (prevD > 0) d = Math.max(d, prevD + prevReach + reach + ORBIT_MARGIN);  // si la órbita está muy pegada a la anterior, se separa

        const e = Math.min(p.ecc * ECCENTRICITY_BOOST, 0.95);
        const f1 = 1;
        const f2 = Math.sqrt(1 - e*e);
        
        const texture = p.texture || undefined;
        const texbump = p.texbump || undefined;
        const texspec = p.texspec || undefined;
        const mesh = createPlanet(r, d, 1/p.period, p.color, f1, f2, texture, texbump, texspec);

        mesh.userData.moons = [];
        for (const m of moonsData) createMoon(mesh, m);

        prevD = d;
        prevReach = reach;
    }
    return prevD // distancia del planeta más lejano
}


function createPlanet(r, d, v, color, f1, f2, texture=undefined, texbump=undefined, texspec=undefined) {
    let material = new THREE.MeshPhongMaterial({color: texture? 0xffffff : color});
    
    if (texture != undefined) {
        material.map = new THREE.TextureLoader().load(texture);
    }

    if (texbump != undefined) {
        material.bumpMap = new THREE.TextureLoader().load(texbump);
        material.bumpScale = 1;
    }

    if (texspec != undefined) {
        material.specularMap = new THREE.TextureLoader().load(texspec);
        material.specular = new THREE.Color("orange");
    }

    
    let planet = new THREE.Mesh(
        new THREE.SphereGeometry(r, 20, 20).rotateX(Math.PI / 2),
        material
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

    return planet;
}

function getPlanetX(p, t) {
    return Math.cos(t * p.userData.speed) * p.userData.f1 * p.userData.dist;
}

function getPlanetY(p, t) {
    return Math.sin(t * p.userData.speed) * p.userData.f2 * p.userData.dist;
}

function createMoon(parent, moon) {
    const mesh = new THREE.Mesh(
        new THREE.SphereBufferGeometry(moonRadius(moon.km), 15, 15),
        new THREE.MeshPhongMaterial({color: moon.color})
    );
    mesh.userData.dist = parent.geometry.parameters.radius * moon.k;
    mesh.userData.speed = Math.sqrt(1 / moon.period);
    parent.add(mesh);
    parent.userData.moons.push(mesh);
}

function moonRadius(km) {
    return Math.max(getPlanetRadius(km) * MOON_SIZE_BOOST, MOON_MIN_RADIUS);
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
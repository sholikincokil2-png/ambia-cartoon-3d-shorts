// The whole coastal city + twin supertall skyscrapers as one Three.js scene:
//   - Left Tower (OUR_X = -16): Our hotel skyscraper with a 4-story cutaway penthouse damper atrium (ATRIUM_Y = 38),
//     a giant 730-ton golden sphere hanging from 8 steel cables, hydraulic cylinders, a high lunch I-beam,
//     and tangible yardsticks on the atrium floor (dinner plate, porcelain bathtub, spirit level).
//   - Right Tower (RIVAL_X = 16): The rival company's "perfect" rigid concrete-and-steel skyscraper, bolted stiff
//     with heavy X-braces and zero damper, which glows hot orange-red under typhoon stress and snaps at the waist at 60.03s.
//   - Coastal boulevard, turquoise hurricane ocean, grand gold prize pile, trees, hills, sky, clouds, and 2D cast.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, Strand, boxGeo, quad, V, lam, buildTown, flagTex, Kit, Ray, kitClone } from "./build";
import { beam, bed, rep, ctex, planksHD, stoneHD, cobbleHD, grassHD, chainHD, waterNear, waterFar, cloudHD } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, snapFx, SU_SWING } from "./cast";
import {
  FPS, D0, ATRIUM_Y, BALL_REST_Y, CABLE_TOP_Y, OUR_X, RIVAL_X, SHOTS, SNAP,
  camAt, bridgeState, BridgeState, V3, smooth, clamp01, FOREGROUND, ShotDef,
} from "./story";

let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) kitP = Promise.resolve({} as Kit);
  return kitP;
};

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});

/** Hand-painted skyscraper glass curtain-wall facade with warm lit rooms and steel mullions */
const glassTowerTex = (key: string, hue: "teal" | "slate") => ctex("gtow_" + key, 512, 1024, (g, r) => {
  const bg = hue === "teal" ? "#2e6f8e" : "#44556b";
  g.fillStyle = bg; g.fillRect(0, 0, 512, 1024);
  const cols = 8, rows = 16, cw = 512 / cols, rh = 1024 / rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const px = x * cw + 4, py = y * rh + 5, w = cw - 8, h = rh - 10;
    const lit = r() < 0.28;
    const gr = g.createLinearGradient(px, py, px + w, py + h);
    if (lit) {
      gr.addColorStop(0, "#ffe7a3"); gr.addColorStop(1, "#e8b858");
    } else if (hue === "teal") {
      gr.addColorStop(0, "#66b8d9"); gr.addColorStop(1, "#296482");
    } else {
      gr.addColorStop(0, "#7c94b0"); gr.addColorStop(1, "#39485c");
    }
    g.fillStyle = gr; g.fillRect(px, py, w, h);
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.beginPath(); g.moveTo(px + 3, py + h * 0.7); g.lineTo(px + w * 0.65, py + 3); g.lineTo(px + w * 0.85, py + 3); g.lineTo(px + 3, py + h * 0.9); g.fill();
  }
  // horizontal floor spandrels & vertical mullions
  g.fillStyle = hue === "teal" ? "#1c4357" : "#27313f";
  for (let y = 0; y <= rows; y++) g.fillRect(0, y * rh - 3, 512, 6);
  for (let x = 0; x <= cols; x++) g.fillRect(x * cw - 2, 0, 4, 1024);
});

/** Brushed golden-steel texture for the 730-ton tuned mass damper sphere with riveted rings */
const goldSphereTex = () => ctex("goldSphereHD", 1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#ffe47a");
  gr.addColorStop(0.45, "#f0b429");
  gr.addColorStop(0.8, "#c98612");
  gr.addColorStop(1, "#8f5b08");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  // horizontal welded plate seams (like Taipei 101's stacked steel discs)
  for (let y = 32; y < 512; y += 32) {
    g.fillStyle = "rgba(60,32,5,0.45)"; g.fillRect(0, y, 1024, 4);
    g.fillStyle = "rgba(255,248,200,0.35)"; g.fillRect(0, y + 4, 1024, 3);
  }
  // equatorial dark industrial stripe with bold stencil blocks
  g.fillStyle = "rgba(36,23,38,0.82)";
  g.fillRect(0, 232, 1024, 48);
  g.fillStyle = "#ffe47a";
  for (let x = 32; x < 1024; x += 64) {
    g.beginPath(); g.arc(x, 256, 6, 0, Math.PI * 2); g.fill();
  }
});

const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a; f < s.b; f += 4) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    out.push({ o, d: fw, len, core: true });
  }
  return out;
};

type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private swing: Actor;
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private clouds: THREE.Mesh[] = [];
  private flags: THREE.Mesh[] = [];
  private smoke: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; top: V3; k: number }[] = [];

  // Dynamic Skyscraper & Pendulum elements
  private ourUpper = new THREE.Group();
  private sphereGroup = new THREE.Group();
  private cables: Strand[] = [];
  private dampers: Strand[] = [];
  private damperMat: THREE.MeshPhongMaterial;
  private rivalUpper = new THREE.Group();
  private rivalStressMat: THREE.MeshPhongMaterial;
  private debris: THREE.Mesh[] = [];
  private plateGroup = new THREE.Group();
  private tubGroup = new THREE.Group();
  private levelGroup = new THREE.Group();

  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root, M: Mats = {};
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- Shared Materials ----
    const b = new Batch();
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.wall = lam("wallHD", () => ({ map: stoneHD("wallHD", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") }));
    M.cope = lam("copeHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
    M.tower = lam("towerHD", () => ({ map: stoneHD("towerHD") }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }), 0.15);
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#687282", specular: "#b0b8c5", shininess: 50 }), 0.15);
    M.tealSteel = twoTone(new THREE.MeshPhongMaterial({ color: "#266885", specular: "#7abbd6", shininess: 45 }), 0.15);
    M.rustGirder = twoTone(new THREE.MeshPhongMaterial({ color: "#b84b29", specular: "#8c5540", shininess: 25 }), 0.15);
    M.gold = twoTone(new THREE.MeshPhongMaterial({ map: goldSphereTex(), color: "#ffd24c", specular: "#fff3b8", shininess: 75 }), 0.18);
    M.goldBar = twoTone(new THREE.MeshPhongMaterial({ color: "#f5c238", specular: "#fff0a8", shininess: 80 }), 0.18);
    M.glassTeal = lam("glassTeal", () => ({ map: rep(glassTowerTex("teal", "teal"), 1, 2) }));
    M.glassSlate = lam("glassSlate", () => ({ map: rep(glassTowerTex("slate", "slate"), 1, 2) }));
    M.atriumFloor = lam("atriumFl", () => ({ map: rep(planksHD(), 2, 2) }));
    M.atriumWall = lam("atriumWl", () => ({ color: "#e6dfd3" }));
    M.porcelain = twoTone(new THREE.MeshPhongMaterial({ color: "#f7f9fc", specular: "#ffffff", shininess: 85 }), 0.2);
    M.wood = lam("wood", () => ({ map: beam() }));
    M.bed = lam("bed", () => ({ map: bed() }));

    this.damperMat = twoTone(new THREE.MeshPhongMaterial({ color: "#d97724", specular: "#ffb870", shininess: 50 }), 0.18);
    this.rivalStressMat = twoTone(new THREE.MeshPhongMaterial({ color: "#555d6b", specular: "#9aa4b5", shininess: 40 }), 0.15);

    // ---- Ground, Coastal Promenade & Seawall ----
    for (const s of [-1, 1]) {
      const zn = s * 30, zf = s * 900;
      b.add(s < 0 ? quadUp(-900, 900, zf, zn, 450, 217.5) : quadUp(-900, 900, zn, zf, 450, 217.5), M.grass);
    }
    // Wide coastal plaza from x = -80..80, z = -29..29 over the seawall
    b.add(quadUp(-80, 80, -28, 28, 40, 14, 0.015), M.cobble);
    b.add(wallQuad(-900, 900, -28, 1), M.wall);
    b.add(boxGeo(V(-900, D0, -28.6), V(900, D0 + 0.65, -27.8), 2), M.cope);
    b.add(quadUp(-900, 900, -900, -28, 225, 200, -0.6 - D0), M.bed);

    // ---- Grand Prize Gold Pile on the Plaza (Shot 3: x = 0, y = D0, z = -15) ----
    // Red velvet carpet + stone pedestal + pyramid of gleaming gold bars
    b.add(boxGeo(V(-1.5, D0, -16.2), V(1.5, D0 + 0.45, -13.8), 1), M.cope);
    for (let row = 0; row < 4; row++) {
      const n = 4 - row, y0 = D0 + 0.45 + row * 0.22;
      for (let i = 0; i < n; i++) {
        const x0 = -((n - 1) * 0.48) / 2 + i * 0.48;
        b.add(boxGeo(V(x0 - 0.21, y0, -15.35), V(x0 + 0.21, y0 + 0.21, -14.65)), M.goldBar);
      }
    }

    // =========================================================================
    // 1. OUR TOWER (Left, OUR_X = -16, Z = 0)
    // =========================================================================
    // Lower base (y = D0..26) in static batch
    const W = 5.4; // half-width 5.4 m (10.8 m wide tower)
    b.add(boxGeo(V(OUR_X - W, D0, -W), V(OUR_X + W, 26.0, W), 0, true), M.glassTeal);
    // Corner teal steel mega-columns on lower base
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.add(boxGeo(V(OUR_X + sx * W - 0.45, D0, sz * W - 0.45), V(OUR_X + sx * W + 0.45, 26.0, sz * W + 0.45)), M.tealSteel);
    }
    // Grand Hotel Entrance Canopy at street level (OUR_X, D0, -W)
    b.add(boxGeo(V(OUR_X - 3.2, D0 + 3.2, -W - 2.2), V(OUR_X + 3.2, D0 + 3.6, -W), 1, true), M.goldBar);

    // Upper section of Our Tower (y = 26..54) in `this.ourUpper` group (pivots at (OUR_X, 26, 0))
    this.ourUpper.position.set(OUR_X, 26.0, 0);
    R.add(this.ourUpper);
    const bOur = new Batch();
    // Mid-section below atrium (local y = 0..11.5, ending cleanly below atrium floor slab at 11.5..12.0 to prevent Z-fighting)
    bOur.add(boxGeo(V(-W, 0, -W), V(W, 11.5, W), 0, true), M.glassTeal);
    // High Lunch Steel I-Beam sticking out toward the camera at world y = 32.8 (local y = 6.8, z = -7.5)
    bOur.add(boxGeo(V(-3.4, 6.45, -7.85), V(3.4, 6.8, -7.15), 0, true), M.rustGirder);
    bOur.add(boxGeo(V(-0.3, 6.45, -7.5), V(0.3, 6.8, -W), 0, true), M.rustGirder);

    // 4-Story Hollow Penthouse Damper Atrium (local y = 12..23, world y = 38..49)
    // Atrium floor slab (local y = 11.5..12.0, world y = 37.5..38.0) & ceiling slab (local y = 22.8..23.6)
    bOur.add(boxGeo(V(-W - 0.15, 11.5, -W - 0.15), V(W + 0.15, 12.0, W + 0.15), 2, true), M.atriumFloor);
    bOur.add(boxGeo(V(-W - 0.15, 22.8, -W - 0.15), V(W + 0.15, 23.6, W + 0.15), 2, true), M.tealSteel);
    // Back wall of the atrium so characters and the golden ball read cleanly against a bright architectural interior
    bOur.add(boxGeo(V(-W, 12.0, W - 0.5), V(W, 22.8, W), 2, true), M.atriumWall);
    // Subtle horizontal floor gallery ledges along the back wall (marking the 4 hollowed-out stories)
    for (const fy of [14.7, 17.4, 20.1]) {
      bOur.add(boxGeo(V(-W, fy - 0.12, W - 1.1), V(W, fy + 0.12, W - 0.4), 1, true), M.tealSteel);
    }
    // 4 Corner Mega-Columns framing the open cutaway atrium
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bOur.add(boxGeo(V(sx * W - 0.45, 0, sz * W - 0.45), V(sx * W + 0.45, 26.5, sz * W + 0.45), 0, true), M.tealSteel);
    }
    // Diagonal wind-bracing struts on the side walls (leaving front -z and back +z wide open for the camera)
    for (const sx of [-1, 1]) {
      bOur.add(boxGeo(V(sx * W - 0.25, 12.0, -W), V(sx * W + 0.25, 13.1, W), 0, true), M.rustGirder);
    }
    // Roof Crown & Spire above the atrium (local y = 23.6..29.5, world y = 49.6..55.5)
    bOur.add(boxGeo(V(-W * 0.78, 23.6, -W * 0.78), V(W * 0.78, 26.5, W * 0.78), 0, true), M.glassTeal);
    bOur.add(boxGeo(V(-W * 0.45, 26.5, -W * 0.45), V(W * 0.45, 28.2, W * 0.45), 0, true), M.tealSteel);
    bOur.add(new THREE.CylinderGeometry(0.12, 0.28, 5.5, 10).translate(0, 30.9, 0), M.goldBar);
    // Anchor Bollards on the atrium floor where hydraulic cylinders & cables attach
    for (const sx of [-1, 1]) {
      bOur.add(boxGeo(V(sx * 3.6 - 0.45, 12.0, -0.6), V(sx * 3.6 + 0.45, 13.2, 0.6), 0, true), M.iron);
    }
    bOur.build(this.ourUpper);

    // ---- The 730-Ton Golden Sphere (`this.sphereGroup`) ----
    const ballGeo = new THREE.SphereGeometry(2.35, 32, 24);
    const ballMesh = new THREE.Mesh(ballGeo, M.gold);
    ballMesh.castShadow = true; ballMesh.receiveShadow = true;
    // Equatorial collar ring around the sphere where cables & hydraulic dampers lock on
    const ringGeo = new THREE.TorusGeometry(2.42, 0.16, 12, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, M.iron);
    ringMesh.castShadow = true;
    this.sphereGroup.add(ballMesh, ringMesh);
    this.sphereGroup.position.set(OUR_X, BALL_REST_Y, 0);
    R.add(this.sphereGroup);

    // 8 Thick Steel Suspension Cables (`this.cables`) + 4 Hydraulic Bumper Cylinders (`this.dampers`)
    const cableM = twoTone(lam("chainHD", () => ({ map: rep(chainHD(), 1, 1), side: THREE.DoubleSide })) as THREE.MeshLambertMaterial, 0.15);
    for (let i = 0; i < 4; i++) {
      const s = new Strand(10, 0.11, 0.11, M.iron, 1);
      this.cables.push(s); R.add(s.mesh);
    }
    for (let i = 0; i < 2; i++) {
      const d = new Strand(6, 0.22, 0.22, this.damperMat, 1);
      this.dampers.push(d); R.add(d.mesh);
    }

    // ---- Tangible Yardsticks on the Atrium Floor (Shot 12 & Shot 15) ----
    // 1) White Dinner Plate on a low dark scale pad (September: "width of a dinner plate")
    const pPad = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), M.iron);
    const pDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.35, 0.09, 24), M.porcelain);
    pDisc.position.y = 0.08;
    const pRim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 24).rotateX(Math.PI / 2), M.goldBar);
    pRim.position.y = 0.12;
    this.plateGroup.add(pPad, pDisc, pRim);
    this.plateGroup.position.set(OUR_X, ATRIUM_Y + 0.04, -0.2);
    R.add(this.plateGroup);

    // 2) White Porcelain Bathtub with gold claw feet (October: "length of a bathtub")
    const tubBody = new THREE.Mesh(boxGeo(V(-1.45, 0.18, -0.58), V(1.45, 0.92, 0.58), 0, true), M.porcelain);
    const tubRim = new THREE.Mesh(boxGeo(V(-1.55, 0.88, -0.66), V(1.55, 1.0, 0.66), 0, true), M.porcelain);
    const tubInside = new THREE.Mesh(boxGeo(V(-1.3, 0.93, -0.45), V(1.3, 1.02, 0.45), 0, true), M.tealSteel);
    this.tubGroup.add(tubBody, tubRim, tubInside);
    for (const sx of [-1.2, 1.2]) for (const sz of [-0.45, 0.45]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M.goldBar);
      foot.position.set(sx, 0.1, sz);
      this.tubGroup.add(foot);
    }
    this.tubGroup.position.set(OUR_X, ATRIUM_Y, -0.2);
    R.add(this.tubGroup);

    // 3) Giant Green Spirit Level on the Atrium Floor (Shot 15: "keeping the floor dead level")
    const lvlBar = new THREE.Mesh(boxGeo(V(-1.35, 0.0, -0.22), V(1.35, 0.36, 0.22), 0, true), M.goldBar);
    const lvlVial = new THREE.Mesh(boxGeo(V(-0.38, 0.04, -0.25), V(0.38, 0.32, 0.25), 0, true), lam("vialGreen", () => ({ color: "#4ce670" })));
    const lvlBubble = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), M.porcelain);
    lvlBubble.position.set(0, 0.19, -0.23);
    this.levelGroup.add(lvlBar, lvlVial, lvlBubble);
    this.levelGroup.position.set(OUR_X, ATRIUM_Y + 0.02, -0.8);
    R.add(this.levelGroup);

    // =========================================================================
    // 2. RIVAL RIGID TOWER (Right, RIVAL_X = 16, Z = 0)
    // =========================================================================
    // Lower base below the waist fracture line (y = D0..28) in static batch
    b.add(boxGeo(V(RIVAL_X - W, D0, -W), V(RIVAL_X + W, 28.0, W), 0, true), M.glassSlate);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.add(boxGeo(V(RIVAL_X + sx * W - 0.55, D0, sz * W - 0.55), V(RIVAL_X + sx * W + 0.55, 28.0, sz * W + 0.55)), M.steel);
    }
    // Rival Hotel Entrance Canopy at street level (RIVAL_X, D0, -W)
    b.add(boxGeo(V(RIVAL_X - 3.5, D0 + 3.2, -W - 2.4), V(RIVAL_X + 3.5, D0 + 3.7, -W), 1, true), M.cope);

    // Upper section of Rival Tower above waist (y = 28..54) in `this.rivalUpper` (pivots at (RIVAL_X, 28, 0) so it snaps at the waist!)
    this.rivalUpper.position.set(RIVAL_X, 28.0, 0);
    R.add(this.rivalUpper);
    const bRiv = new Batch();
    // Solid slate curtain wall from local y = 0..9.5 (ending cleanly below penthouse floor slab at 9.5..10.0 to prevent Z-fighting)
    bRiv.add(boxGeo(V(-W, 0, -W), V(W, 9.5, W), 0, true), M.glassSlate);
    // Rival Penthouse / Structural Frame Floor (local y = 9.5..10.0, world y = 37.5..38.0) & roof slab (19.0..19.6)
    bRiv.add(boxGeo(V(-W - 0.15, 9.5, -W - 0.15), V(W + 0.15, 10.0, W + 0.15), 2, true), M.cope);
    bRiv.add(boxGeo(V(-W - 0.15, 19.0, -W - 0.15), V(W + 0.15, 19.6, W + 0.15), 2, true), M.steel);
    bRiv.add(boxGeo(V(-W, 10.0, W - 0.5), V(W, 19.0, W), 2, true), M.wall);
    // Massive rigid steel corner columns + inflexible X-braces (using `this.rivalStressMat` so they glow neon orange-red in Shot 14!)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bRiv.add(boxGeo(V(sx * W - 0.55, 0, sz * W - 0.55), V(sx * W + 0.55, 25.5, sz * W + 0.55), 0, true), this.rivalStressMat);
    }
    // Heavy rigid steel X-braces across the rival penthouse & exterior waist
    const xBrace = (y0: number, y1: number, z: number) => {
      const p1 = V(-W + 0.4, y0, z), p2 = V(W - 0.4, y1, z);
      const p3 = V(W - 0.4, y0, z), p4 = V(-W + 0.4, y1, z);
      for (const [a, c] of [[p1, p2], [p3, p4]] as const) {
        const g = new THREE.BoxGeometry(0.45, a.distanceTo(c), 0.45);
        const m = new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5),
          new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize()), V(1, 1, 1));
        bRiv.add(g.applyMatrix4(m), this.rivalStressMat);
      }
    };
    xBrace(0.5, 9.5, -W - 0.1);   // exterior waist X-brace
    xBrace(10.2, 18.8, 1.8);      // interior penthouse rigid X-brace behind Rival Tycoon
    bRiv.add(boxGeo(V(-W * 0.82, 19.6, -W * 0.82), V(W * 0.82, 25.5, W * 0.82), 0, true), M.glassSlate);
    bRiv.build(this.rivalUpper);

    // Flying concrete/steel debris blocks when the Rival Tower snaps at the waist (Shot 16)
    const debGeo = new THREE.BoxGeometry(0.9, 0.7, 0.8);
    for (let i = 0; i < 14; i++) {
      const dm = new THREE.Mesh(debGeo, i % 2 ? M.cope : this.rivalStressMat);
      dm.castShadow = true; dm.visible = false;
      this.debris.push(dm); R.add(dm);
    }

    b.build(R);
    buildTown(R, kit, sightLines());

    // ---- Coastal Ocean Water ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "river1";
    const wm = new THREE.Mesh(quadUp(-900, 900, -900, -28, 1, 1, -D0), waterM);
    wm.receiveShadow = true;
    R.add(wm);

    // Flags on top of both skyscrapers
    const flagM = lam("flagM", () => ({ map: flagTex(), side: THREE.DoubleSide }));
    for (const xc of [OUR_X, RIVAL_X]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3, 12, 1), flagM);
      f.position.set(xc, 56.5, 0); f.castShadow = true; f.frustumCulled = false;
      this.flags.push(f); R.add(f);
    }

    // Chimney / storm dust smoke
    const smokeT = smokeTex();
    for (const [top, n] of [[[-22, D0 + 30.6, -77], 7], [[-80, D0 + 24.6, 93], 6]] as const)
      for (let k = 0; k < n; k++) {
        const mat = new THREE.MeshLambertMaterial({ map: smokeT, transparent: true, depthWrite: false });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        m.layers.set(NOINK);
        this.smoke.push({ m, mat, top: top as unknown as V3, k: k / n }); R.add(m);
      }

    this.swing = new Actor(R, swingGeo);
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1] ?? SHOTS[0], tau = s.tau(t), b = bridgeState(id, t), L = LIGHTS[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);

    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 14, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 32);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);

    // ---- sky & fog ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }

    // ---- water ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t * (s.light === "golden" ? 2.6 : 1.0);

    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;

    // ---- Pose Skyscrapers, 730-Ton Pendulum Sphere & Rival Collapse ----
    this.poseTowers(b, t, tau, id);

    // ---- Cast + 2D Effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, b, { pos: cam.position, right });
    if (id === 16) snapFx(tau, [RIVAL_X, 28.0, 0], st);

    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (p.geo !== "swing" && !this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 4.5))) continue;
      const a = p.geo === "swing" ? this.swing : this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = p.geo === "swing" ? true : L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    if (!used.includes(this.swing)) this.swing.mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h) + 2))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }

  private poseTowers(b: BridgeState, t: number, tau: number, id: number) {
    // 1) Our Tower sway: dead level in super-storm (Shot 15-16), slight gentle breeze sway in Shot 9
    const ourTilt = id === 9 ? 0.018 * Math.sin(t * 2.8) : 0;
    this.ourUpper.rotation.set(0, 0, ourTilt);

    // 2) The 730-Ton Golden Sphere pendulum arc
    const Lc = CABLE_TOP_Y - BALL_REST_Y; // 6.2 m cable length
    const dx = THREE.MathUtils.clamp(b.bounce, -2.5, 2.5);
    const dy = Lc - Math.sqrt(Math.max(0.5, Lc * Lc - dx * dx));
    const bx = OUR_X + dx, by = BALL_REST_Y + dy;
    this.sphereGroup.position.set(bx, by, 0);
    this.sphereGroup.rotation.set(0, 0, Math.asin(dx / Lc));

    // Update 4 suspension cable pairs from ceiling anchors to the sphere's equatorial ring
    const corners: [number, number][] = [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]];
    corners.forEach(([ox, oz], i) => {
      const topP = V(OUR_X + ox * 0.75, CABLE_TOP_Y, oz * 0.75);
      const botP = V(bx + ox, by + 0.35, oz);
      const pts = Array.from({ length: 10 }, (_, k) => topP.clone().lerp(botP, k / 9));
      this.cables[i].set(pts);
    });

    // Update hydraulic bumper cylinders from atrium floor bollards to the bottom of the sphere
    const dampGlow = id >= 12 ? clamp01((Math.abs(dx) - 0.3) / 1.5) : 0;
    this.damperMat.color.setHSL(0.07 - 0.04 * dampGlow, 0.85, 0.48 + 0.18 * dampGlow);
    this.damperMat.emissive.setHSL(0.05, 1.0, 0.25 * dampGlow);
    for (const [i, sx] of [[0, -1], [1, 1]] as const) {
      const a0 = V(OUR_X + sx * 3.6, ATRIUM_Y + 0.9, 0);
      const a1 = V(bx + sx * 1.4, by - 1.2, 0);
      const pts = Array.from({ length: 6 }, (_, k) => a0.clone().lerp(a1, k / 5));
      this.dampers[i].set(pts);
    }

    // Tangible Yardstick visibility on the atrium floor
    this.plateGroup.visible = b.yardstick === "plate";
    this.tubGroup.visible = b.yardstick === "tub";
    this.levelGroup.visible = b.yardstick === "level";

    // 3) Rival Rigid Tower stress glow & waist snap (at y = 28)
    const st = b.stress;
    if (st > 0.05) {
      // Glow hot magenta-orange-red as hurricane wind stress builds with nowhere to bend
      this.rivalStressMat.color.setHSL(0.04 * (1 - st), 0.9, 0.42 + 0.22 * st);
      this.rivalStressMat.emissive.setHSL(0.02, 1.0, 0.38 * st * (0.75 + 0.25 * Math.sin(t * 14)));
    } else {
      this.rivalStressMat.color.set("#555d6b");
      this.rivalStressMat.emissive.set("#000000");
    }

    if (b.snap <= 0) {
      // Rigid vibration before snapping
      const vib = st > 0.3 ? 0.012 * st * Math.sin(t * 32) : 0;
      this.rivalUpper.position.set(RIVAL_X, 28.0, 0);
      this.rivalUpper.rotation.set(0, 0, vib);
      for (const dm of this.debris) dm.visible = false;
    } else {
      // Snaps at the waist like dry chalk and shears sideways!
      const u = smooth(b.snap), d = b.drop;
      this.rivalUpper.position.set(RIVAL_X + 3.2 * u + 7.5 * d, 28.0 - 0.8 * u - 9.5 * d, 0);
      this.rivalUpper.rotation.set(0.08 * u, 0, -0.28 * u - 0.65 * d);
      const dt = Math.max(0, tau - SNAP);
      this.debris.forEach((dm, i) => {
        dm.visible = true;
        const ang = (i / this.debris.length) * Math.PI * 2;
        const vx = Math.cos(ang) * (4 + (i % 4) * 2.5) + 3.0;
        const vy = 4.0 + (i % 3) * 3.0;
        const vz = Math.sin(ang) * 4.5 - 2.0;
        dm.position.set(RIVAL_X + vx * dt, 28.0 + vy * dt - 9.8 * dt * dt, vz * dt);
        dm.rotation.set(dt * 5 * (i % 2 ? 1 : -1), dt * 4, dt * 6);
      });
    }

    // 4) Smoke & Flags
    for (const sm of this.smoke) {
      const u = (t * 0.11 + sm.k) % 1, sz = 3 + u * 9;
      sm.m.position.set(sm.top[0] - u * 18, sm.top[1] + u * 13 + u * u * 4, sm.top[2] + u * 3);
      sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(this.sky.quaternion);
      sm.mat.opacity = 0.85 * (1 - u) ** 1.2;
    }
    const windSpd = id >= 11 ? 11.0 : 4.5;
    for (const fl of this.flags) {
      const p = fl.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = (i % 13) / 12, y = i < 13 ? 0.65 : -0.65;
        p.setXYZ(i, -u * 2.2, y + 0.08 * u * Math.sin(t * windSpd - u * 3), 0.3 * u * Math.sin(t * (windSpd * 1.3) - u * 5));
      }
      p.needsUpdate = true;
    }
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.0);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

const swingGeo = (() => { const g = new THREE.PlaneGeometry(700 * SU_SWING, 2300 * SU_SWING); g.translate(0, -(1150 - 20) * SU_SWING, 0); return g; })();
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
function wallQuad(x0: number, x1: number, z: number, dir: number) {
  const g = new THREE.BufferGeometry(), y0 = -0.6, y1 = D0;
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y0, z, x1, y1, z, x0, y1, z], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([0, 0, dir]).flat(), 3));
  const u = Math.abs(x1 - x0) / 4, v = (y1 - y0) / 4;
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}

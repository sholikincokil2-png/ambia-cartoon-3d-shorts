// Our cast as lit flat sprites in the 3D Skyscraper world.
// Characters are yaw-only billboards shaded by cardShade() on the NOINK layer so the world ink shader never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, swingKid, soldier, townsfolk,
  ENGINEER, BOSS, BOSS_PURPLE, TYCOON, WORKER, OFFICER, KID, PARENT,
  fxNote, fxBurst, fxSplash, fxStars, fxCreak, fxRing, fxShadow, fxContact, fxPlank, fxDrum,
  fxSteam, fxWindArrow, fxNewspaper,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, ATRIUM_Y, BALL_REST_Y, OUR_X, RIVAL_X, SHOTS, SNAP, DROP1, PURPLE_AT,
  V3, smooth, clamp01, BridgeState,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0;
    }
  }
}

export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
const WORKERS = [0, 1, 2, 3].map((v) => ({ ...WORKER, skin: ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"][v % 4], moustache: v % 2 ? "#3a2518" : undefined }));
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(18 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SIGN_AT: V3 = [2.25, D0, -30.9];

const ENG_WHO: Who = { i: 1, o: ENGINEER, okey: "eng" };
const BOSS_WHO: Who = { i: 2, o: BOSS, okey: "boss" };
const BOSS_PURP_WHO: Who = { i: 2, o: BOSS_PURPLE, okey: "bossp" };
const TYCOON_WHO: Who = { i: 3, o: TYCOON, okey: "tyc" };

export const stage = (id: number, t: number, b: BridgeState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1] ?? SHOTS[0];
  LNAME = s.light;
  findSun(cam, SUN);
  const frontView = { side: false, mirror: false };

  // ---- Shot 1: Hook inside 88th-floor atrium (Young Engineer tightening cable under the 730-ton sphere) ----
  if (id === 1) {
    const ex = OUR_X - 2.1, ey = ATRIUM_Y, ez = -0.5;
    const strike = q(0.5 + 0.5 * Math.sin(t * 9.0), 20);
    out.places.push(person(cam, ENG_WHO, ex, ey, ez, frontView,
      { mode: "stand", expr: "grin", prop: ["hammer", strike], blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, ex, ey, ez);
    // welding / wrench spark burst
    if (Math.sin(t * 9.0) > 0.65) {
      const u = q(((t * 3) % 1), 20);
      out.fx.push({ key: `spark${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: ex + 0.55, y: ey + 1.35, z: ez - 0.15, w: 0.65, h: 0.65 });
    }
  }

  // ---- Shot 2: Coastal Aerial - crowd on the promenade below both towers ----
  if (id === 2 || id === 11) {
    for (let i = 0; i < 16; i++) {
      const x = -18 + i * 2.4 + (hh(i) - 0.5) * 0.8, z = -15 - hh(i, 2) * 4;
      const who: Who = { i: 100 + i, o: FOLK[i % 6], okey: `f${i % 6}` };
      out.places.push(person(cam, who, x, D0, z, frontView, { mode: "stand", expr: "smile", blink: lidAt(t, i + 20) }, {}));
      blob(out, x, D0, z);
    }
  }

  // ---- Shot 3: Grand Prize Plaza ("gets the billionaire bookings for the whole country") ----
  if (id === 3) {
    // Official presenter + Boss + Tycoon flanking the gold bar pyramid at (0, D0, -15)
    out.places.push(person(cam, { i: 50, o: OFFICER, okey: "off" }, -1.85, D0, -15.2, frontView,
      { mode: "stand", expr: "laugh", wave: q(Math.sin(t * 8), 20), blink: lidAt(t, 50), facing: 1 }, {}));
    blob(out, -1.85, D0, -15.2);
    out.places.push(person(cam, BOSS_WHO, 1.85, D0, -15.4, frontView,
      { mode: "stand", expr: "grin", blink: lidAt(t, 2), facing: -1 }, {}));
    blob(out, 1.85, D0, -15.4);
    // Sparkles on the gold pyramid
    const u = q((t * 1.8) % 1, 25);
    out.fx.push({ key: `goldspark${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ffe866", 8, 20, 170), x: 0.3, y: D0 + 1.2, z: -15.0, w: 0.7, h: 0.7 });
  }

  // ---- Shot 4: High Steel Girder Lunch ("He's the youngest engineer on the crew") ----
  if (id === 4) {
    const by = 32.8, bz = -7.5;
    for (let k = 0; k < 3; k++) {
      const wx = OUR_X - 1.45 + k * 0.95;
      out.places.push(person(cam, { i: 30 + k, o: WORKERS[k], okey: `wk${k}` }, wx, by, bz, frontView,
        { mode: "sit", expr: k === 1 ? "laugh" : "smile", blink: lidAt(t, 30 + k), look: 1 }, {}));
    }
    // Young Engineer on the right of the beam, grinning
    const ex = OUR_X + 1.45;
    out.places.push(person(cam, ENG_WHO, ex, by, bz, frontView,
      { mode: "sit", expr: "grin", wave: q(Math.sin(t * 6), 20), blink: lidAt(t, 1), facing: -1 }, {}));
  }

  // ---- Shot 5: Boss steps into the 4-story hollow atrium and stares up in shock at the sphere ----
  if (id === 5) {
    const bx = OUR_X + 2.1, by = ATRIUM_Y, bz = 0.5;
    const ex = OUR_X - 2.1, ez = 0.4;
    out.places.push(person(cam, BOSS_WHO, bx, by, bz, frontView,
      { mode: "stand", expr: t < 15.6 ? "neutral" : "shock", headTilt: -10, blink: lidAt(t, 2), facing: -1 }, {}));
    blob(out, bx, by, bz);
    out.places.push(person(cam, ENG_WHO, ex, by, ez, frontView,
      { mode: "stand", expr: "smile", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, ex, by, ez);
  }

  // ---- Shot 6: Boss turns bright purple with rage, white steam blasting out of both ears ----
  if (id === 6) {
    const bx = OUR_X + 2.2, by = ATRIUM_Y, bz = 0.4;
    const isPurple = t >= PURPLE_AT - 0.15;
    const hop = isPurple ? Math.abs(Math.sin((t - PURPLE_AT) * 14)) * 0.14 : 0;
    out.places.push(person(cam, isPurple ? BOSS_PURP_WHO : BOSS_WHO, bx, by + hop, bz, frontView,
      { mode: "stand", expr: isPurple ? "pained" : "shock", wave: isPurple ? q(Math.sin(t * 18), 20) : undefined, blink: 0, facing: -1 }, {}));
    blob(out, bx, by, bz);
    if (isPurple) {
      const u = q(((t - PURPLE_AT) * 2.2) % 1, 25);
      out.fx.push({ key: `steamR${u}`, cw: 400, ch: 300, draw: (p) => fxSteam(p, u, 1), x: bx + 0.58, y: by + hop + 1.65, z: bz - 0.1, w: 0.9, h: 0.68 });
      out.fx.push({ key: `steamL${u}`, cw: 400, ch: 300, draw: (p) => fxSteam(p, u, -1), x: bx - 0.58, y: by + hop + 1.65, z: bz - 0.1, w: 0.9, h: 0.68 });
    }
  }

  // ---- Shot 7: Young Engineer refuses to unhook a single cable (calm confident smirk) ----
  if (id === 7) {
    const ex = OUR_X - 2.2, ey = ATRIUM_Y, ez = 0.4;
    out.places.push(person(cam, ENG_WHO, ex, ey, ez, frontView,
      { mode: "stand", expr: "smile", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, ex, ey, ez);
    // Steaming purple boss in background right
    const bx = OUR_X + 2.0, bz = 1.2;
    out.places.push(person(cam, BOSS_PURP_WHO, bx, ey, bz, frontView,
      { mode: "stand", expr: "stern", blink: lidAt(t, 2), facing: -1 }, {}));
    blob(out, bx, ey, bz);
  }

  // ---- Shot 8: Rival Skyscraper - Tycoon & workers bolting steel rigid as stone ----
  if (id === 8) {
    const ry = ATRIUM_Y;
    out.places.push(person(cam, TYCOON_WHO, RIVAL_X - 0.4, ry, 0.2, frontView,
      { mode: "stand", expr: "grin", blink: lidAt(t, 3), facing: 1 }, {}));
    blob(out, RIVAL_X - 0.4, ry, 0.2);
    for (const [k, wx] of [[0, RIVAL_X - 2.3], [1, RIVAL_X + 2.1]] as const) {
      const strike = q(0.5 + 0.5 * Math.sin(t * 8 + k), 20);
      out.places.push(person(cam, { i: 40 + k, o: WORKERS[k], okey: `wk${k}` }, wx, ry, 0.5, frontView,
        { mode: "stand", expr: "stern", prop: ["hammer", strike], blink: lidAt(t, 40 + k), facing: k ? -1 : 1 }, {}));
      blob(out, wx, ry, 0.5);
    }
    if (Math.abs(t - 25.0) < 0.25) {
      const u = q((t - 24.75) * 4, 20);
      out.fx.push({ key: `boltclink${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: RIVAL_X - 1.8, y: ry + 1.5, z: 0.2, w: 0.8, h: 0.8 });
    }
  }

  // ---- Shot 9: Rival tower stands dead still vs Our tower sways with a creepy whoosh ----
  if (id === 9) {
    const ry = ATRIUM_Y;
    // Rival Tycoon calm & smug in his rigid lounge
    out.places.push(person(cam, TYCOON_WHO, RIVAL_X + 0.8, ry, 0.3, frontView,
      { mode: "stand", expr: "smile_closed", blink: lidAt(t, 3), facing: -1 }, {}));
    blob(out, RIVAL_X + 0.8, ry, 0.3);
    // Our Boss nervous + calm Engineer in our swaying atrium listening to the whoosh
    out.places.push(person(cam, BOSS_WHO, OUR_X + 1.2, ry, 0.3, frontView,
      { mode: "stand", expr: "nervous", look: -1, blink: lidAt(t, 2), facing: -1 }, {}));
    blob(out, OUR_X + 1.2, ry, 0.3);
    out.places.push(person(cam, ENG_WHO, OUR_X - 1.2, ry, 0.4, frontView,
      { mode: "stand", expr: "smile", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, OUR_X - 1.2, ry, 0.4);
  }

  // ---- Shot 10: Newspaper "The Seasick Tower" & wealthy tourists marching into the Rival Hotel ----
  if (id === 10) {
    // Dejected Boss outside our tower on the left
    out.places.push(person(cam, BOSS_WHO, -5.2, D0, -14.5, frontView,
      { mode: "stand", expr: "pained", blink: lidAt(t, 2), facing: 1 }, {}));
    blob(out, -5.2, D0, -14.5);
    // Reader holding up the cartoon newspaper
    out.places.push(person(cam, { i: 60, o: FOLK[0], okey: "f0" }, -3.6, D0, -14.8, frontView,
      { mode: "stand", expr: "shock", blink: lidAt(t, 60), facing: -1 }, {}));
    blob(out, -3.6, D0, -14.8);
    out.fx.push({ key: "newspaper", cw: 420, ch: 520, draw: fxNewspaper, x: -4.15, y: D0 + 1.35, z: -15.2, w: 0.78, h: 0.96, rot: -0.08 });
    // Stream of wealthy guests walking right (+x) into the Rival Hotel entrance
    for (let i = 0; i < 12; i++) {
      const gx = -1.5 + i * 1.35 + (t - 31.8) * 1.8, gz = -13.5 - (i % 3) * 1.1;
      const who: Who = { i: 70 + i, o: FOLK[i % 6], okey: `f${i % 6}` };
      const ph = q(((t * 1.2 + i * 0.25) % 1), 60);
      const view = viewOf(cam, gx, gz, 1, 0);
      out.places.push(person(cam, who, gx, D0, gz, view,
        { mode: "stroll", phase: ph, expr: "smile", blink: lidAt(t, 70 + i) },
        { mode: "march", phase: ph, expr: "smile", stomp: 0.6, stride: 0.85 }));
      blob(out, gx, D0, gz);
    }
  }

  // ---- Shot 12: September (dinner plate) & October (bathtub) yardsticks inside the atrium ----
  if (id === 12) {
    const ey = ATRIUM_Y;
    out.places.push(person(cam, ENG_WHO, OUR_X - 1.75, ey, 0.4, frontView,
      { mode: "stand", expr: "smile", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, OUR_X - 1.75, ey, 0.4);
    out.places.push(person(cam, BOSS_WHO, OUR_X + 1.75, ey, 0.4, frontView,
      { mode: "stand", expr: "shock", blink: lidAt(t, 2), facing: -1 }, {}));
    blob(out, OUR_X + 1.75, ey, 0.4);
  }

  // ---- Shot 13: Boss furious ("See, your own weight is tearing us apart!") ----
  if (id === 13) {
    const ey = ATRIUM_Y;
    const hop = Math.abs(Math.sin(t * 12)) * 0.1;
    out.places.push(person(cam, BOSS_PURP_WHO, OUR_X + 1.35, ey + hop, 0.4, frontView,
      { mode: "stand", expr: "pained", wave: q(Math.sin(t * 15), 20), blink: 0, facing: -1 }, {}));
    blob(out, OUR_X + 1.35, ey, 0.4);
    const u = q((t * 2.0) % 1, 25);
    out.fx.push({ key: `steamR2_${u}`, cw: 400, ch: 300, draw: (p) => fxSteam(p, u, 1), x: OUR_X + 1.9, y: ey + hop + 1.65, z: 0.3, w: 0.85, h: 0.64 });
    out.places.push(person(cam, ENG_WHO, OUR_X - 1.35, ey, 0.4, frontView,
      { mode: "stand", expr: "smile", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, OUR_X - 1.35, ey, 0.4);
  }

  // ---- Shot 14: Rival rigid tower groaning in the gale & bolts popping out ----
  if (id === 14) {
    const ry = ATRIUM_Y;
    // Terrified Rival Tycoon inside his cracking rigid penthouse
    out.places.push(person(cam, TYCOON_WHO, RIVAL_X + 0.4, ry, 0.3, frontView,
      { mode: "stand", expr: "shock", wave: q(Math.sin(t * 16), 20), blink: 0, facing: -1 }, {}));
    blob(out, RIVAL_X + 0.4, ry, 0.3);
    // Creak / strain ticks along the rigid steel columns
    creakFx(t, [
      [RIVAL_X - 2.6, ry + 2.2, -0.5],
      [RIVAL_X + 2.6, ry + 1.8, -0.5],
      [RIVAL_X - 2.8, 28.0, -3.6],
      [RIVAL_X + 2.8, 26.0, -3.6],
    ], out, 0.95);
    // Popping bolt bursts
    for (const tb of [51.2, 51.6, 52.1, 52.6]) {
      if (t >= tb && t < tb + 0.35) {
        const u = q((t - tb) / 0.35, 20);
        out.fx.push({ key: `popburst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: RIVAL_X - 1.9, y: ry + 2.1, z: -0.2, w: 1.1, h: 1.1 });
      }
    }
  }

  // ---- Shot 15: Super-storm physics payoff (wind pushes left, ball swings right, floor stays dead level) ----
  if (id === 15) {
    const ey = ATRIUM_Y;
    out.places.push(person(cam, ENG_WHO, OUR_X - 1.45, ey, 0.3, frontView,
      { mode: "stand", expr: "grin", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, OUR_X - 1.45, ey, 0.3);
    out.places.push(person(cam, BOSS_WHO, OUR_X + 1.45, ey, 0.4, frontView,
      { mode: "stand", expr: "relief_open", blink: lidAt(t, 2), facing: -1 }, {}));
    blob(out, OUR_X + 1.45, ey, 0.4);
    // Animated blue wind force arrows sweeping right-to-left clearly visible in frame beside the sphere
    const u = q((t * 1.5) % 1, 25);
    out.fx.push({ key: `windA${u}`, cw: 500, ch: 220, draw: (p) => fxWindArrow(p, u), x: OUR_X + 2.2, y: ey + 3.2, z: -2.2, w: 2.1, h: 0.9 });
    out.fx.push({ key: `windB${u}`, cw: 500, ch: 220, draw: (p) => fxWindArrow(p, u), x: OUR_X - 2.1, y: ey + 2.5, z: -2.2, w: 2.1, h: 0.9 });
  }

  // ---- Shot 16: Climax - Rival rigid tower snaps at the waist like dry chalk while Engineer watches ----
  if (id === 16) {
    const ey = ATRIUM_Y;
    out.places.push(person(cam, ENG_WHO, OUR_X + 1.8, ey, 0.2, frontView,
      { mode: "stand", expr: "shock", look: 1, blink: 0, facing: 1 }, {}));
    blob(out, OUR_X + 1.8, ey, 0.2);
    out.places.push(person(cam, BOSS_WHO, OUR_X + 0.4, ey, 0.6, frontView,
      { mode: "stand", expr: "shock", look: 1, blink: 0, facing: 1 }, {}));
    blob(out, OUR_X + 0.4, ey, 0.6);
  }

  return out;
};

// ---------------- one-off effects ----------------
export const snapFx = (tau: number, at: V3, out: Stage) => {
  if (tau >= SNAP && tau < SNAP + 0.85) {
    const u = clamp01((tau - SNAP) / 0.85);
    out.fx.push({ key: `bigburst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: at[0], y: at[1], z: at[2] - 2.0, w: 7.5, h: 7.5 });
    out.fx.push({ key: `bigburstB${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(Math.min(1, u * 1.2), 30), "#ff944d"), x: at[0] + 2.5, y: at[1] - 1.5, z: at[2] - 2.5, w: 6.0, h: 6.0 });
  }
};
export const splashFx = (_tau: number, _out: Stage) => {};
export const creakFx = (t: number, pts: V3[], out: Stage, size = 0.8) =>
  pts.forEach(([x, y, z], i) => {
    const u = q((t * 1.3 + i * 0.37) % 1, 30);
    out.fx.push({ key: `creak${u}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, u), x, y, z, w: size, h: size, rot: i * 0.6 - 0.6 });
  });
export { FPS };

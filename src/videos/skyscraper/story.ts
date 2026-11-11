// Timeline of the Skyscraper Pendulum (730-ton Tuned Mass Damper) short:
// 16 shots timed to g:/ambia/voice/words.json (1860 frames = 62.0s at 30 fps).
// Follows the cartoon-3d-short camera grammar: continuous slow push-ins, symmetric smootherstep glides,
// hard cuts on major reframes, and 7-frame alternating impact kicks on physical beats.
export const FPS = 30;
export const TOTAL = 1860;
export const D0 = 6.0; // coastal promenade height (m)
export const ATRIUM_Y = 38.0; // floor of the 4-story penthouse damper atrium inside our tower
export const BALL_REST_Y = 42.6; // center of the 730-ton golden sphere at rest
export const CABLE_TOP_Y = 48.8; // ceiling anchor of the 8 suspension cables
export const OUR_X = -16.0; // our tower center X
export const RIVAL_X = 16.0; // rival rigid tower center X
export const TOWER_Z = 0.0; // both towers sit at Z = 0 along the hurricane coast
export const HALF = 27;
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 24;
export const PARK: V3 = [70, D0, -75];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- story physics (skyscraper damper & storm dynamics) ----------------
export const PURPLE_AT = 17.95; // "he goes purple: You're wrecking my penthouse!"
export const STORM_AT = 36.0;   // "Then typhoon season hits..."
export const SEPT_AT = 39.0;    // "In September, the ball swings the width of a dinner plate."
export const OCT_AT = 42.2;     // "By October, the length of a bathtub."
export const FURIOUS_AT = 45.2; // "And his boss is furious"
export const GROAN_AT = 48.3;   // "Meanwhile, in the rigid tower, the stiff steel columns groan"
export const COUNTER_AT = 53.8; // "In the worst super-storm... his giant ball swings the opposite way"
export const SNAP = 60.03;      // "right as the rigid tower snaps at the waist like dry chalk"
export const DROP0 = 60.03, DROP1 = 60.65, DROP_H = 12.0;

export type BridgeState = {
  bounce: number;      // pendulum X displacement (m) from OUR_X
  drop: number;        // rival tower snap/collapse progress (0..1)
  snap: number;        // rival tower waist fracture progress (0..1)
  collapsed: boolean;  // true after rival tower shears
  wind: number;        // wind force pushing towers (-1..1)
  stress: number;      // thermal/structural stress on rival tower (0..1)
  yardstick: "none" | "plate" | "tub" | "level";
};

export const front = (tau: number) => 26 - 1.6 * (tau - 4.4);
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1;
export const stomp = (tau: number) => lin([[21.4, 1.0], [27.4, 1.35], [33, 1.5]], tau);
export const shapeZ = (z: number) => (Math.abs(z) < HALF ? Math.cos((Math.PI * z) / (2 * HALF)) : 0);
export const dropW = (z: number) => smooth((20 - z) / 26);
export const dropU = (tau: number) => (tau < DROP0 ? 0 : Math.min(1, ((tau - DROP0) / (DROP1 - DROP0)) ** 2));
export const deckY = (_z: number, _b: BridgeState) => D0;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "none" | "march" | "fall" | "water" | "bank" | "tourists";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  // Shot 1 (0.00 - 4.10s): Hook inside the cavernous 88th-floor atrium - Young Engineer & 730-ton sphere
  { id: 1, a: 0, b: 123, light: "day", crowd: "none", tau: (t) => t, sunAz: 55, el: 35 } as ShotDef,
  // Shot 2 (4.10 - 8.20s): Aerial of both coastal skyscrapers racing side-by-side on the turquoise coast
  { id: 2, a: 123, b: 246, light: "day", crowd: "none", tau: (t) => t, towns: true, sunAz: 115, sunEl: 42 },
  // Shot 3 (8.20 - 12.00s): Grand coastal plaza & gold prize pile ("gets the billionaire bookings")
  { id: 3, a: 246, b: 360, light: "day", crowd: "none", tau: (t) => t, sunAz: 75, sunEl: 45 },
  // Shot 4 (12.00 - 14.50s): High steel girder lunch - 3 veteran workers + grinning Young Engineer
  { id: 4, a: 360, b: 435, light: "day", crowd: "none", tau: (t) => t, sunAz: 65, sunEl: 48 },
  // Shot 5 (14.50 - 17.60s): Boss steps into the 4-story hollow atrium and stares up at the giant golden sphere
  { id: 5, a: 435, b: 528, light: "day", crowd: "none", tau: (t) => t, sunAz: 60, sunEl: 38 },
  // Shot 6 (17.60 - 20.00s): Boss turns purple with rage, steam blasting from ears ("You're wrecking my penthouse!")
  { id: 6, a: 528, b: 600, light: "day", crowd: "none", tau: (t) => t, sunAz: 50, sunEl: 40 },
  // Shot 7 (20.00 - 22.30s): Young Engineer stands beside the cable anchor with arms crossed, calm smirk
  { id: 7, a: 600, b: 669, light: "day", crowd: "none", tau: (t) => t, sunAz: 70, sunEl: 40 },
  // Shot 8 (22.30 - 27.20s): Rival skyscraper - Tycoon watches workers bolt rigid steel X-braces & heavy concrete
  { id: 8, a: 669, b: 816, light: "day", crowd: "none", tau: (t) => t, sunAz: -65, sunEl: 45 },
  // Shot 9 (27.20 - 31.80s): Rival tower dead still vs Our tower swaying softly with a whoosh behind the wall
  { id: 9, a: 816, b: 954, light: "day", crowd: "none", tau: (t) => t, sunAz: 60, sunEl: 42 },
  // Shot 10 (31.80 - 35.80s): Plaza humiliation - Newspaper "Seasick Tower" & wealthy guests marching into Rival Hotel
  { id: 10, a: 954, b: 1074, light: "day", crowd: "tourists", tau: (t) => t, sunAz: 85, sunEl: 46 },
  // Shot 11 (35.80 - 38.90s): Typhoon season hits - dramatic golden-storm sky over the bending coastal palms & towers
  { id: 11, a: 1074, b: 1167, light: "golden", crowd: "none", tau: (t) => t, sunAz: -60, sunEl: 10 },
  // Shot 12 (38.90 - 44.50s): Yardsticks inside atrium - September (dinner plate width) -> October (full bathtub length)
  { id: 12, a: 1167, b: 1335, light: "golden", crowd: "none", tau: (t) => t, sunAz: 55, sunEl: 14 },
  // Shot 13 (44.50 - 48.20s): Boss furious ("See, your own weight is tearing us apart!") as hydraulic cylinders glow warm
  { id: 13, a: 1335, b: 1446, light: "golden", crowd: "none", tau: (t) => t, sunAz: 45, sunEl: 14 },
  // Shot 14 (48.20 - 53.70s): Meanwhile in the Rigid Tower - steel columns glow neon red/orange under hurricane stress, bolts pop
  { id: 14, a: 1446, b: 1611, light: "golden", crowd: "none", tau: (t) => t, sunAz: -50, sunEl: 12 },
  // Shot 15 (53.70 - 59.00s): Super-storm physics payoff - wind pushes left, 730-ton sphere swings hard right, floor dead level
  { id: 15, a: 1611, b: 1770, light: "golden", crowd: "none", tau: (t) => t, sunAz: 60, sunEl: 15 },
  // Shot 16 (59.00 - 62.00s): Climax - Rival rigid tower snaps at the waist like dry chalk while Engineer watches from level window
  { id: 16, a: 1770, b: TOTAL, light: "golden", crowd: "none", tau: (t) => t, sunAz: -35, sunEl: 12 },
];

export const XFADE: Record<number, number> = { 8: 6, 11: 8, 14: 6 };
export const FLASH_AT = 123;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export const bridgeState = (id: number, t: number): BridgeState => {
  let bounce = 0.25 * Math.sin(t * 2.2); // gentle idle sway
  let wind = 0.1 * Math.sin(t * 1.5);
  let stress = 0;
  let yardstick: BridgeState["yardstick"] = "none";

  if (id === 1) {
    bounce = 0.45 * Math.sin(t * 2.6);
  } else if (id === 9) {
    bounce = 0.75 * Math.sin(t * 2.8);
  } else if (id === 11) {
    wind = 0.7 + 0.3 * Math.sin(t * 4.0);
    bounce = -0.9 * Math.sin(t * 2.5);
    stress = 0.35;
  } else if (id === 12) {
    if (t < OCT_AT - 0.15) {
      yardstick = "plate";
      bounce = 0.38 * Math.sin((t - SEPT_AT) * 3.4); // dinner-plate swing (~0.75 m total arc)
      wind = 0.4;
    } else {
      yardstick = "tub";
      bounce = 1.65 * Math.sin((t - OCT_AT) * 3.0); // full bathtub swing (~3.3 m total arc)
      wind = 0.75;
    }
  } else if (id === 13) {
    yardstick = "tub";
    bounce = 1.75 * Math.sin(t * 3.2);
    wind = 0.85;
    stress = 0.5;
  } else if (id === 14) {
    wind = 0.95;
    stress = clamp01(0.55 + (t - 48.2) * 0.09);
    bounce = 1.6 * Math.sin(t * 3.0);
  } else if (id === 15) {
    yardstick = "level";
    // Wind pushes left (-x), ball swings hard right (+x) to counter-balance
    const gust = Math.sin((t - 53.7) * 2.4);
    wind = -0.95 * Math.abs(gust) - 0.25;
    bounce = 2.2 * smooth((t - 54.8) / 1.4) + 0.45 * Math.sin(t * 3.5);
    stress = 0.9;
  } else if (id === 16) {
    wind = -1.0;
    bounce = 1.9 * Math.cos((t - 59.0) * 2.8);
    stress = 1.0;
  }

  const snap = t >= SNAP ? clamp01((t - SNAP) / 0.45) : 0;
  const drop = t >= DROP0 ? clamp01(((t - DROP0) / (DROP1 - DROP0)) ** 1.8) : 0;
  return { bounce, drop, snap, collapsed: t >= DROP1, wind, stress, yardstick };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };

export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

export const ANCHOR: V3 = [OUR_X - 2.6, ATRIUM_Y, 0.8];
export const snapEnd = (snap: number): V3 => {
  const u = easeOut(snap);
  return [RIVAL_X + 4.0 * u, 28.0 + 3.0 * u, 2.0 * u];
};

// ---- Per-Shot Camera Framings ----
// Shot 1 (0 - 123): Hook inside 88th-floor atrium -> low angle of Young Engineer & giant golden 730-ton sphere -> pull back outside glass
const S1a = (f: number) => dolly([OUR_X - 0.6, ATRIUM_Y + 1.4, -10.5], [OUR_X - 0.5, ATRIUM_Y + 2.4, 0.0], pushK(f, 0, 0.0025), { fov: 46, roll: -0.025 });
const S1b = (f: number) => dolly([OUR_X + 0.3, ATRIUM_Y + 2.0, -9.2], [OUR_X - 0.3, ATRIUM_Y + 2.6, 0], pushK(f, 36, 0.0025, 0.005, 30), { fov: 44, roll: 0.025 });
const S1c = (f: number) => dolly([OUR_X + 2.2, ATRIUM_Y + 3.2, -16.5], [OUR_X, ATRIUM_Y + 3.0, 0], pushK(f, 76, 0.002), { fov: 44 });

// Shot 2 (123 - 246): Sweeping coastal aerial of BOTH supertall skyscrapers side-by-side (pulled back to -108 so both ±21.4m fit in 9:16)
const S2a = (f: number) => zoom([0, 31, -108], [0, 29, 0], 45, pushK(f, 123, 0.002));
const S2b = (f: number) => zoom([-3, 35, -96], [0, 29, 0], 44, pushK(f, 185, 0.0022));

// Shot 3 (246 - 360): Coastal promenade & grand prize gold pile with Top-Hat Official, Boss & Tycoon all inside frame
const S3a = (f: number) => dolly([0.0, D0 + 1.75, -28.0], [0.0, D0 + 1.35, -15.2], pushK(f, 246, 0.0022), { fov: 44 });
const S3b = (f: number) => dolly([-0.2, D0 + 1.65, -25.5], [0.0, D0 + 1.35, -15.2], pushK(f, 295, 0.002, 0.005, 30), { fov: 42, roll: 0.025 });

// Shot 4 (360 - 435): High steel I-beam lunch - all 3 veteran workers + Young Engineer clearly visible on the red girder
const S4a = (f: number) => dolly([OUR_X, 33.6, -17.2], [OUR_X, 33.3, -7.5], pushK(f, 360, 0.0022), { fov: 44 });
const S4b = (f: number) => dolly([OUR_X + 0.4, 33.5, -14.2], [OUR_X + 0.6, 33.35, -7.5], pushK(f, 392, 0.0025), { fov: 40, roll: -0.02 });

// Shot 5 (435 - 528): Boss steps into the 4-story hollow atrium and stares up at the giant sphere
const S5a = (f: number) => dolly([OUR_X + 0.6, ATRIUM_Y + 1.6, -10.5], [OUR_X + 0.3, ATRIUM_Y + 2.3, 0], pushK(f, 435, 0.0022), { fov: 46 });
const S5b = (f: number) => dolly([OUR_X + 0.4, ATRIUM_Y + 1.5, -9.8], [OUR_X + 0.1, ATRIUM_Y + 2.3, 0], pushK(f, 478, 0.0025), { fov: 46, roll: 0.03 });

// Shot 6 (528 - 600): Close-up on the Boss turning bright purple with steam blasting out of his ears
const S6a = (f: number) => dolly([OUR_X + 2.1, ATRIUM_Y + 1.65, -4.4], [OUR_X + 2.2, ATRIUM_Y + 1.55, 0.4], pushK(f, 528, 0.0025, 0.006, 30), { fov: 38, roll: -0.04 });

// Shot 7 (600 - 669): Young Engineer beside the cable anchor, calm confident smirk
const S7a = (f: number) => dolly([OUR_X - 1.8, ATRIUM_Y + 1.65, -3.5], [OUR_X - 2.2, ATRIUM_Y + 1.55, 0.4], pushK(f, 600, 0.0028), { fov: 35, roll: 0.025 });

// Shot 8 (669 - 816): Rival tower - Rival Tycoon & workers bolting massive rigid steel X-braces
const S8a = (f: number) => dolly([RIVAL_X - 1.2, ATRIUM_Y + 2.0, -11.5], [RIVAL_X, ATRIUM_Y + 2.0, 0], pushK(f, 669, 0.0025), { fov: 44 });
const S8b = (f: number) => dolly([RIVAL_X - 0.6, ATRIUM_Y + 1.6, -6.2], [RIVAL_X - 0.4, ATRIUM_Y + 1.55, 0.2], pushK(f, 738, 0.003, 0.006, 30), { fov: 36 });

// Shot 9 (816 - 954): Rival Tycoon dead still vs Our Boss & Engineer in swaying atrium
const S9a = (f: number) => dolly([RIVAL_X + 0.5, ATRIUM_Y + 1.6, -4.8], [RIVAL_X + 0.8, ATRIUM_Y + 1.5, 0.3], pushK(f, 816, 0.002), { fov: 36 });
const S9b = (f: number) => {
  const sway = 0.035 * Math.sin(T(f) * 3.0);
  return dolly([OUR_X + 0.3, ATRIUM_Y + 1.6, -8.8], [OUR_X + 0.1, ATRIUM_Y + 1.6, 0.2], pushK(f, 876, 0.0022), { fov: 42, roll: sway });
};

// Shot 10 (954 - 1074): Street plaza - Newspaper "Seasick Tower" & wealthy tourists marching into Rival Hotel
const S10a = (f: number) => dolly([-4.4, D0 + 1.65, -22.5], [-4.3, D0 + 1.45, -14.5], pushK(f, 954, 0.0025, 0.005, 28), { fov: 40 });
const S10b = (f: number) => dolly([2.0, D0 + 1.8, -22.5], [6.5, D0 + 1.4, -12.0], pushK(f, 1005, 0.0022), { fov: 42 });

// Shot 11 (1074 - 1167): Typhoon season hits - dramatic golden-storm wide shot of BOTH towers in the gale
const S11a = (f: number) => zoom([-6, 30, -104], [0, 29, 0], 45, pushK(f, 1074, 0.0025), { roll: -0.025 });

// Shot 12 (1167 - 1335): September (dinner plate under sphere) -> October (full porcelain bathtub under sphere)
const S12a = (f: number) => dolly([OUR_X + 0.2, ATRIUM_Y + 1.5, -8.5], [OUR_X, ATRIUM_Y + 1.7, 0], pushK(f, 1167, 0.0022), { fov: 44 });
const S12b = (f: number) => dolly([OUR_X - 0.3, ATRIUM_Y + 1.8, -10.5], [OUR_X, ATRIUM_Y + 2.0, 0], pushK(f, 1263, 0.0022, 0.005, 30), { fov: 46, roll: 0.03 });

// Shot 13 (1335 - 1446): Boss furious shouting at calm Young Engineer in front of the swinging golden sphere (pulled back so both fit cleanly!)
const S13a = (f: number) => dolly([OUR_X + 0.2, ATRIUM_Y + 1.65, -9.8], [OUR_X, ATRIUM_Y + 1.6, 0.3], pushK(f, 1335, 0.0022, 0.005, 30), { fov: 44, roll: -0.03 });

// Shot 14 (1446 - 1611): Rival rigid tower groaning in the gale - glowing neon stress columns & terrified Tycoon as bolts pop
const S14a = (f: number) => zoom([RIVAL_X - 6.0, 28, -48], [RIVAL_X, 30, 0], 44, pushK(f, 1446, 0.0025), { roll: 0.035 });
const S14b = (f: number) => dolly([RIVAL_X + 0.2, ATRIUM_Y + 1.65, -5.8], [RIVAL_X + 0.4, ATRIUM_Y + 1.6, 0.3], pushK(f, 1525, 0.003, 0.006, 30), { fov: 38, roll: -0.045 });

// Shot 15 (1611 - 1770): Super-storm physics payoff - wind arrows + full 730-ton sphere arc + spirit level + characters all in frame
const S15a = (f: number) => dolly([OUR_X, ATRIUM_Y + 2.2, -13.8], [OUR_X, ATRIUM_Y + 2.2, 0], pushK(f, 1611, 0.002), { fov: 46 });
const S15b = (f: number) => dolly([OUR_X - 0.1, ATRIUM_Y + 1.7, -11.5], [OUR_X, ATRIUM_Y + 2.0, 0.2], pushK(f, 1695, 0.0022), { fov: 44, roll: 0.0 });

// Shot 16 (1770 - 1860): Climax - wide exterior showing Rival Tower snapping in half & collapsing inside frame -> whip to shocked Engineer
const S16a = (f: number) => zoom([10, 29, -86], [10, 27, 0], 45, pushK(f, 1770, 0.0022, 0.005, 25), { roll: -0.02 });
const S16b = (f: number) => dolly([OUR_X + 1.2, ATRIUM_Y + 1.7, -5.2], [OUR_X + 2.0, ATRIUM_Y + 1.5, 1.5], pushK(f, 1825, 0.003), { fov: 42, roll: 0.02 });

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 36, dur: 22, s: S1b },
    { f: 76, dur: 28, s: S1c },
  ],
  2: [
    { f: 123, s: S2a },
    { f: 185, dur: 28, s: S2b },
  ],
  3: [
    { f: 246, s: S3a },
    { f: 295, dur: 24, s: S3b },
  ],
  4: [
    { f: 360, s: S4a },
    { f: 392, dur: 22, s: S4b },
  ],
  5: [
    { f: 435, s: S5a },
    { f: 478, dur: 24, s: S5b },
  ],
  6: [{ f: 528, s: S6a }],
  7: [{ f: 600, s: S7a }],
  8: [
    { f: 669, s: S8a },
    { f: 738, cut: true, s: S8b },
  ],
  9: [
    { f: 816, s: S9a },
    { f: 876, cut: true, s: S9b },
  ],
  10: [
    { f: 954, s: S10a },
    { f: 1005, dur: 24, s: S10b },
  ],
  11: [{ f: 1074, s: S11a }],
  12: [
    { f: 1167, s: S12a },
    { f: 1263, cut: true, s: S12b },
  ],
  13: [{ f: 1335, s: S13a }],
  14: [
    { f: 1446, s: S14a },
    { f: 1525, cut: true, s: S14b },
  ],
  15: [
    { f: 1611, s: S15a },
    { f: 1695, dur: 24, s: S15b },
  ],
  16: [
    { f: 1770, s: S16a },
    { f: 1825, cut: true, s: S16b },
  ],
};

// Impact kicks (7-frame alternating shake on physical hits: wrecking ball thud, boss steam burst, rigid bolt clink, thunder, bolt pop, tower snap)
const KICKS: [number, number][] = [
  [1.55, 0.7],        // "wrecking ball" bass thud
  [PURPLE_AT, 1.1],   // "goes purple" steam whistle burst
  [25.0, 0.6],        // "rigid as stone" anvil bolt clink
  [36.88, 0.9],       // "typhoon season hits" thunder clap
  [45.8, 0.8],        // "See, your own weight!" boss cane slam
  [51.6, 0.9],        // "fighting every gust" bolts popping
  [SNAP, 1.6],        // "snaps at the waist" steel fracture
  [DROP1, 1.4],       // "like dry chalk" collapse boom
];

export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};

export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id] ?? CAMS[1], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id] ?? CAMS[1]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 10 },
  { f: 123, cInf: 0 },   // aerial sharp
  { f: 246, cInf: 10 },  // plaza prize CU
  { f: 360, cInf: 12 },  // high beam lunch
  { f: 435, cInf: 8 },   // atrium wide
  { f: 528, cInf: 14 },  // purple boss CU
  { f: 600, cInf: 14 },  // smirking engineer CU
  { f: 669, cInf: 8 },   // rival construction
  { f: 816, cInf: 12 },  // interior comparison
  { f: 954, cInf: 10 },  // plaza newspaper / crowd
  { f: 1074, cInf: 0 },  // storm aerial sharp
  { f: 1167, cInf: 10 }, // yardsticks in atrium
  { f: 1335, cInf: 12 }, // furious boss 2-shot
  { f: 1446, cInf: 6 },  // rival stress exterior
  { f: 1525, cInf: 12 }, // rival interior bolts popping
  { f: 1611, cInf: 8 },  // counter-swing atrium
  { f: 1770, cInf: 0 },  // wide collapse sharp
  { f: 1825, cInf: 10 }, // engineer foreground watching collapse
];

export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 246, b: 360, kit: "plant_bushDetailed", pos: [-1.8, D0, -20.5], s: 1.1, yaw: 0.4 },
  { a: 954, b: 1074, kit: "plant_bushDetailed", pos: [-5.8, D0, -18.2], s: 1.15, yaw: 0.8 },
];

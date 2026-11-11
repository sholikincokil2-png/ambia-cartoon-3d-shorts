# Synthesize and mix the full 62.0s soundtrack for "The 730-Ton Skyscraper Pendulum" (SkyscraperShort).
# Uses the repo's pure numpy/scipy DSP + procedural synthesis kit in g:\ambia\audio\
# Writes:
#   g:\ambia\out\skyscraper\mix.wav (48 kHz, stereo, 24-bit, 2,976,000 samples = 62.000 s)
#   g:\ambia\out\skyscraper\stem_voice.wav
#   g:\ambia\out\skyscraper\stem_music.wav
#   g:\ambia\out\skyscraper\stem_sfx.wav
import os
import sys
import json
import time
import numpy as np
from scipy import ndimage, signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "audio"))

from dsp import (
    SR, TAU, ns, tt, rng, dbg, lp, hp, bp, peq, reson, resbank, colored, smooth_noise,
    ramp, fades, phase, modal, pan, st, place, widen, make_ir, convolve_st,
    integrated, momentary, momentary_max, short_term, lra, true_peak, norm_to,
    read_wav, write_wav,
)
import sfx_gen as SG
import instruments as INST

DUR = 62.0
FPS = 30
N = ns(DUR)  # 2,976,000 samples
TARGET_LUFS = -15.0
CEIL_DBTP = -1.2
DUCK_DB = -3.5

OUT_DIR = os.path.join(ROOT, "out", "skyscraper")


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


# ================================================================ 1. Voice & Ducking
def load_voice():
    x, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    assert sr == SR, f"Expected {SR} Hz, got {sr}"
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    # Subtle broadcast high-pass at 80 Hz + gentle presence lift at 3.2 kHz
    v = hp(v, 80, 2)
    v = peq(v, 3200, 1.8, 1.1)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


def load_words():
    with open(os.path.join(ROOT, "voice", "words.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def speech_spans(words, merge=0.3):
    sp = []
    for w in words:
        s, e = float(w["s"]), float(w["e"])
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp


def duck_db(spans, depth=DUCK_DB, pre=0.08, post=0.12, att=0.07, rel=0.45):
    ctrl = 1000
    nc = int(DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


# ================================================================ 2. Custom Skyscraper SFX Generators
def sfx_wrecking_ball_thud(r):
    """Deep 730-ton sub-bass impact thud + steel cable clank + cavernous atrium resonance"""
    dur = 1.6
    t = tt(dur)
    sub = np.exp(-t / 0.32) * np.sin(phase(48 * (1 + 0.55 * np.exp(-t / 0.03)))) * 2.5
    clank = modal(dur, [(220, 0.9, 0.18), (480, 0.7, 0.12), (920, 0.5, 0.08), (1680, 0.35, 0.05)], r)
    ratt = SG.rattle(0.45, r, 60, np.exp(-np.linspace(0, 1, ns(0.45)) * 3), heavy=True) * 0.5
    y = sub + clank
    y[: len(ratt)] += ratt
    return widen(fades(y, 0.002, 0.15), r, 14, 0.7)


def sfx_gold_cash_chime(r):
    """Bright billionaire gold bar shimmer + cash register bell"""
    dur = 1.8
    y = np.zeros(ns(dur))
    bell = INST.glock(1567.98, 0.9, r, 1.4) + 0.6 * INST.glock(2093.0, 0.85, r, 1.4)
    y[: len(bell)] += bell
    for i, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0, 2637.0, 3136.0]):
        g = INST.glock(f, 0.65, r, 1.1)
        k = ns(0.06 * i)
        m = min(len(g), len(y) - k)
        if m > 0:
            y[k: k + m] += g[:m]
    coins = SG.rattle(0.6, r, 55, np.exp(-np.linspace(0, 1, ns(0.6)) * 2.5), heavy=False) * 0.4
    y[: len(coins)] += coins
    return widen(fades(y, 0.001, 0.1), r, 11, 0.8)


def sfx_steam_whistle_burst(r):
    """Comedic tea-kettle whistle pitch-gliding up + twin high-pressure ear steam bursts"""
    dur = 1.7
    n = ns(dur)
    t = np.arange(n) / SR
    f0 = 1350 * (1 + 0.48 * np.clip(t / 0.55, 0, 1) ** 1.5)
    vib = 1 + 0.015 * np.sin(TAU * 16 * t)
    ph = phase(f0 * vib)
    whistle = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph))
    w_env = np.clip(t / 0.03, 0, 1) * np.exp(-np.maximum(t - 0.15, 0) / 0.65)
    steam = bp(r.standard_normal(n), 1400, 9500, 2) * np.clip(t / 0.015, 0, 1) * np.exp(-t / 0.55) * 1.4
    pop = lp(r.standard_normal(n), 450, 2) * np.exp(-t / 0.04) * 1.2
    y = whistle * w_env * 0.85 + steam + pop
    return widen(fades(y, 0.002, 0.1), r, 12, 0.85)


def sfx_anvil_clink(r):
    """Heavy steel beam bolting clink ('rigid as stone')"""
    dur = 0.9
    t = tt(dur)
    ring = modal(dur, [(680, 1.0, 0.18), (1420, 0.85, 0.14), (2680, 0.6, 0.09), (4120, 0.4, 0.05)], r)
    hit = bp(r.standard_normal(len(t)), 600, 7000, 1) * np.exp(-t / 0.004) * 1.3
    thud = np.exp(-t / 0.06) * np.sin(phase(92 * (1 + 0.3 * np.exp(-t / 0.01)))) * 1.4
    return pan(fades(ring + hit + thud, 0.001, 0.08), 0.25)


def sfx_newspaper_snap(r):
    """Crisp paper whip/unfold snap"""
    dur = 0.35
    n = ns(dur)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    whip = bp(nz, 800, 6500, 2) * np.exp(-((t - 0.04) / 0.025) ** 2) * 1.3
    crisp = hp(nz, 3200, 2) * np.exp(-t / 0.012) * 0.9
    return pan(fades(whip + crisp, 0.001, 0.03), -0.3)


def sfx_thunder_clap(r):
    """Sharp lightning crack + rolling low storm thunder rumble"""
    dur = 3.2
    n = ns(dur)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    crack = bp(nz, 400, 8500, 2) * np.exp(-t / 0.025) * 2.0
    env = (1 - np.exp(-t / 0.04)) * (0.7 * np.exp(-t / 0.65) + 0.5 * np.exp(-t / 1.45))
    env *= 0.7 + 0.3 * smooth_noise(n, r, 6.0)
    rumble = lp(colored(n, r, 1.5), 240, 2) * env * 2.2
    mid = bp(colored(n, r, 0.8), 180, 1200, 1) * np.exp(-t / 0.45) * 1.1
    return widen(fades(crack + rumble + mid, 0.002, 0.3), r, 18, 0.9)


def sfx_hydraulic_hiss(r, dur=1.1):
    """High-pressure hydraulic damper cylinder stroke hiss + deep servo thrum"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.4
    hiss = bp(r.standard_normal(n), 1200, 7500, 2) * env * 0.8
    thrum = np.sin(phase(110 + 25 * env)) * env * 0.6
    return widen(fades(hiss + thrum, 0.01, 0.05), r, 10, 0.6)


def sfx_tower_snap_collapse(r):
    """Catastrophic steel waist fracture ('snaps at the waist like dry chalk') + concrete shear boom"""
    dur = 1.82
    n = ns(dur)
    t = np.arange(n) / SR
    # 1. Sharp dry-chalk / high-tension steel fracture at t=0.0
    snap = SG.bolt_snap(r)
    y = np.zeros(n)
    y[: min(n, len(snap))] += snap[: min(n, len(snap))] * 1.4
    # 2. Structural tearing groan 0.0 -> 0.6s
    tear = SG.timber_tear(r, 0.75)
    y[: min(n, len(tear))] += tear[: min(n, len(tear))] * 1.2
    # 3. Massive collapse boom at t = 0.62s ("like dry chalk")
    boom_t = 0.62
    k = ns(boom_t)
    if k < n:
        rem = n - k
        tb = np.arange(rem) / SR
        sub = np.exp(-tb / 0.38) * np.sin(phase(42 * (1 + 0.6 * np.exp(-tb / 0.03)))) * 3.2
        crunch = bp(r.standard_normal(rem), 180, 5200, 1) * np.exp(-tb / 0.22) * 1.8
        debris = SG.rattle(min(1.1, rem / SR), r, 95, np.exp(-np.linspace(0, 1, ns(min(1.1, rem / SR))) * 2.2), heavy=True) * 0.9
        y[k:] += sub + crunch
        y[k: k + len(debris)] += debris[: min( len(debris), rem)]
    # Hard cut at 1.80s for loopable TikTok/Shorts ending
    cut_k = ns(1.78)
    if cut_k < n:
        y[cut_k:] *= np.linspace(1, 0, n - cut_k)
    return widen(y, r, 16, 0.9)


def build_sfx(v_ref):
    r = rng(2026)
    out = np.zeros((2, N))
    hall_ir = make_ir(1.1, 77, length=1.3, pre=0.015, hf=1.2)
    send = np.zeros((2, N))

    def add_event(x, t_sec, rel_lu, use_rev=0.22):
        x_st = st(x)
        x_norm = norm_to(x_st, v_ref + rel_lu, mode="momentary")
        place(out, x_norm, t_sec, 1.0)
        if use_rev > 0:
            place(send, x_norm, t_sec, use_rev)

    def add_bed(x, t_sec, rel_lu):
        x_st = st(x)
        x_norm = norm_to(x_st, v_ref + rel_lu, mode="integrated")
        place(out, x_norm, t_sec, 1.0)

    # ---- Ambient Beds ----
    # 1. Sunny coastal breeze + ocean surf (0.0 - 35.8s)
    breeze_day = SG.breeze(36.0, r, level=1.0, gust=0.22, bright=850)
    add_bed(fades(breeze_day, 0.2, 0.8), 0.0, -23.0)

    # 2. Typhoon howling storm wind bed (35.8 - 61.85s)
    storm_dur = 26.05
    storm_wind = SG.breeze(storm_dur, r, level=1.5, gust=0.45, bright=1650)
    add_bed(fades(storm_wind, 0.5, 0.08), 35.8, -17.5)

    # ---- Timed Story Events ----
    # Shot 1: Hook (0.0 - 4.1s) - Wrench clinks + 730-ton wrecking ball bass drop
    add_event(pan(SG.clink(r, 2400, 0.18), -0.25), 0.15, -10.0)
    add_event(pan(SG.rattle(0.5, r, 45, heavy=True), -0.15), 0.55, -11.5)
    add_event(sfx_wrecking_ball_thud(r), 1.50, -5.5, use_rev=0.35)

    # Shot 2: Coastal race aerial (4.1 - 8.2s) - Gull/bird chirps & construction hammering
    add_event(widen(SG.bird_chirps(3.5, r, 0.8, "sparrow"), r), 4.3, -15.0)
    add_event(pan(SG.hammer_hit(r, 0.8), 0.35), 5.6, -12.0)
    add_event(pan(SG.hammer_hit(r, 0.85), -0.35), 6.2, -12.0)

    # Shot 3: Grand Prize gold pile (8.2 - 12.0s) - Cash register / gold sparkle chime
    add_event(sfx_gold_cash_chime(r), 9.45, -7.5, use_rev=0.25)

    # Shot 4: High girder lunch (12.0 - 14.5s) - Friendly worker laugh / canteen clink
    add_event(pan(SG.clink(r, 3100, 0.14), -0.2), 12.6, -13.0)
    add_event(pan(SG.whoa(r, 135, 0.35), 0.25), 13.4, -12.5)

    # Shot 5: Boss enters atrium & gasps at the giant sphere (14.5 - 17.6s)
    add_event(pan(SG.stroll_step(r), 0.3), 14.7, -13.5)
    add_event(pan(SG.stroll_step(r), 0.25), 15.2, -13.5)
    add_event(pan(SG.oof(r, "oh", 125), 0.3), 16.1, -10.0)

    # Shot 6: Boss turns purple ("he goes purple: You're wrecking my penthouse!") at 17.95s
    add_event(sfx_steam_whistle_burst(r), 17.90, -5.5, use_rev=0.25)

    # Shot 7: Young Engineer refuses to unhook a single cable (20.0 - 22.3s)
    add_event(pan(SG.bolt_strain(r, 0.8, 0.28), -0.3), 20.55, -9.5)
    add_event(pan(SG.clink(r, 2900, 0.15), -0.3), 20.85, -10.5)

    # Shot 8: Rival company bolts steel rigid as stone (22.3 - 27.2s)
    add_event(sfx_anvil_clink(r), 24.25, -7.5)
    add_event(sfx_anvil_clink(r), 24.95, -6.5)
    add_event(sfx_anvil_clink(r), 25.65, -8.0)

    # Shot 9: Rigid tower dead still vs Our tower creepy whoosh behind the wall (27.2 - 31.8s)
    w1 = pan(SG.whoosh(0.85, r, peak=0.35, f_lo=180, f_hi=950, width=0.9, tail=0.35, air=0.08), -0.35)
    w2 = pan(SG.whoosh(0.85, r, peak=0.35, f_lo=180, f_hi=950, width=0.9, tail=0.35, air=0.08), 0.35)
    add_event(w1, 29.35, -8.0, use_rev=0.3)
    add_event(w2, 30.25, -7.5, use_rev=0.3)

    # Shot 10: Newspaper "Seasick Tower" & crowd booking the rigid hotel (31.8 - 35.8s)
    add_event(sfx_newspaper_snap(r), 32.05, -7.5)
    murmur = widen(SG.babble(3.4, r, 130, 1.0) + 0.7 * SG.babble(3.4, r, 195, 1.15), r, 15, 0.8)
    add_bed(fades(murmur, 0.2, 0.3), 32.2, -20.0)
    for st_i in range(6):
        add_event(pan(SG.stroll_step(r), -0.2 + 0.12 * st_i), 33.0 + st_i * 0.42, -13.5, use_rev=0.1)

    # Shot 11: Typhoon season hits! (35.8 - 38.9s) - Thunder clap + gale gusts
    add_event(sfx_thunder_clap(r), 36.75, -5.0, use_rev=0.35)

    # Shot 12: Yardsticks - September dinner plate (39.18s) & October bathtub (42.40s)
    add_event(pan(SG.swing_squeak(r, 0.7, True), -0.25), 39.4, -9.5)
    add_event(sfx_hydraulic_hiss(r, 0.9), 40.3, -9.0)
    add_event(pan(SG.swing_squeak(r, 1.2, False), 0.3), 42.6, -8.0)
    add_event(sfx_hydraulic_hiss(r, 1.3), 43.2, -7.5)

    # Shot 13: Boss furious ("See, your own weight is tearing us apart!") (44.5 - 48.2s)
    add_event(pan(SG.hammer_hit(r, 0.9), 0.25), 45.75, -7.0)
    add_event(sfx_steam_whistle_burst(r), 46.2, -8.5)

    # Shot 14: Rigid tower groaning + bolts popping out (48.2 - 53.7s)
    groan = SG.chain_groan(5.0, r, i0=0.45, i1=1.15, rate0=20, rate1=44)
    add_bed(widen(groan, r, 14, 0.8), 48.4, -14.5)
    for bp_t, p_pos in [(51.15, -0.4), (51.60, 0.35), (52.10, -0.25), (52.65, 0.4)]:
        add_event(pan(SG.bolt_snap(r), p_pos), bp_t, -6.5, use_rev=0.25)

    # Shot 15: Super-storm counter-swing & dead-level floor (53.7 - 59.0s)
    big_gust = widen(SG.whoosh(1.6, r, peak=0.5, f_lo=220, f_hi=1800, width=1.0, tail=0.6, air=0.25), r, 16, 0.9)
    add_event(big_gust, 54.4, -7.0)
    add_event(sfx_hydraulic_hiss(r, 1.5), 56.2, -6.5)
    # Bright level-lock confirmation chime at "keeping the floor dead level" (58.67s)
    lock_chime = widen(INST.glock(1046.5, 0.85, r, 1.2) + 0.7 * INST.glock(1567.98, 0.85, r, 1.2), r, 10, 0.7)
    add_event(lock_chime, 58.45, -7.5, use_rev=0.25)

    # Shot 16: Climax - Rival rigid tower snaps at the waist like dry chalk (60.03s)
    add_event(sfx_tower_snap_collapse(r), 60.00, -3.5, use_rev=0.35)

    wet = convolve_st(send, hall_ir)
    out += wet
    # Hard silence tail after 61.85s
    cut_idx = ns(61.85)
    out[:, cut_idx:] *= np.linspace(1, 0, N - cut_idx)[None, :]
    return out


# ================================================================ 3. Procedural Background Music Score
def build_music():
    """Original 2-act procedural score:
       Act 1 (0.0 - 35.8s): Jaunty, curious C-minor / Eb-major engineering march (124 BPM, beat = 0.4838s)
       Act 2 (35.8 - 60.0s): Urgent typhoon tension climb (timpani pulse, snare rolls, brass stabs)
       Climax Stop (60.03s): Hard orchestral cut on the snap so the fracture & collapse boom hit in stark clarity.
    """
    r = rng(101)
    out = np.zeros((2, N))
    send = np.zeros((2, N))
    hall_ir = make_ir(1.0, 33, length=1.2, pre=0.012, hf=1.3)

    def put(x, t_sec, p=0.0, gain=1.0, rev=0.2):
        seg = pan(x, p) if np.asarray(x).ndim == 1 else x
        place(out, seg, t_sec, gain)
        if rev > 0:
            place(send, seg, t_sec, gain * rev)

    # ---- Act 1: Engineering Race March (0.0 - 35.6s, 124 BPM) ----
    beat = 60.0 / 124.0  # 0.48387 s
    # Root progression every 4 beats (bar = 1.935s): Cm - Gm - Ab - G7
    prog = [
        (48, [60, 63, 67]),  # Cm
        (43, [55, 58, 62]),  # Gm
        (44, [56, 60, 63]),  # Ab
        (43, [55, 59, 62]),  # G
    ]
    melody_notes = [72, 75, 79, 77, 75, 74, 72, 71]
    t_bar = 0.2
    bar_idx = 0
    while t_bar < 35.2:
        bass_m, chord_ms = prog[bar_idx % len(prog)]
        for b in range(4):
            tb = t_bar + b * beat
            if tb >= 35.4:
                break
            # Tuba on beats 0 and 2
            if b in (0, 2):
                root_m = bass_m if b == 0 else bass_m + 7
                tb_note = INST.brass(INST.m2f(root_m), beat * 0.65, vel=0.72, r=r, kind="tuba")
                put(tb_note, tb, p=-0.15, gain=0.45, rev=0.12)
                # Pizzicato pluck doubling bass
                pl = INST.pluck(INST.m2f(root_m + 12), vel=0.65, r=r, dur=0.35)
                put(pl, tb, p=0.15, gain=0.35, rev=0.1)
            else:
                # After-beat horns on beats 1 and 3
                for cm in chord_ms:
                    hn = INST.brass(INST.m2f(cm), beat * 0.42, vel=0.58, r=r, kind="horn")
                    put(hn, tb, p=0.25, gain=0.22, rev=0.18)
                # Crisp brush snare tap
                sn = INST.snare(vel=0.48, r=r, dur=0.22, snappy=0.8)
                put(sn, tb, p=-0.2, gain=0.28, rev=0.1)

            # Glockenspiel / musicbox motif every 2nd bar
            if bar_idx % 2 == 0 and b in (0, 1, 2, 3):
                mn = melody_notes[(bar_idx * 2 + b) % len(melody_notes)]
                mb = INST.musicbox(INST.m2f(mn), vel=0.55, r=r, dur=0.6)
                put(mb, tb, p=0.35 if b % 2 else -0.35, gain=0.25, rev=0.25)

        t_bar += 4 * beat
        bar_idx += 1

    # ---- Act 2: Typhoon Tension & Super-Storm Climb (36.0 - 59.95s, 136 BPM) ----
    beat2 = 60.0 / 136.0  # 0.44117 s
    # Sustained warm dark pad chords underneath
    pad1 = INST.pad([INST.m2f(48), INST.m2f(55), INST.m2f(63)], dur=12.0, vel=0.55, r=r, warm=800)
    put(pad1, 36.0, gain=0.38, rev=0.3)
    pad2 = INST.pad([INST.m2f(50), INST.m2f(56), INST.m2f(62), INST.m2f(67)], dur=11.5, vel=0.68, r=r, warm=1100)
    put(pad2, 48.2, gain=0.45, rev=0.3)

    t_cur = 36.2
    step_i = 0
    while t_cur < 59.6:
        prog_u = (t_cur - 36.0) / 24.0  # 0 -> 1 tension ramp
        # Driving timpani pulse on every beat
        timp_m = 48 if step_i % 4 != 3 else 43
        tp = INST.timpani(INST.m2f(timp_m), vel=0.6 + 0.3 * prog_u, r=r, dur=0.8)
        put(tp, t_cur, p=-0.1, gain=0.38 + 0.2 * prog_u, rev=0.2)

        # Snare martial pulse on off-beats + buzz rolls after 48s
        if step_i % 2 == 1:
            sn = INST.snare(vel=0.55 + 0.3 * prog_u, r=r, dur=0.25)
            put(sn, t_cur, p=0.2, gain=0.32 + 0.15 * prog_u, rev=0.15)

        # Rising brass stabs every 4 beats
        if step_i % 4 == 0:
            stab_m = 60 + min(7, step_i // 8)
            st_b = INST.brass(INST.m2f(stab_m), beat2 * 0.7, vel=0.7 + 0.25 * prog_u, r=r, kind="stab")
            put(st_b, t_cur, p=-0.3, gain=0.30 + 0.15 * prog_u, rev=0.25)

        # Heroic glockenspiel counter-melody during Shot 15 (53.8 - 59.5s)
        if t_cur >= 53.8:
            g_note = [72, 75, 79, 84][step_i % 4]
            gl = INST.glock(INST.m2f(g_note), vel=0.75, r=r, dur=0.8)
            put(gl, t_cur, p=0.3, gain=0.28, rev=0.25)

        t_cur += beat2
        step_i += 1

    # Climactic snare crescendo roll 58.0 -> 59.95s right before the snap at 60.03s
    for tr, vr in INST.snare_roll(58.0, 59.95, 0.45, 0.95, r, rate=26.0):
        put(INST.snare(vel=vr, r=r, dur=0.2, buzz=True), tr, p=0.0, gain=0.35, rev=0.15)

    wet = convolve_st(send, hall_ir)
    out += wet
    # Hard stop at 60.00s so the "snaps at the waist like dry chalk" SFX hits in pure dramatic silence
    stop_k = ns(59.98)
    fade_len = ns(0.06)
    out[:, stop_k: stop_k + fade_len] *= np.linspace(1, 0, fade_len)[None, :]
    out[:, stop_k + fade_len:] = 0.0
    return out


# ================================================================ 4. Limiter & Master Mix
def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3


def main():
    t0 = time.time()
    os.makedirs(OUT_DIR, exist_ok=True)
    words = load_words()
    spans = speech_spans(words)
    v = load_voice()
    v_ref = integrated(v)
    log(f"Loaded voice: {v_ref:.2f} LUFS, TP {true_peak(v):.2f} dBTP")

    log("Synthesizing procedural music score...")
    m_raw = build_music()
    # Normalize music to -11.5 LU relative to voice, then apply speech ducking (-3.5 dB)
    m_norm = norm_to(m_raw[:, :ns(59.8)], v_ref - 10.5, mode="integrated")
    m_full = np.zeros((2, N))
    m_full[:, :m_norm.shape[1]] = m_norm
    dk = duck_db(spans, depth=DUCK_DB)
    m = m_full * dbg(dk)[None, :]
    log(f"Music stem ready: {integrated(m[:, :ns(59.8)]):.2f} LUFS (ducked)")

    log("Synthesizing procedural SFX stem...")
    s = build_sfx(v_ref)
    log(f"SFX stem ready: {integrated(s):.2f} LUFS")

    # Master sum & iterative loudness normalization to -15.0 LUFS integrated, <= -1.2 dBTP
    mix0 = v + m + s
    G = TARGET_LUFS - integrated(mix0)
    for it in range(5):
        y, g3 = limiter(mix0 * dbg(G))
        L = integrated(y)
        log(f"Master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20 * np.log10(g3.min()):.2f} dB")
        if abs(L - TARGET_LUFS) < 0.03:
            break
        G += TARGET_LUFS - L

    y = fades(y, 0.002, 0.03)
    gv, gm, gs = v * dbg(G), m * dbg(G), s * dbg(G)

    mix_path = os.path.join(OUT_DIR, "mix.wav")
    write_wav(mix_path, y)
    write_wav(os.path.join(OUT_DIR, "stem_voice.wav"), gv)
    write_wav(os.path.join(OUT_DIR, "stem_music.wav"), gm)
    write_wav(os.path.join(OUT_DIR, "stem_sfx.wav"), gs)
    log(f"Wrote {mix_path} ({y.shape[1] / SR:.3f}s) in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()


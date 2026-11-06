// Key-moment engine: a pseudo-3D broadcast-style cricket view rendered on canvas.
// World units are metres. z = distance from the striker's stumps (0) to the bowler's stumps (20.12).
// x > 0 is the off side of a right-handed batter. y is height.

const PITCH_LEN = 20.12;
const LEN_IDX = { yorker: 0, full: 1, good: 2, short: 3, bouncer: 4 };
const LEN_Z = { yorker: [0.35, 1.2], full: [1.6, 3.6], good: [4.2, 7.2], short: [7.6, 9.6], bouncer: [9.8, 12.2] };
const LEN_H = { yorker: 0.12, full: 0.45, good: 0.85, short: 1.3, bouncer: 1.85 };

const SHOT_DEFS = [
  { id: 'defend', label: 'Defend', icon: '🛡️' },
  { id: 'drive', label: 'Drive', icon: '⬆️' },
  { id: 'pull', label: 'Pull / Cut', spinLabel: 'Sweep', icon: '↪️' },
  { id: 'loft', label: 'Loft', icon: '🚀' },
  { id: 'leave', label: 'Leave', icon: '✋' },
];
const DELIVERY_DEFS = [
  { id: 'yorker', label: 'Yorker', icon: '🎯', z: 0.75, x: 0.02 },
  { id: 'good', label: 'Good Length', icon: '📏', z: 5.8, x: 0.18 },
  { id: 'bouncer', label: 'Bouncer', icon: '💀', z: 10.8, x: 0.05 },
  { id: 'full', label: 'Full & Swing', icon: '🌪️', z: 2.8, x: 0.28 },
  { id: 'slower', label: 'Slower Ball', icon: '🐢', z: 5.0, x: 0.12 },
  { id: 'wideyorker', label: 'Wide Yorker', icon: '↗️', z: 0.8, x: 0.62 },
];

// Shot vs length matchup. Columns: yorker, full, good, short, bouncer
const MATCHUP = {
  defend: [0.65, 0.55, 0.72, 0.35, 0.25],
  drive: [-0.4, 0.92, 0.12, -0.5, -0.85],
  pull: [-0.9, -0.55, -0.05, 0.92, 0.55],
  loft: [-0.45, 0.88, -0.3, -0.25, 0.3],
};

function lenFromZ(z) {
  if (z < 0.3) return 'fulltoss';
  if (z < 1.4) return 'yorker';
  if (z < 4.0) return 'full';
  if (z < 7.5) return 'good';
  if (z < 9.8) return 'short';
  if (z < 12.8) return 'bouncer';
  return 'longhop';
}

// ---------- Pure resolution logic (no rendering) ----------
function genDelivery(bowlerType, level, bowlerSkill) {
  const spin = bowlerType === 'spin';
  // Better bowlers land more good-length & yorkers, fewer loose balls
  const q = bowlerSkill / 100;
  const weights = spin
    ? { full: 3 - q, good: 4 + q * 2, short: 1.5 - q, yorker: .3 }
    : { yorker: .6 + q * 1.4, full: 2.4 - q, good: 3 + q * 2, short: 1.6, bouncer: .8 + q };
  let tot = 0; for (const k in weights) tot += Math.max(.1, weights[k]);
  let r = Math.random() * tot, len = 'good';
  for (const k in weights) { r -= Math.max(.1, weights[k]); if (r <= 0) { len = k; break; } }
  const [z0, z1] = LEN_Z[len];
  const zb = rand(z0, z1);
  const lines = [[-0.3, 1], [0, 3 + q * 2], [0.25, 4 + q * 2], [0.55, 2 - q], [0.9, .5 - q * .4]];
  let lt = 0; lines.forEach(l => lt += Math.max(.05, l[1]));
  let lr = Math.random() * lt, lx = 0.2;
  for (const l of lines) { lr -= Math.max(.05, l[1]); if (lr <= 0) { lx = l[0]; break; } }
  const dev = spin ? rand(-.35, .05) * (1 + q) : rand(-.12, .12);
  const swing = spin ? 0 : rand(-.25, .25) * (len === 'full' || len === 'yorker' ? 1.6 : .7);
  const xBat = lx + dev;
  const kph = spin ? rand(78, 92) : lerp(118, 146, clamp(level / 5 * .7 + q * .3, 0, 1)) + rand(-4, 4);
  // Game-time flight duration. Slower than real life so humans can play it.
  const T = spin ? lerp(1.75, 1.45, level / 5) : clamp(lerp(1.6, 1.08, level / 5) - (kph - 130) / 200, .95, 1.7);
  return { type: spin ? 'spin' : 'pace', len, zb, xb: lx, xBat, dev, swing, kph: Math.round(kph), T, y0: spin ? 2.0 : 2.25, x0: spin ? .25 : .45, hB: LEN_H[len] * rand(.9, 1.1) };
}

function resolveBat(del, shot, tq, ctx) {
  const li = LEN_IDX[del.len] ?? 2;
  const x = del.xBat;
  const onStumps = Math.abs(x) < 0.17 && li <= 2;
  const wide = x > 0.82 || x < -0.62;
  const r = Math.random();
  const res = (o) => Object.assign({ runs: 0, out: false, how: '', visual: 'dot', shot, q: 0, extra: null }, o);

  if (!shot || shot === 'leave') {
    if (wide) return res({ runs: 1, extra: 'wide', visual: 'leave', how: 'Wide' });
    if (onStumps) {
      if (r < .78) return res({ out: true, how: li === 0 || r < .4 ? 'Bowled' : 'LBW', visual: li === 0 || r < .4 ? 'bowled' : 'lbw' });
      return res({ visual: 'pad', how: 'Hit on the pad — going down leg' });
    }
    if (li === 4) return res({ visual: 'duck', how: 'Ducked under it' });
    return res({ visual: 'leave', how: Math.abs(x) < .3 ? 'Left it — close to off stump!' : 'Well left' });
  }

  let m = MATCHUP[shot][li];
  if (x > 0.35) { if (shot === 'pull') m += .25; if (shot === 'drive') m += .12; if (shot === 'defend') m -= .12; }
  if (x < -0.12) { if (shot === 'pull') m += .2; if (shot === 'drive') m -= .1; }
  if (del.type === 'spin') { if (shot === 'pull') m += .12; if (shot === 'loft' && li <= 2) m += .1; m -= Math.abs(del.dev) * .25; }
  if (wide && shot !== 'defend') return res({ runs: 1, extra: 'wide', visual: 'miss', how: 'Wide — swung at thin air' });

  const sd = (ctx.batSkill - ctx.bowlSkill) / 100;
  const q = 0.42 * m + 0.45 * tq + 0.28 * sd + (ctx.ready || 0) + rand(-.16, .16);
  const edgeOut = x > 0.05 ? 'Caught behind' : (onStumps ? 'Bowled' : 'Caught at slip');

  if (shot === 'defend') {
    if (q < -0.42 && r < .7) return res({ out: true, q, how: onStumps ? 'Bowled through the gate' : 'Edged to slip', visual: onStumps ? 'bowled' : 'edge' });
    if (q > .45) return res({ runs: 1, q, visual: 'ground', how: 'Dropped and run' });
    return res({ q, visual: 'defend', how: q > 0 ? 'Solid defence' : 'Survived. Just.' });
  }
  if (shot === 'loft') {
    if (q < -0.12) return res({ out: true, q, how: tq < -.5 ? (onStumps ? 'Bowled, swinging across the line' : 'Stumped!') : pick(['Caught at long-on', 'Caught at deep mid-wicket', 'Skied to cover']), visual: tq < -.5 && onStumps ? 'bowled' : 'caught' });
    if (q < .16) return res({ runs: r < .5 ? 1 : 2, q, visual: 'ground', how: 'Mistimed, but safe' });
    if (q < .38) return res({ runs: 4, q, visual: 'four', how: 'One bounce over the rope' });
    return res({ runs: 6, q, visual: 'six', how: pick(['Into the second tier!', 'Out of the ground!', 'Massive. Sailing into the night.']) });
  }
  // drive / pull
  if (q < -0.3) {
    if (shot === 'pull' && li <= 1) return res({ out: true, q, how: r < .5 ? 'LBW, across the line' : 'Bowled, beaten for pace', visual: r < .5 ? 'lbw' : 'bowled' });
    if (shot === 'pull') return res({ out: true, q, how: 'Top edge — caught at fine leg', visual: 'caught' });
    return res({ out: true, q, how: edgeOut, visual: edgeOut === 'Bowled' ? 'bowled' : 'edge' });
  }
  if (q < 0) return res({ runs: r < .35 ? 1 : 0, q, visual: r < .35 ? 'ground' : 'miss', how: r < .35 ? 'Inside edge, scrambled a run' : 'Beaten!' });
  if (q < .22) return res({ runs: r < .6 ? 1 : 2, q, visual: 'ground', how: 'Worked into the gap' });
  if (q < .45) return res({ runs: r < .55 ? 2 : 4, q, visual: r < .55 ? 'ground' : 'four', how: r < .55 ? 'Placed for two' : 'Raced away!' });
  if (shot === 'pull' && q > .62 && li >= 3) return res({ runs: 6, q, visual: 'six', how: 'Pulled into the stands!' });
  return res({ runs: 4, q, visual: 'four', how: shot === 'drive' ? pick(['Cover drive. Textbook.', 'Straight down the ground!', 'Pierced the gap!']) : pick(['Cut hard behind point!', 'Pulled in front of square!']) });
}

function resolveBowl(plan, landZ, landX, ctx) {
  // plan: delivery id; landZ/landX: where it actually pitched
  const len = lenFromZ(landZ);
  const r = Math.random();
  const res = o => Object.assign({ runs: 0, wicket: false, how: '', visual: 'dot', extra: null, len }, o);
  if (landX > 1.0 || landX < -0.75 || (len === 'longhop' && landX > .6)) return res({ runs: 1, extra: 'wide', visual: 'wide', how: 'Wide! Extra ball.' });
  if (len === 'longhop' && r < .35) return res({ runs: 1, extra: 'noball', visual: 'wide', how: 'No-ball! Above head height. Free hit.' });

  let q = { fulltoss: -.6, yorker: .62, full: -.2, good: .32, short: .02, bouncer: .3, longhop: -.65 }[len];
  if (plan === 'full' && len === 'full') q += .35 * (ctx.variation / 100) + .1; // swinging full ball
  if (plan === 'slower') q += .12 + .38 * (ctx.variation / 100) * (ctx.aggressive ? 1.2 : .8);
  if (Math.abs(landX) < .16) q += .14; else if (landX > .16 && landX < .5) q += .1; else if (landX < -.2) q -= .32;
  if (plan === 'wideyorker' && len === 'yorker' && landX > .45 && landX < .9) q += .1;
  if (ctx.weak && ctx.weak === (len === 'bouncer' || len === 'short' ? 'short' : len === 'yorker' ? 'yorker' : plan === 'slower' ? 'slower' : '')) q += .25;
  if (ctx.strong && ctx.strong === (len === 'bouncer' || len === 'short' ? 'short' : len === 'full' ? 'full' : '')) q -= .25;
  if (ctx.repeat) q -= .16;
  q += (ctx.pace - 50) / 260 + (ctx.bowlSkill - ctx.batSkill) / 140 + (ctx.ready || 0) + rand(-.24, .24);

  const ag = ctx.aggressive;
  const wk = ag ? .5 : .58;
  if (q > wk) {
    const how = len === 'yorker' ? pick(['Bowled! Yorker, through the toes!', 'LBW! Plumb!']) :
      len === 'bouncer' || len === 'short' ? pick(['Top edge... CAUGHT!', 'Fended off — caught at gully!']) :
        plan === 'slower' ? pick(['Through too early — caught at mid-off!', 'Deceived! Caught in the deep!']) : pick(['Edged... TAKEN behind!', 'Bowled! Through the gate!', 'Nicked to first slip!']);
    return res({ wicket: true, how, visual: /Bowled/.test(how) ? 'bowled' : /LBW/.test(how) ? 'lbw' : 'caught' });
  }
  if (q > .2) return res({ runs: ag && r < .4 ? 1 : 0, visual: ag && r < .4 ? 'ground' : 'beaten', how: pick(['Beaten! Past the edge!', 'Dot ball. Pressure.', 'Defended. Nothing doing.']) });
  if (q > -.05) return res({ runs: r < .7 ? 1 : 2, visual: 'ground', how: 'Pushed into the gap.' });
  const boundaryP = ag ? .75 : .5;
  if (q > -.3) return res({ runs: r < boundaryP ? 4 : 2, visual: r < boundaryP ? 'four' : 'ground', how: r < boundaryP ? 'Four! Found the rope.' : 'Two runs.' });
  return res({ runs: r < (ag ? .6 : .35) ? 6 : 4, visual: r < (ag ? .6 : .35) ? 'six' : 'four', how: pick(['Smashed! That\'s gone all the way.', 'Punished. Into the crowd.']) });
}

// ---------- Renderer ----------
const Moments = (() => {
  let root, cv, g, W, H, dpr, raf = 0, controls, callEl, timingEl;
  let opt = {};
  let view = 'bat';
  let cam = {};
  let crowd = [], trees = [], kites = [], stars = [];
  let st = null; // per-ball animation state
  let tLast = 0, gt = 0, clock = 0;
  let bowler = { z: 32, phase: 'idle', t: 0 };
  let batter = { swing: null, t: 0 };
  let stumpsHit = null, umpireUp = 0, reticle = null, target = null;
  let fielders = [];

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    setupCam();
  }
  function setupCam() {
    if (view === 'bat') cam = { z: -7.5, h: 2.9, hy: H * .25, F: Math.min(W * 1.75, H * .85) };
    else cam = { z: PITCH_LEN + 6, h: 5, hy: H * .17, F: Math.min(W * 2.7, H * 1.3) };
  }
  function P(x, y, z) {
    let d = view === 'bat' ? z - cam.z : cam.z - z;
    if (d < .25) d = .25;
    const s = cam.F / d;
    const X = view === 'bat' ? x : -x;
    return [W / 2 + X * s, cam.hy + (cam.h - y) * s, s];
  }

  function seedScenery() {
    crowd = Array.from({ length: 420 }, () => ({ u: Math.random(), v: Math.random(), c: pick(['#e63946', '#ffd166', '#4c6ef5', '#2ec4b6', '#f4ede4', '#ff9f1c', '#8b5cf6']), p: Math.random() * 7 }));
    trees = Array.from({ length: 16 }, (_, i) => ({ u: i / 15 + rand(-.03, .03), h: rand(.6, 1.2), w: rand(.04, .08) }));
    kites = Array.from({ length: 4 }, () => ({ u: rand(.1, .9), v: rand(.15, .6), p: Math.random() * 6, c: pick(['#e63946', '#ffd166', '#2ec4b6', '#8b5cf6']) }));
    stars = Array.from({ length: 60 }, () => ({ u: Math.random(), v: Math.random() * .8, a: Math.random() }));
    fielders = [[-14, 26], [16, 22], [-24, 8], [22, 4], [-9, 40], [9, 46], [-30, -4], [28, -8]].map(([x, z]) => ({ x, z }));
  }

  // ---------- scenery ----------
  function drawSky() {
    const lv = opt.level;
    const bdName = lv <= 1 ? 'bd_maidan' : lv <= 3 ? 'bd_stadium_day' : 'bd_stadium_night';
    if (typeof Art !== 'undefined' && Art.has(bdName)) {
      // cover-fit the backdrop so its bottom edge sits on the horizon
      const im = Art.imgs[bdName], hy = cam.hy + 4;
      const sc = Math.max(W / im.width, hy / im.height);
      const dw = im.width * sc, dh = im.height * sc;
      g.drawImage(im, (W - dw) / 2, hy - dh, dw, dh);
      return;
    }
    const hy = cam.hy;
    let grd = g.createLinearGradient(0, 0, 0, hy + 10);
    if (lv <= 1) { grd.addColorStop(0, '#6aa4dc'); grd.addColorStop(.7, '#e8c79a'); grd.addColorStop(1, '#f5b971'); }
    else if (lv <= 3) { grd.addColorStop(0, '#1b2550'); grd.addColorStop(.6, '#7a3b5e'); grd.addColorStop(1, '#f08a4b'); }
    else { grd.addColorStop(0, '#03040b'); grd.addColorStop(1, '#141c3d'); }
    g.fillStyle = grd; g.fillRect(0, 0, W, hy + 2);
    if (lv >= 4) {
      for (const s of stars) { g.fillStyle = `rgba(255,255,255,${.3 + .5 * Math.abs(Math.sin(clock / 1000 + s.a * 9))})`; g.fillRect(s.u * W, s.v * hy * .5, 1.2, 1.2); }
    }
    if (lv <= 1) {
      // sun + kites over a small-town maidan
      const sg = g.createRadialGradient(W * .78, hy * .45, 0, W * .78, hy * .45, 80);
      sg.addColorStop(0, 'rgba(255,240,200,1)'); sg.addColorStop(.25, 'rgba(255,200,120,.8)'); sg.addColorStop(1, 'rgba(255,170,90,0)');
      g.fillStyle = sg; g.fillRect(W * .78 - 80, hy * .45 - 80, 160, 160);
      for (const k of kites) {
        const kx = k.u * W + Math.sin(clock / 1400 + k.p) * 12, ky = k.v * hy + Math.cos(clock / 1100 + k.p) * 6;
        g.save(); g.translate(kx, ky); g.rotate(Math.sin(clock / 900 + k.p) * .3);
        g.fillStyle = k.c; g.beginPath(); g.moveTo(0, -7); g.lineTo(6, 0); g.lineTo(0, 9); g.lineTo(-6, 0); g.closePath(); g.fill();
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = .6; g.beginPath(); g.moveTo(kx, ky + 9); g.quadraticCurveTo(kx + 20, ky + 60, kx + 40, hy); g.stroke();
      }
      // buildings + trees
      g.fillStyle = '#5b4a5e';
      for (let i = 0; i < 12; i++) { const bx = i * W / 11 - 10, bh = 18 + ((i * 37) % 26); g.fillRect(bx, hy - bh, W / 13, bh); }
      g.fillStyle = '#2f3b2a';
      for (const t of trees) { const tx = t.u * W; g.beginPath(); g.ellipse(tx, hy - 22 * t.h, W * t.w, 22 * t.h, 0, 0, 6.283); g.fill(); }
    } else {
      // stadium stands with crowd
      const top = hy - (lv >= 4 ? 90 : 70);
      g.fillStyle = lv >= 4 ? '#0b0f22' : '#2b2440';
      g.beginPath(); g.moveTo(0, hy); g.lineTo(0, top + 20); g.quadraticCurveTo(W / 2, top - 22, W, top + 20); g.lineTo(W, hy); g.fill();
      const density = lv >= 4 ? 1 : lv === 3 ? .7 : .25; // first-class stands are nearly empty
      for (const c of crowd) {
        if (c.u > density && lv < 4) continue;
        const cx = (c.p / 7) * W, cy = top + 14 + c.v * (hy - top - 18) + Math.sin(cx / W * 3.14) * -10;
        g.fillStyle = c.c; g.globalAlpha = .55 + .2 * Math.sin(clock / 300 + c.p * 3);
        g.fillRect(cx, cy, 2.2, 2.2);
        if (lv >= 4 && Math.sin(clock / 170 + c.p * 41) > .985) { g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillRect(cx - 1, cy - 1, 4, 4); }
      }
      g.globalAlpha = 1;
      if (lv >= 3) { // floodlights
        [.06, .94].forEach(u => {
          const fx = u * W, fy = top - 40;
          g.strokeStyle = '#3a3f55'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, hy); g.lineTo(fx, fy); g.stroke();
          g.fillStyle = '#fffbe6'; g.fillRect(fx - 12, fy - 8, 24, 10);
          const fg = g.createRadialGradient(fx, fy, 0, fx, fy, 160);
          fg.addColorStop(0, 'rgba(255,250,220,.55)'); fg.addColorStop(1, 'rgba(255,250,220,0)');
          g.fillStyle = fg; g.fillRect(fx - 160, fy - 160, 320, 320);
        });
      }
      // advertising boards
      g.fillStyle = lv >= 4 ? '#1d4ed8' : '#3b3355'; g.fillRect(0, hy - 7, W, 7);
      if (lv >= 4) { g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '700 6px Barlow'; for (let i = 0; i < 8; i++) g.fillText(['DREAM BIG', 'GULLY TO GLORY', 'PAPA CHAI', 'RAJGARH TYRES'][i % 4], i * W / 8 + 4 - (clock / 60 % (W / 8)), hy - 1.5); }
    }
  }

  function quad(a, b, c, d, fill) { g.fillStyle = fill; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill(); }

  function drawGround() {
    const lv = opt.level;
    g.fillStyle = lv <= 1 ? '#7d8a3c' : '#2f7a3a';
    g.fillRect(0, cam.hy, W, H - cam.hy);
    // mowing stripes (depth cue)
    const zs = view === 'bat' ? [-4, 80] : [-60, PITCH_LEN + 4];
    for (let z = zs[0], i = 0; z < zs[1]; z += 5, i++) {
      if (i % 2) continue;
      const a = P(-70, 0, z), b = P(70, 0, z), c = P(70, 0, z + 5), d = P(-70, 0, z + 5);
      quad(a, b, c, d, lv <= 1 ? 'rgba(255,240,180,.06)' : 'rgba(255,255,255,.05)');
    }
    if (lv <= 1) { // dusty patches on a public maidan
      g.fillStyle = 'rgba(170,130,80,.25)';
      for (let i = 0; i < 6; i++) { const p = P((i - 3) * 9, 0, 12 + i * 6); g.beginPath(); g.ellipse(p[0], p[1], 14 * p[2] / 6, 3 * p[2] / 6, 0, 0, 6.283); g.fill(); }
    }
    // pitch
    const pc = lv <= 1 ? '#c9a46a' : lv === 2 ? '#c6b07a' : '#cdb985';
    quad(P(-1.52, 0, -1.8), P(1.52, 0, -1.8), P(1.52, 0, PITCH_LEN + 1.8), P(-1.52, 0, PITCH_LEN + 1.8), pc);
    // worn ends
    const wg = 'rgba(120,90,50,.28)';
    quad(P(-.6, 0, .4), P(.6, 0, .4), P(.6, 0, 4.5), P(-.6, 0, 4.5), wg);
    quad(P(-.6, 0, PITCH_LEN - 4.5), P(.6, 0, PITCH_LEN - 4.5), P(.6, 0, PITCH_LEN - .4), P(-.6, 0, PITCH_LEN - .4), wg);
    // creases
    g.strokeStyle = 'rgba(255,255,255,.9)';
    [[1.22], [PITCH_LEN - 1.22]].forEach(([z]) => { line3(-1.83, z, 1.83, z, 2); });
    [[0], [PITCH_LEN]].forEach(([z]) => line3(-1.32, z, 1.32, z, 1.2));
    [-1.32, 1.32].forEach(x => { line3(x, -1.0, x, 1.22, 1.2); line3(x, PITCH_LEN - 1.22, x, PITCH_LEN + 1.0, 1.2); });
    // boundary rope
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath();
    for (let a = 0; a <= 64; a++) { const ang = a / 64 * Math.PI * 2; const p = P(Math.cos(ang) * 62, 0, PITCH_LEN / 2 + Math.sin(ang) * 64); if (a === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
    g.stroke();
  }
  function line3(x1, z1, x2, z2, w) { const a = P(x1, 0, z1), b = P(x2, 0, z2); g.lineWidth = w * Math.min(2, a[2] / 30); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }

  function drawStumps(z, hit) {
    const xs = [-.115, 0, .115];
    xs.forEach((x, i) => {
      const b = P(x, 0, z);
      let ang = 0, dx = 0;
      if (hit) { const k = clamp((clock - hit) / 350, 0, 1); ang = (i - 1) * .5 * k + (view === 'bat' ? -.2 : .2) * k * (i === 1 ? 2 : 1); dx = (i - 1) * 6 * k; }
      g.save(); g.translate(b[0] + dx, b[1]); g.rotate(ang);
      g.fillStyle = '#f1e6cf'; g.fillRect(-.02 * b[2], -.71 * b[2], .04 * b[2], .71 * b[2]);
      g.restore();
    });
    if (!hit) { const l = P(-.115, .72, z), r = P(.115, .72, z); g.strokeStyle = '#e8d3a8'; g.lineWidth = Math.max(1, .025 * l[2]); g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(r[0], r[1]); g.stroke(); }
  }

  // Stylised human figure. pose: {kind, t}
  function drawPerson(x, z, colors, pose = {}, facing = 1, alpha = 1) {
    const [px, py, s] = P(x, 0, z);
    const u = s; // pixels per metre
    if (u < 2) return;
    g.save(); g.globalAlpha = alpha; g.translate(px, py); g.lineCap = 'round'; g.lineJoin = 'round';
    const skin = '#8d5a3b', kit = colors.kit || '#f4ede4', pad = colors.pad || '#f4ede4', helm = colors.helm || '#1d3557';
    const t = pose.t || 0;
    let legA = 0, legB = 0, armA = -.2, armB = .2, lean = 0, bob = 0;
    if (pose.kind === 'run') { const c = Math.sin(t * 14); legA = c * .7; legB = -c * .7; armA = -c * .9; armB = c * .9; lean = .18; bob = Math.abs(c) * .05; }
    if (pose.kind === 'bowl') { const k = clamp(t, 0, 1); armA = lerp(-.4, 3.6, k); armB = lerp(1.6, -1.2, k); legA = .5; legB = -.6; lean = lerp(-.1, .35, k); }
    if (pose.kind === 'field') { legA = .35; legB = -.35; armA = -.5; armB = .5; lean = .25; bob = -.12; }
    const hip = [0, -(0.95 + bob) * u];
    const sh = [Math.sin(lean) * .55 * u * facing, hip[1] - .55 * u];
    const lw = Math.max(1.5, .13 * u);
    const leg = (a, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(hip[0] + Math.sin(a) * .5 * u, hip[1] + .5 * u); g.lineTo(hip[0] + Math.sin(a) * .7 * u, 0); g.stroke(); };
    leg(legA, pad); leg(legB, pad);
    g.strokeStyle = kit; g.lineWidth = lw * 1.9; g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(sh[0], sh[1]); g.stroke();
    const arm = (a) => { g.strokeStyle = kit; g.lineWidth = lw * .9; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(sh[0] + Math.sin(a) * .62 * u * facing, sh[1] + Math.cos(a) * .62 * u); g.stroke(); };
    arm(armA); arm(armB);
    g.fillStyle = skin; g.beginPath(); g.arc(sh[0], sh[1] - .17 * u, .12 * u, 0, 6.283); g.fill();
    if (pose.helmet) { g.fillStyle = helm; g.beginPath(); g.arc(sh[0], sh[1] - .19 * u, .13 * u, Math.PI, 0); g.fill(); g.fillRect(sh[0] - .13 * u, sh[1] - .2 * u, .26 * u, .04 * u); }
    g.restore();
  }

  // Batter: drawn from behind (bat view) or front (bowl view), with a swinging bat
  // Painted sprites (fall back to stick figures if missing)
  function sprite(name) { return typeof Art !== 'undefined' && Art.imgs['char_' + name]; }
  function drawSprite(im, x, z, heightM, alpha = 1, flip = false) {
    const [px, py, u] = P(x, 0, z);
    const h = heightM * u, w = h * im.width / im.height;
    g.save(); g.globalAlpha = alpha; g.translate(px, py); if (flip) g.scale(-1, 1);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = Math.min(18, u * .2);
    g.drawImage(im, -w / 2, -h, w, h); g.restore();
    // ground shadow
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(px, py, w * .35, Math.max(2, u * .06), 0, 0, 6.283); g.fill();
  }
  function batterPose() {
    const sw = batter.swing; if (!sw) return 'stance';
    const k = (clock - sw.t0) / 260;
    if (k < .35) return 'backlift';
    return { drive: 'drive', pull: 'pull', loft: 'loft', defend: 'defend', leave: 'leave', miss: 'drive' }[sw.kind] || 'drive';
  }

  function drawBatter() {
    {
      const near = view === 'bat';
      const pose = batterPose();
      const im = near ? sprite('sp_' + pose) : sprite(pose === 'stance' ? 'sp_fstance' : 'sp_fswing');
      if (im) { drawSprite(im, near ? -.42 : -.3, .55, near ? 2.05 : 2.0, near ? .96 : 1); return; }
    }
    const near = view === 'bat';
    const bx = near ? -.42 : -.3, bz = .55;
    const [px, py, u] = P(bx, 0, bz);
    const col = { kit: opt.batKit || '#f4ede4', pad: '#ffffff', helm: opt.helm || '#1d3557' };
    g.save(); g.globalAlpha = near ? .93 : 1; g.translate(px, py); g.lineCap = 'round';
    const lw = Math.max(2, .14 * u);
    const crouch = .9;
    // legs
    g.strokeStyle = col.pad; g.lineWidth = lw * 1.25;
    g.beginPath(); g.moveTo(-.12 * u, -crouch * u); g.lineTo(-.2 * u, 0); g.stroke();
    g.beginPath(); g.moveTo(.12 * u, -crouch * u); g.lineTo(.22 * u, 0); g.stroke();
    // torso
    const sh = [.04 * u, -(crouch + .55) * u];
    g.strokeStyle = col.kit; g.lineWidth = lw * 2.2; g.beginPath(); g.moveTo(0, -crouch * u); g.lineTo(sh[0], sh[1]); g.stroke();
    // head + helmet
    g.fillStyle = col.helm; g.beginPath(); g.arc(sh[0], sh[1] - .2 * u, .15 * u, 0, 6.283); g.fill();
    if (!near) { g.strokeStyle = '#9aa3b5'; g.lineWidth = Math.max(1, .02 * u); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(sh[0] - .1 * u, sh[1] - .17 * u + i * .04 * u); g.lineTo(sh[0] + .1 * u, sh[1] - .17 * u + i * .04 * u); g.stroke(); } }
    // bat
    let ang = .35; // resting, bat tapped behind toe
    const sw = batter.swing;
    if (sw) {
      const k = clamp((clock - sw.t0) / 260, 0, 1);
      const back = -1.9, follow = { drive: 2.6, loft: 3.4, pull: 1.4, defend: .55, leave: -1.4, miss: 2.2 }[sw.kind] ?? 2.2;
      ang = k < .35 ? lerp(.35, back, k / .35) : lerp(back, follow, easeOut((k - .35) / .65));
      if (sw.kind === 'leave') ang = lerp(.35, -1.6, easeOut(k));
    }
    const hands = [sh[0] + .18 * u * (near ? 1 : -1), sh[1] + .48 * u];
    g.strokeStyle = col.kit; g.lineWidth = lw; g.beginPath(); g.moveTo(sh[0], sh[1] + .08 * u); g.lineTo(hands[0], hands[1]); g.stroke();
    g.save(); g.translate(hands[0], hands[1]); g.rotate((near ? 1 : -1) * ang);
    g.fillStyle = '#3b2a1a'; g.fillRect(-.025 * u, -.02 * u, .05 * u, .25 * u);
    const wg = g.createLinearGradient(-.06 * u, 0, .06 * u, 0); wg.addColorStop(0, '#e9d3a3'); wg.addColorStop(1, '#c9a46a');
    g.fillStyle = wg; g.beginPath(); g.roundRect ? g.roundRect(-.055 * u, .22 * u, .11 * u, .6 * u, .03 * u) : g.rect(-.055 * u, .22 * u, .11 * u, .6 * u); g.fill();
    g.restore();
    g.restore();
  }

  function drawBowlerFar() {
    {
      const im = sprite(bowler.phase === 'run' || bowler.phase === 'idle' ? 'sp_run' : 'sp_deliver');
      if (im) { drawSprite(im, .45, bowler.z, 1.95); return; }
    }
    // Runs in from deep behind the far stumps; only in bat view
    const z = bowler.z;
    const kit = opt.bowlKit || '#2ec4b6';
    let pose = { kind: 'run', t: bowler.t, helmet: false };
    if (bowler.phase === 'deliver') pose = { kind: 'bowl', t: bowler.t * 2.2 };
    if (bowler.phase === 'follow') pose = { kind: 'run', t: bowler.t * .5 };
    if (bowler.phase === 'idle') pose = { kind: 'stand' };
    drawPerson(.45, z, { kit, pad: kit }, pose, -1);
  }

  function drawUmpire() {
    const z = view === 'bat' ? PITCH_LEN + 1.6 : PITCH_LEN + 1.4;
    const x = view === 'bat' ? -1.0 : -.9;
    const [px, py, u] = P(x, 0, z);
    drawPerson(x, z, { kit: '#e8e2d0', pad: '#1f2937' }, { kind: 'stand' }, 1);
    if (umpireUp) { // finger of doom
      const k = clamp((clock - umpireUp) / 400, 0, 1);
      g.strokeStyle = '#e8e2d0'; g.lineWidth = Math.max(1.5, .09 * u); g.lineCap = 'round';
      g.beginPath(); g.moveTo(px, py - 1.45 * u); g.lineTo(px + .1 * u, py - (1.45 + .65 * k) * u); g.stroke();
    }
  }

  function drawFielders() {
    const kit = view === 'bat' ? (opt.bowlKit || '#2ec4b6') : (opt.myKit || '#ff9f1c');
    for (const f of fielders) { if (view === 'bat' && f.z < 2) continue; drawPerson(f.x, f.z, { kit, pad: kit }, { kind: 'field' }); }
    if (view === 'bowl') { // keeper and slips behind the striker
      drawPerson(.1, -13, { kit, pad: '#fff' }, { kind: 'field' });
      drawPerson(1.4, -13.5, { kit, pad: kit }, { kind: 'field' });
      drawPerson(2.6, -13, { kit, pad: kit }, { kind: 'field' });
    }
  }

  function drawBall(p, trail) {
    if (!p) return;
    // shadow
    const s0 = P(p.x, 0, p.z);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(s0[0], s0[1], Math.max(1.5, .09 * s0[2]), Math.max(.8, .03 * s0[2]), 0, 0, 6.283); g.fill();
    // trail
    if (trail && trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const a = P(trail[i - 1].x, trail[i - 1].y, trail[i - 1].z), b = P(trail[i].x, trail[i].y, trail[i].z);
        g.strokeStyle = `rgba(255,${opt.whiteBall ? 255 : 120},${opt.whiteBall ? 255 : 100},${i / trail.length * .45})`; g.lineWidth = Math.max(1, .07 * b[2]) * (i / trail.length);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    }
    const s = P(p.x, p.y, p.z);
    const r = clamp(.085 * s[2], 2.2, 22);
    const bg = g.createRadialGradient(s[0] - r * .35, s[1] - r * .35, r * .1, s[0], s[1], r);
    if (opt.whiteBall) { bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c9c9c9'); } else { bg.addColorStop(0, '#ff8080'); bg.addColorStop(1, '#a3121f'); }
    g.fillStyle = bg; g.beginPath(); g.arc(s[0], s[1], r, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = Math.max(.5, r * .12); g.beginPath(); g.arc(s[0], s[1], r * .75, -.6, 1.2); g.stroke();
  }

  function drawReadHint() {
    if (!st || !st.del || st.phase !== 'flight' || view !== 'bat') return;
    if (st.gt < st.hintAt) return;
    const d = st.del;
    const k = clamp((st.gt - st.hintAt) / .15, 0, 1);
    const p = P(d.xb, 0, d.zb);
    const rw = .38 * p[2], rh = .1 * p[2];
    g.save(); g.globalAlpha = k * (st.gt > st.tb ? .35 : .9);
    g.strokeStyle = d.len === 'bouncer' || d.len === 'short' ? '#ff4d5e' : d.len === 'yorker' ? '#ffd166' : '#7ef0ff';
    g.lineWidth = 2; g.beginPath(); g.ellipse(p[0], p[1], rw * (1.4 - .4 * k), rh * (1.4 - .4 * k), 0, 0, 6.283); g.stroke();
    g.font = '800 12px Barlow'; g.fillStyle = g.strokeStyle; g.textAlign = 'center';
    g.fillText(d.len.toUpperCase() + (Math.abs(d.xBat) < .17 ? ' · ON STUMPS' : d.xBat > .55 ? ' · WIDE OFF' : d.xBat > .17 ? ' · OFF' : ' · LEGS'), p[0], p[1] - rh - 6);
    g.restore();
  }

  function drawTarget() {
    if (!target || view !== 'bowl') return;
    const p = P(target.x, 0, target.z);
    g.save();
    g.strokeStyle = 'rgba(255,209,102,.9)'; g.setLineDash([5, 4]); g.lineWidth = 2;
    g.beginPath(); g.ellipse(p[0], p[1], .3 * p[2], .09 * p[2], 0, 0, 6.283); g.stroke(); g.setLineDash([]);
    if (reticle) {
      const r = P(reticle.x, 0, reticle.z);
      g.strokeStyle = '#ff4d5e'; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(r[0], r[1], .16 * r[2], .05 * r[2], 0, 0, 6.283); g.stroke();
      g.beginPath(); g.moveTo(r[0] - .3 * r[2], r[1]); g.lineTo(r[0] + .3 * r[2], r[1]); g.moveTo(r[0], r[1] - .12 * r[2]); g.lineTo(r[0], r[1] + .12 * r[2]); g.stroke();
    }
    g.restore();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (tLast || now)) / 1000); tLast = now; clock = now;
    // update bowler run-up
    if (bowler.phase === 'run') { bowler.t += dt; bowler.z = lerp(31, 21.3, clamp(bowler.t / bowler.dur, 0, 1)); }
    else if (bowler.phase === 'deliver') bowler.t += dt;
    else if (bowler.phase === 'follow') { bowler.t += dt; bowler.z = Math.max(17.5, bowler.z - dt * 4); }
    if (reticle && reticle.active) {
      reticle.ph += dt * reticle.speed;
      reticle.x = target.x + Math.sin(reticle.ph * 1.7) * reticle.ax + Math.sin(reticle.ph * 4.3) * reticle.ax * .25;
      reticle.z = target.z + Math.sin(reticle.ph * 1.13 + 1) * reticle.az + Math.cos(reticle.ph * 3.1) * reticle.az * .2;
    }
    if (st && st.update) st.update(dt);

    g.clearRect(0, 0, W, H);
    drawSky(); drawGround();
    // painter's order: far → near
    if (view === 'bat') {
      drawFielders(); drawUmpire(); drawStumps(PITCH_LEN, null);
      if (bowler.phase !== 'hidden') drawBowlerFar();
      drawTarget(); drawReadHint();
      const bp = st && st.ball;
      const ballBehind = bp && bp.z < .4; // ball past the batter: draw after batter
      if (bp && !ballBehind) drawBall(bp, st.trail);
      drawStumps(0, stumpsHit);
      drawBatter();
      if (bp && ballBehind) drawBall(bp, st.trail);
    } else {
      drawStumps(-0.0, stumpsHit); // striker end is far now
      drawFielders();
      drawBatter();
      drawTarget();
      if (st && st.ball) drawBall(st.ball, st.trail);
      drawStumps(PITCH_LEN, null);
      drawUmpire();
    }
    // lens vignette for drama
    if (opt.pressure > .5) { const vg = g.createRadialGradient(W / 2, H * .45, H * .2, W / 2, H * .45, H * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(60,0,10,${(opt.pressure - .5) * .7})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
  }

  // ----- ball flight -----
  function ballAt(del, t) {
    const z0 = 19.0;
    const v = (z0 + .0) / del.T;
    const z = z0 - v * t;
    const tb = (z0 - del.zb) / v;
    let x, y;
    if (t <= tb) {
      const s = t / tb;
      x = lerp(del.x0, del.xb - del.swing, s) + del.swing * s * s;
      y = del.y0 * (1 - s) + (del.type === 'spin' ? .9 : .25) * s * (1 - s) * 1.2;
    } else {
      const s2 = (t - tb) / Math.max(.01, del.T - tb);
      x = del.xb + del.dev * s2;
      y = del.hB * (1 - Math.pow(1 - Math.min(s2, 1.6), 2));
      if (s2 > 1) y = Math.max(.05, del.hB * (1 - Math.pow(s2 - 1, 2) * .5));
    }
    return { x, y: Math.max(0, y), z, tb };
  }

  function launchAfterHit(from, res, dir) {
    // ballistic flight after contact (3D)
    const v = {
      six: [rand(-6, 6) * dir.side, rand(16, 21), rand(24, 30) * dir.fwd],
      four: [rand(8, 16) * dir.side, rand(1, 3), rand(16, 24) * dir.fwd],
      ground: [rand(4, 10) * dir.side, rand(.5, 2), rand(6, 12) * dir.fwd],
      defend: [rand(-.6, .6), .5, rand(1.2, 2.2) * dir.fwd],
      caught: [rand(-8, 8), rand(14, 18), rand(12, 18) * dir.fwd],
      edge: [rand(1.5, 3), rand(1.5, 3), -rand(14, 18)],
    }[res.visual] || [0, 0, 0];
    return { p: { ...from }, v: { x: v[0], y: v[1], z: v[2] } };
  }

  function stepBallistic(b, dt) {
    b.v.y -= 9.8 * dt; b.p.x += b.v.x * dt; b.p.y += b.v.y * dt; b.p.z += b.v.z * dt;
    if (b.p.y < 0) { b.p.y = 0; b.v.y = -b.v.y * .35; b.v.x *= .8; b.v.z *= .8; if (Math.abs(b.v.y) > 1) Sfx.bounce(); }
  }

  function showCall(text, cls, sub) {
    callEl.innerHTML = `<div class="big go ${cls}">${text}</div>${sub ? `<div class="subcall">${sub}</div>` : ''}`;
  }
  function clearCall() { callEl.innerHTML = ''; }

  function showTiming(label, col) {
    timingEl.textContent = label; timingEl.style.color = col; timingEl.classList.remove('on'); void timingEl.offsetWidth; timingEl.classList.add('on');
    setTimeout(() => timingEl.classList.remove('on'), 900);
  }

  function celebrate(res) {
    if (res.visual === 'six') { Sfx.bat(1.2); setTimeout(() => { Sfx.cheer(1.2); Burst.confetti(120); flash(); }, 250); haptic(60); }
    else if (res.visual === 'four') { Sfx.bat(1); setTimeout(() => Sfx.cheer(.9), 200); Burst.sparks(W / 2, H * .4, 40, '#7ef0ff'); haptic(40); }
  }

  // ===== PUBLIC: batting one ball =====
  function batBall(del, ctx) {
    return new Promise(resolve => {
      clearCall();
      stumpsHit = null; umpireUp = 0; batter.swing = null;
      const shotsEl = controls.querySelector('.shots');
      const bar = root.querySelector('.tvbar'), zone = bar.querySelector('.tz'), mark = bar.querySelector('.tm');
      shotsEl.classList.add('locked');
      bar.classList.add('on'); zone.style.opacity = 0;
      const T = del.T * (ctx.slow || 1);
      const zIdeal = .75; // contact point just in front of the batter
      const tIdeal = (19 - zIdeal) / (19 / del.T);
      const span = del.T * 1.18;
      const w = ctx.window;
      // The sweet spot drifts up and down: nerves (form, confidence, fatigue, pressure) make it faster and wider
      const wobA = ctx.wobble || 0, wobF = ctx.wobbleF || 6, wobP = Math.random() * 6.283;
      const zc = (t) => tIdeal + wobA * Math.sin(t * wobF + wobP) + wobA * .35 * Math.sin(t * wobF * 2.7 + wobP * 2);
      const placeZone = (t) => { zone.style.bottom = clamp((zc(t) - w) / span * 100, 0, 100) + '%'; zone.style.height = (2 * w / span * 100) + '%'; };
      placeZone(0);
      mark.style.bottom = '0%';
      const tb = (19 - del.zb) / (19 / del.T);
      st = { del, phase: 'runup', gt: 0, trail: [], ball: null, tb, hintAt: tb * ctx.readFrac, done: false };
      bowler.phase = 'run'; bowler.t = 0; bowler.dur = .95; bowler.z = 31;
      let tapped = null;
      let after = null;

      const onShot = (e) => {
        const b = e.target.closest('.shot'); if (!b || tapped || st.phase !== 'flight') return;
        tapped = { shot: b.dataset.id, t: st.gt };
        b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 200);
        haptic(15);
        decide(tapped.shot, tapped.t);
      };
      shotsEl.addEventListener('pointerdown', onShot);

      function decide(shot, t) {
        let tq;
        const dtm = t - zc(t);
        if (shot === 'leave') tq = 0;
        else {
          const a = Math.abs(dtm);
          if (a <= w * .3) { tq = 1; showTiming('Perfect', '#ffd166'); }
          else if (a <= w) { tq = lerp(1, .35, (a - w * .3) / (w * .7)); showTiming(dtm < 0 ? 'Good · early' : 'Good · late', '#7ef0ff'); }
          else if (a <= w * 2.4) { tq = lerp(.2, -.5, (a - w) / (w * 1.4)); showTiming(dtm < 0 ? 'Early' : 'Late', '#ff9f1c'); }
          else { tq = -1; showTiming(dtm < 0 ? 'Way too early' : 'Way too late', '#ff4d5e'); }
        }
        const res = resolveBat(del, shot, tq, ctx);
        res.timing = tq;
        batter.swing = { kind: shot === 'leave' ? 'leave' : (res.visual === 'miss' || res.visual === 'bowled' || res.visual === 'lbw') ? 'miss' : shot, t0: clock };
        st.res = res;
      }

      st.update = (dt) => {
        if (st.phase === 'runup') {
          if (bowler.t >= bowler.dur) { bowler.phase = 'deliver'; bowler.t = 0; st.phase = 'release'; }
          return;
        }
        if (st.phase === 'release') {
          if (bowler.t >= .3) { st.phase = 'flight'; st.gt = 0; bowler.phase = 'follow'; bowler.t = 0; Sfx.whoosh(); shotsEl.classList.remove('locked'); }
          return;
        }
        if (st.phase === 'flight') {
          const scale = st.gt > tb ? (ctx.slow || 1) : 1;
          st.gt += dt / scale;
          mark.style.bottom = clamp(st.gt / span * 100, 0, 100) + '%';
          if (!tapped) placeZone(st.gt);
          if (st.gt >= st.hintAt && zone.style.opacity !== '1') zone.style.opacity = 1;
          const p = ballAt(del, st.gt);
          if (!st.bounced && st.gt >= tb) { st.bounced = true; Sfx.bounce(); }
          st.ball = p; st.trail.push({ ...p }); if (st.trail.length > 10) st.trail.shift();
          // contact moment: if a shot was played, switch to result animation at contact time
          if (st.res && st.gt >= (st.res.visual === 'miss' || st.res.visual === 'bowled' || st.res.visual === 'lbw' || st.res.visual === 'leave' || st.res.visual === 'pad' || st.res.visual === 'duck' ? 99 : Math.max(tapped.t, tIdeal - .02))) {
            startAfter(st.res, p);
            return;
          }
          if (!st.res && st.gt > tIdeal + wobA * 1.35 + w * 2.4) { decide(null, st.gt); }
          if (st.res && ['miss', 'bowled', 'lbw', 'leave', 'pad', 'duck'].includes(st.res.visual)) {
            if (st.res.visual === 'bowled' && p.z <= .02) { startAfter(st.res, p); return; }
            if (st.res.visual === 'lbw' && p.z <= .55) { startAfter(st.res, p); return; }
            if (st.res.visual === 'pad' && p.z <= .55) { startAfter(st.res, p); return; }
            if (p.z < -2.6) { startAfter(st.res, p); return; }
          }
          return;
        }
        if (st.phase === 'after') {
          st.at += dt;
          if (after) { stepBallistic(after, dt); st.ball = after.p; st.trail.push({ ...after.p }); if (st.trail.length > 14) st.trail.shift(); }
          if (st.at > st.hold) finish();
        }
      };

      function startAfter(res, p) {
        if (st.phase === 'after') return;
        st.phase = 'after'; st.at = 0; st.hold = 1.6;
        shotsEl.classList.add('locked');
        const side = res.shot === 'pull' ? (del.xBat > .3 ? 1 : -1) : res.shot === 'drive' ? (del.xBat > .1 ? 1 : rand(-.4, .6)) : rand(-.6, .6);
        switch (res.visual) {
          case 'six': case 'four': case 'ground': case 'defend': case 'caught':
            after = launchAfterHit(p, res, { side, fwd: res.visual === 'defend' ? 1 : (res.shot === 'pull' ? rand(-.3, .7) : 1) });
            if (res.visual === 'six' || res.visual === 'four') celebrate(res);
            else { Sfx.bat(res.visual === 'defend' ? .5 : .8); }
            if (res.visual === 'caught') { setTimeout(() => { umpireUp = clock; Sfx.groan(); shake(); haptic(120); }, 700); st.hold = 2; }
            break;
          case 'edge':
            Sfx.edge(); after = launchAfterHit(p, res, { side: 1, fwd: -1 }); setTimeout(() => { umpireUp = clock; Sfx.groan(); haptic(120); }, 450); st.hold = 1.8; break;
          case 'bowled':
            stumpsHit = clock; Sfx.stumps(); shake(); haptic(160); Burst.sparks(...P(0, .5, 0).slice(0, 2), 30, '#f1e6cf'); after = { p: { ...p }, v: { x: 0, y: 1, z: -6 } }; setTimeout(() => Sfx.groan(), 200); break;
          case 'lbw':
            Sfx.pad(); after = { p: { ...p }, v: { x: rand(-1, 1), y: .5, z: 1.5 } }; setTimeout(() => { umpireUp = clock; Sfx.groan(); shake(); haptic(120); }, 550); st.hold = 2; break;
          case 'pad':
            Sfx.pad(); after = { p: { ...p }, v: { x: -2, y: .4, z: -1.5 } }; break;
          default:
            after = { p: { ...p }, v: { x: del.dev, y: .2, z: -14 } }; st.hold = .9;
        }
        const big = res.out ? ['OUT!', 'call-out', res.how] : res.extra === 'wide' ? ['WIDE', 'call-run', '+1'] : res.runs === 6 ? ['SIX!', 'call-six', res.how] : res.runs === 4 ? ['FOUR!', 'call-four', res.how] : res.runs > 0 ? [res.runs + (res.runs === 1 ? ' RUN' : ' RUNS'), 'call-run', res.how] : ['DOT', 'call-dot', res.how];
        setTimeout(() => showCall(...big), res.out ? 500 : 220);
      }

      function finish() {
        if (st.done) return; st.done = true;
        shotsEl.removeEventListener('pointerdown', onShot);
        bowler.phase = 'idle'; bowler.z = 31;
        const r = st.res; st = { ball: null };
        setTimeout(() => resolve(r), 350);
      }
    });
  }

  // ===== PUBLIC: bowling one ball =====
  function bowlBall(ctx) {
    return new Promise(resolve => {
      clearCall(); stumpsHit = null; umpireUp = 0; batter.swing = null;
      const dEl = controls.querySelector('.deliveries');
      const hint = controls.querySelector('.bhint');
      dEl.classList.remove('locked');
      hint.textContent = 'Choose your delivery';
      let plan = null;
      st = { phase: 'choose', ball: null, trail: [] };

      const onPick = (e) => {
        const b = e.target.closest('.shot'); if (!b || st.phase !== 'choose') return;
        plan = DELIVERY_DEFS.find(d => d.id === b.dataset.id);
        $$('.shot', dEl).forEach(x => x.classList.toggle('sel', x === b));
        Sfx.select(); haptic(10);
        startAim();
      };
      dEl.addEventListener('pointerdown', onPick);

      function startAim() {
        st.phase = 'aim';
        hint.innerHTML = '<b class="gold">TAP THE PITCH</b> when the red marker is on target';
        target = { x: plan.x, z: plan.z };
        const acc = ctx.accuracy, f = ctx.fatigue, pr = ctx.pressure;
        const ax = clamp(.08 + (1 - acc / 100) * .55 + f / 500 + pr * .1, .07, .8);
        reticle = { x: plan.x, z: plan.z, ph: Math.random() * 6, ax, az: ax * 3.4, speed: 1.1 + (1 - acc / 100) * 1.6 + pr * .5, active: true };
        setTimeout(() => cv.addEventListener('pointerdown', release, { once: true }), 120);
      }

      function release() {
        if (st.phase !== 'aim') return;
        reticle.active = false;
        const lz = clamp(reticle.z, -0.5, 14), lx = reticle.x;
        st.phase = 'flight'; dEl.classList.add('locked'); hint.textContent = '';
        haptic(20); Sfx.whoosh();
        const res = resolveBowl(plan.id, lz, lx, ctx);
        const del = {
          type: 'pace', zb: Math.max(.05, lz), xb: lx, x0: .45, y0: 2.25, swing: plan.id === 'full' ? -.25 * (ctx.variation / 100) : 0, dev: rand(-.05, .05),
          T: (plan.id === 'slower' ? 1.5 : 1.15) - (ctx.pace - 50) / 300, hB: LEN_H[lenFromZ(lz)] || .6,
        };
        del.xBat = del.xb + del.dev;
        st.del = del; st.gt = 0; st.res = res; st.trail = [];
        const tb = (19 - del.zb) / (19 / del.T);
        let swung = false, after = null;
        st.update = (dt) => {
          if (st.phase === 'flight') {
            st.gt += dt;
            const p = ballAt(del, st.gt); st.ball = p; st.trail.push({ ...p }); if (st.trail.length > 10) st.trail.shift();
            if (!st.bounced && st.gt >= tb) { st.bounced = true; Sfx.bounce(); target = null; reticle = null; }
            if (!swung && p.z < 1.6) { swung = true; batter.swing = { kind: res.visual === 'beaten' || res.wicket && res.visual !== 'caught' ? 'miss' : res.visual === 'wide' ? 'leave' : res.runs >= 4 ? 'loft' : 'drive', t0: clock }; }
            if (p.z <= .6) {
              st.phase = 'after'; st.at = 0; st.hold = 1.6;
              const v = res.visual;
              if (v === 'bowled') { stumpsHit = clock; Sfx.stumps(); Burst.sparks(...P(0, .5, 0).slice(0, 2), 30, '#f1e6cf'); after = { p, v: { x: 0, y: 1, z: -4 } }; setTimeout(() => Sfx.cheer(1), 150); haptic(120); }
              else if (v === 'lbw') { Sfx.pad(); after = { p, v: { x: 0, y: .4, z: 1 } }; setTimeout(() => { umpireUp = clock; Sfx.cheer(1); haptic(120); }, 500); }
              else if (v === 'caught') { Sfx.edge(); after = { p, v: { x: rand(-3, 3), y: 14, z: rand(8, 14) } }; setTimeout(() => { umpireUp = clock; Sfx.cheer(1); haptic(120); }, 900); st.hold = 2; }
              else if (v === 'six' || v === 'four') { Sfx.bat(1.1); after = { p, v: { x: rand(-10, 10), y: v === 'six' ? 18 : 2, z: v === 'six' ? 26 : 22 } }; setTimeout(() => { Sfx.groan(); }, 300); }
              else if (v === 'ground') { Sfx.bat(.7); after = { p, v: { x: rand(-8, 8), y: 1, z: rand(6, 12) } }; }
              else { after = { p, v: { x: del.dev, y: .3, z: -14 } }; if (v === 'beaten') Sfx.cheer(.4); }
              const big = res.wicket ? ['WICKET!', 'call-six', res.how] : res.extra ? [res.extra === 'wide' ? 'WIDE' : 'NO BALL', 'call-out', res.how] : res.runs === 6 ? ['SIX', 'call-out', res.how] : res.runs === 4 ? ['FOUR', 'call-out', res.how] : res.runs ? [res.runs + (res.runs > 1 ? ' RUNS' : ' RUN'), 'call-run', res.how] : ['DOT', 'call-four', res.how];
              setTimeout(() => { showCall(...big); if (res.wicket) { Burst.confetti(90); flash(); } }, res.wicket ? 600 : 200);
            }
            return;
          }
          if (st.phase === 'after') {
            st.at += dt;
            if (after) { stepBallistic(after, dt); st.ball = after.p; st.trail.push({ ...after.p }); if (st.trail.length > 14) st.trail.shift(); }
            if (st.at > st.hold) {
              st.phase = 'done'; dEl.removeEventListener('pointerdown', onPick);
              $$('.shot', dEl).forEach(x => x.classList.remove('sel'));
              res.plan = plan.id;
              st = { ball: null };
              setTimeout(() => resolve(res), 350);
            }
          }
        };
      }
    });
  }

  function open(container, o) {
    opt = Object.assign({ level: 0, pressure: 0 }, o);
    view = o.view || 'bat';
    root = container;
    cv = document.createElement('canvas'); cv.id = 'moment'; root.appendChild(cv);
    g = cv.getContext('2d');
    callEl = document.createElement('div'); callEl.className = 'm-call'; root.appendChild(callEl);
    timingEl = document.createElement('div'); timingEl.className = 'timing'; root.appendChild(timingEl);
    controls = document.createElement('div'); controls.className = 'm-controls'; root.appendChild(controls);
    if (view === 'bat') {
      const vb = document.createElement('div'); vb.className = 'tvbar';
      vb.innerHTML = '<div class="tlbl">TIME</div><div class="ttrack"><div class="tz"></div><div class="tm"></div></div>';
      root.appendChild(vb);
      const spin = o.bowlerType === 'spin';
      controls.innerHTML = `
        <div class="shots locked">${SHOT_DEFS.map(s => `<button class="shot" data-id="${s.id}"><span class="si">${s.id === 'pull' && spin ? '🧹' : s.icon}</span>${s.id === 'pull' && spin ? s.spinLabel : s.label}</button>`).join('')}</div>`;
    } else {
      controls.innerHTML = `<div class="bhint tiny" style="text-align:center;margin-bottom:8px;min-height:16px"></div>
        <div class="shots deliveries">${DELIVERY_DEFS.map(d => `<button class="shot" data-id="${d.id}"><span class="si">${d.icon}</span>${d.label}</button>`).join('')}</div>`;
    }
    seedScenery(); size();
    bowler = { z: 31, phase: view === 'bat' ? 'idle' : 'hidden', t: 0 };
    st = { ball: null };
    tLast = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    addEventListener('resize', size);
  }

  function setPressure(p) { opt.pressure = p; }
  function close() { cancelAnimationFrame(raf); removeEventListener('resize', size); target = null; reticle = null; if (root) root.innerHTML = ''; }

  return { open, close, batBall, bowlBall, setPressure, showCall, clearCall };
})();

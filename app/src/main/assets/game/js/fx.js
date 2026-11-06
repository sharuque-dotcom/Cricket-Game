// Shared helpers + ambient/background and burst particle effects.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fmtMoney(n) {
  const neg = n < 0; n = Math.abs(Math.round(n));
  let s;
  if (n >= 1e7) s = (n / 1e7).toFixed(n >= 1e8 ? 1 : 2).replace(/\.0+$/, '') + ' Cr';
  else if (n >= 1e5) s = (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' L';
  else s = n.toLocaleString('en-IN');
  return (neg ? '-₹' : '₹') + s;
}

// Split text into word spans with staggered animation (kinetic typography)
function kinetic(text, startDelay = 0, step = 0.06) {
  return text.split(' ').map((w, i) => `<span class="w" style="animation-delay:${(startDelay + i * step).toFixed(2)}s">${w}</span>`).join(' ');
}

function toast(msg) {
  let wrap = $('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg;
  wrap.appendChild(t); setTimeout(() => t.remove(), 3200);
}

function flash() { const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 600); }
function shake(el = $('#app')) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500); }

function tweenNum(el, from, to, dur = 1000, fmt = v => Math.round(v)) {
  const t0 = performance.now();
  return new Promise(res => {
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      el.textContent = fmt(lerp(from, to, easeOut(t)));
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

// ---------- Ambient background (dust motes / floodlight sparkle) ----------
const Ambient = (() => {
  const c = document.getElementById('bg'); const g = c.getContext('2d');
  let W, H, dpr, parts = [], mood = { hue: 30, glow: 'rgba(255,140,40,.10)', glow2: 'rgba(76,110,245,.08)' };
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; }
  function seed() {
    parts = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rand(.6, 2.2) * dpr, vy: -rand(.05, .35) * dpr, vx: rand(-.15, .15) * dpr, a: rand(.1, .6), p: Math.random() * 6 }));
  }
  function frame(t) {
    g.clearRect(0, 0, W, H);
    const gr = g.createRadialGradient(W * .2, H * .1, 0, W * .2, H * .1, W * 1.1); gr.addColorStop(0, mood.glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const gr2 = g.createRadialGradient(W * .9, H * .9, 0, W * .9, H * .9, W); gr2.addColorStop(0, mood.glow2); gr2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr2; g.fillRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      const tw = .5 + .5 * Math.sin(t / 900 + p.p);
      g.fillStyle = `hsla(${mood.hue},90%,75%,${p.a * tw})`;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
    requestAnimationFrame(frame);
  }
  resize(); seed(); addEventListener('resize', () => { resize(); seed(); }); requestAnimationFrame(frame);
  return {
    set(m) {
      const moods = {
        dawn: { hue: 32, glow: 'rgba(255,140,40,.12)', glow2: 'rgba(139,92,246,.08)' },
        night: { hue: 210, glow: 'rgba(76,110,245,.12)', glow2: 'rgba(46,196,182,.06)' },
        tense: { hue: 355, glow: 'rgba(230,57,70,.14)', glow2: 'rgba(80,0,20,.12)' },
        gold: { hue: 45, glow: 'rgba(255,209,102,.16)', glow2: 'rgba(255,159,28,.10)' },
      };
      mood = moods[m] || moods.dawn;
    }
  };
})();

// ---------- Burst particles (confetti, sparks, dust) ----------
const Burst = (() => {
  const c = document.getElementById('fx'); const g = c.getContext('2d');
  let W, H, dpr, ps = [], running = false;
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; }
  resize(); addEventListener('resize', resize);
  function loop() {
    g.clearRect(0, 0, W, H);
    ps = ps.filter(p => p.life > 0);
    for (const p of ps) {
      p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      const a = Math.min(1, p.life / 30);
      g.save(); g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col;
      if (p.shape === 'rect') g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      else { g.beginPath(); g.arc(0, 0, p.s / 2, 0, 6.283); g.fill(); }
      g.restore();
    }
    if (ps.length) requestAnimationFrame(loop); else { running = false; g.clearRect(0, 0, W, H); }
  }
  function add(list) { ps.push(...list); if (!running) { running = true; requestAnimationFrame(loop); } }
  return {
    confetti(n = 140, cols = ['#FFD166', '#FF9F1C', '#E63946', '#2EC4B6', '#ffffff', '#8B5CF6']) {
      add(Array.from({ length: n }, () => ({ x: W / 2 + rand(-W * .2, W * .2), y: H * .35, vx: rand(-9, 9) * dpr, vy: rand(-16, -4) * dpr, grav: .32 * dpr, drag: .985, s: rand(6, 12) * dpr, rot: rand(0, 6), vr: rand(-.3, .3), life: randi(90, 170), col: pick(cols), shape: 'rect' })));
    },
    sparks(x, y, n = 40, col = '#FFD166') {
      add(Array.from({ length: n }, () => { const a = rand(0, 6.283), sp = rand(2, 11) * dpr; return { x: x * dpr, y: y * dpr, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: .15 * dpr, drag: .95, s: rand(2, 5) * dpr, rot: 0, vr: 0, life: randi(30, 60), col, shape: 'dot' }; }));
    },
    dust(x, y, n = 24) {
      add(Array.from({ length: n }, () => ({ x: x * dpr, y: y * dpr, vx: rand(-3, 3) * dpr, vy: rand(-3, -.5) * dpr, grav: .04 * dpr, drag: .96, s: rand(4, 12) * dpr, rot: 0, vr: 0, life: randi(30, 60), col: 'rgba(210,170,120,.45)', shape: 'dot' })));
    },
  };
})();

// ---------- Optional painted art ----------
// Drop images into game/img/ with these names (jpg). Missing ones fall back to the procedural look.
const ART_NAMES = ['title', 'intro', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'bd_maidan', 'bd_stadium_day', 'bd_stadium_night',
  'ev_stall', 'ev_pandey', 'ev_rival', 'ev_bribe', 'ev_maa', 'ev_bookie', 'ev_party', 'ev_call', 'end_glory', 'end_stall',
  'bg_home', 'bg_street_dusk', 'bg_club_match', 'bg_clubhouse_wall', 'bg_mandi_night', 'cover_fixer', 'cover_bollywood',
  'bg_burnt_stall', 'bg_hospital', 'bg_tennis_night', 'bg_hostel', 'bg_dressing_room', 'bg_hotel_lobby', 'bg_newsroom', 'bg_hearing_room', 'bg_stall_rebuilt'];
const Art = {
  imgs: {},
  load() {
    return Promise.all(ART_NAMES.map(n => new Promise(res => {
      const im = new Image();
      im.onload = () => { this.imgs[n] = im; res(); };
      im.onerror = () => res();
      im.src = 'img/' + n + '.jpg';
    })).concat(['papa', 'pinky', 'pandey', 'vikrant', 'neha', 'safari', 'ramesh', 'goon',
      'papa_angry', 'papa_sad', 'neha_happy', 'neha_serious', 'neha_worried', 'vikrant_angry', 'pandey_proud',
      'chauhan', 'selector', 'maa', 'sunny', 'rocky', 'tara', 'rathore',
      'sp_stance', 'sp_backlift', 'sp_drive', 'sp_pull', 'sp_loft', 'sp_defend', 'sp_leave', 'sp_run', 'sp_deliver', 'sp_fstance', 'sp_fswing'].map(c => new Promise(res => {
      const im = new Image(); im.onload = () => { this.imgs['char_' + c] = im; res(); }; im.onerror = () => res(); im.src = 'img/char_' + c + '.webp';
    }))));
  },
  has(n) { return !!this.imgs[n]; },
  url(n) { return this.imgs[n] ? this.imgs[n].getAttribute('src') : 'img/' + n + '.jpg'; },
  // new scenes borrow the closest existing painting until their own art is added
  applyFallbacks() { const F = typeof BG_FALLBACK !== 'undefined' ? BG_FALLBACK : {}; for (const k in F) if (!this.imgs[k] && this.imgs[F[k]]) this.imgs[k] = this.imgs[F[k]]; },
  // full-bleed background layer with slow Ken Burns drift
  bg(n, extra = '') { return this.has(n) ? `<div class="art-bg" style="background-image:url('${this.url(n)}');${extra}"></div>` : ''; },
};

// ---------- Living backgrounds: particles, light rays, tilt parallax ----------
const FX_FOR_ART = {
  title: 'dust', intro: 'embers', ch1: 'dust', ch2: 'dust', ch3: 'dust', ch4: 'bokeh', ch5: 'embers+bokeh', ch6: 'bokeh',
  bd_maidan: 'fireflies', bd_stadium_day: 'dust', bd_stadium_night: 'bokeh',
  ev_stall: 'embers', ev_pandey: 'dust', ev_rival: 'dust', ev_bribe: 'dust', ev_maa: 'dust', ev_bookie: 'bokeh', ev_party: 'bokeh', ev_call: 'bokeh',
  end_glory: 'dust', end_stall: 'embers',
  bg_home: 'dust', bg_street_dusk: 'fireflies', bg_club_match: 'dust', bg_clubhouse_wall: 'dust', bg_mandi_night: 'rain+bokeh', cover_fixer: 'rain', cover_bollywood: 'bokeh',
  bg_burnt_stall: 'embers', bg_hospital: 'dust', bg_tennis_night: 'bokeh', bg_hostel: 'dust', bg_dressing_room: 'dust', bg_hotel_lobby: 'bokeh', bg_newsroom: 'dust', bg_hearing_room: 'dust', bg_stall_rebuilt: 'dust',
};
const DAY_ART = new Set(['title', 'ch1', 'ch2', 'ch3', 'bd_stadium_day', 'bg_club_match', 'bg_clubhouse_wall', 'ev_pandey', 'ev_rival', 'end_glory']);

const SceneFX = (() => {
  const live = new Set();
  let running = false;
  const mk = {
    dust: (W, H) => ({ x: Math.random() * W, y: Math.random() * H, r: rand(.8, 3), vx: rand(.05, .3), vy: -rand(.04, .22), a: rand(.3, .9), p: Math.random() * 6, big: Math.random() < .12 }),
    embers: (W, H) => ({ x: Math.random() * W, y: H + rand(0, H), r: rand(1.2, 3), vx: rand(-.2, .2), vy: -rand(.4, 1.3), a: rand(.6, 1), p: Math.random() * 6, life: rand(.6, 1) }),
    bokeh: (W, H) => ({ x: Math.random() * W, y: Math.random() * H, r: rand(12, 46), vx: rand(-.12, .12), vy: rand(-.1, .05), a: rand(.08, .22), p: Math.random() * 6, hue: pick([38, 28, 190, 280, 45]) }),
    fireflies: (W, H) => ({ x: Math.random() * W, y: H * rand(.35, 1), r: rand(1, 2.2), vx: 0, vy: 0, a: 1, p: Math.random() * 6, ang: Math.random() * 6.28 }),
    rain: (W, H) => ({ x: Math.random() * W * 1.2, y: Math.random() * H, len: rand(14, 28), sp: rand(9, 15), a: rand(.25, .55) }),
  };
  const count = { dust: 55, embers: 38, bokeh: 16, fireflies: 22, rain: 120 };

  function setup(c, mode) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = c.clientWidth || innerWidth, H = c.clientHeight || innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    const st = { c, g: c.getContext('2d'), W, H, dpr, layers: [] };
    String(mode || '').split('+').filter(m => mk[m]).forEach(m => st.layers.push({ m, ps: Array.from({ length: count[m] }, () => mk[m](W, H)) }));
    c._fx = st; return st;
  }
  function draw(st, t) {
    const { g, W, H, dpr } = st;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    for (const L of st.layers) {
      g.globalCompositeOperation = L.m === 'rain' ? 'source-over' : 'lighter';
      for (const p of L.ps) {
        if (L.m === 'rain') {
          p.x -= p.sp * .25; p.y += p.sp; if (p.y > H) { p.y = -p.len; p.x = Math.random() * W * 1.2; }
          g.strokeStyle = `rgba(190,205,255,${p.a})`; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.len * .25, p.y - p.len); g.stroke();
          continue;
        }
        if (L.m === 'fireflies') { p.ang += rand(-.25, .25); p.x += Math.cos(p.ang) * .45; p.y += Math.sin(p.ang) * .3; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < H * .3) p.y = H; if (p.y > H) p.y = H * .3; }
        else { p.x += p.vx + (L.m === 'embers' ? Math.sin(t / 600 + p.p) * .35 : 0); p.y += p.vy; }
        if (L.m === 'embers') { p.life -= .0025; if (p.y < -10 || p.life <= 0) Object.assign(p, mk.embers(W, H), { y: H + 5 }); }
        if (p.x > W + 50) p.x = -50; if (p.x < -50) p.x = W + 50; if (p.y < -50) p.y = H + 50; if (p.y > H + 50) p.y = -50;
        const tw = .55 + .45 * Math.sin(t / (L.m === 'fireflies' ? 380 : 900) + p.p);
        let col, a = p.a * tw;
        if (L.m === 'dust') col = '255,214,150'; else if (L.m === 'embers') { col = '255,150,60'; a *= p.life; } else if (L.m === 'fireflies') col = '210,255,140'; else col = null;
        if (L.m === 'bokeh') {
          const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          gr.addColorStop(0, `hsla(${p.hue},90%,70%,${a})`); gr.addColorStop(.7, `hsla(${p.hue},90%,60%,${a * .5})`); gr.addColorStop(1, `hsla(${p.hue},90%,60%,0)`);
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
        } else {
          const rr = p.big ? p.r * 3.2 : p.r * (L.m === 'dust' ? 1 : 2.4);
          const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, rr, 0, 6.283); g.fill();
        }
      }
    }
    g.globalCompositeOperation = 'source-over';
  }
  function loop(t) {
    for (const c of live) { if (!document.body.contains(c)) { live.delete(c); continue; } if (!c._fx || c._fx.W !== c.clientWidth) setup(c, c.dataset.fx); draw(c._fx, t); }
    if (live.size) requestAnimationFrame(loop); else running = false;
  }
  function mount(c) { live.add(c); setup(c, c.dataset.fx); if (!running) { running = true; requestAnimationFrame(loop); } }
  return {
    canvas(mode) { return mode ? `<canvas class="scene-fx" data-fx="${mode}"></canvas>` : ''; },
    rays(art) { return DAY_ART.has(art) ? '<div class="godrays"></div>' : ''; },
    for(art) { return FX_FOR_ART[art] || 'dust'; },
    set(c, mode) { c.dataset.fx = mode; setup(c, mode); },
    // find painted layers in a new screen and add particles above them
    scan(root) {
      $$('.art-bg, .art-photo', root).forEach(bg => {
        if (bg.dataset.fxDone) return; bg.dataset.fxDone = 1;
        const m = (bg.style.backgroundImage.match(/img\/([a-z0-9_]+)\.jpg/) || [])[1];
        const mode = FX_FOR_ART[m] || 'dust';
        const anchor = bg.nextElementSibling && bg.nextElementSibling.classList.contains('art-shade') ? bg.nextElementSibling : bg;
        anchor.insertAdjacentHTML('afterend', SceneFX.canvas(mode) + SceneFX.rays(m));
      });
      $$('canvas.scene-fx', root).forEach(c => { if (!live.has(c)) mount(c); });
    },
  };
})();

// Tilt parallax (gyroscope), with a slow idle drift when no sensor
const Parallax = (() => {
  let tx = 0, ty = 0, cx = 0, cy = 0, lastSensor = 0;
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    lastSensor = performance.now();
    tx = clamp(e.gamma, -25, 25) / 25; ty = clamp((e.beta || 45) - 45, -25, 25) / 25;
  });
  function tick(t) {
    if (t - lastSensor > 2000) { tx = Math.sin(t / 4200) * .35; ty = Math.cos(t / 5300) * .25; }
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    const r = document.documentElement.style;
    r.setProperty('--px', (cx * 10).toFixed(2)); r.setProperty('--py', (cy * 10).toFixed(2));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return {};
})();

// Fallback touch scrolling for WebViews that don't scroll nested containers
(() => {
  let el = null, y0 = 0, top0 = 0, manual = false, lastY = 0, lastT = 0, vel = 0, raf = 0;
  document.addEventListener('touchstart', e => {
    cancelAnimationFrame(raf);
    el = e.target.closest && e.target.closest('.scroll'); if (!el) return;
    y0 = lastY = e.touches[0].clientY; top0 = el.scrollTop; manual = false; vel = 0; lastT = performance.now();
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!el) return;
    const y = e.touches[0].clientY, dy = y - y0, now = performance.now();
    if (!manual && Math.abs(dy) > 12 && el.scrollTop === top0) manual = true;
    if (manual) el.scrollTop = top0 - dy;
    vel = (lastY - y) / Math.max(1, now - lastT) * 16; lastY = y; lastT = now;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!el || !manual) { el = null; return; }
    const target = el; let v = vel;
    const step = () => { v *= .94; target.scrollTop += v; if (Math.abs(v) > .4) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); el = null;
  }, { passive: true });
})();

// ---------- Rewarded ads ----------
// On the phone: real AdMob rewarded video via AndroidBridge. In a desktop browser: a labelled test stand-in.
const Ads = {
  pending: {},
  native() { return !!(window.AndroidBridge && AndroidBridge.showRewardedAd); },
  // resolves to 'rewarded' | 'skipped' | 'unavailable'
  show(placement) {
    return new Promise(resolve => {
      if (this.native()) {
        this.pending[placement] = resolve;
        try { AndroidBridge.showRewardedAd(placement); } catch (e) { delete this.pending[placement]; resolve('unavailable'); }
        setTimeout(() => { if (this.pending[placement] === resolve && !document.hidden) { delete this.pending[placement]; resolve('unavailable'); } }, 60000);
        return;
      }
      const ov = document.createElement('div'); ov.className = 'fake-ad';
      ov.innerHTML = `<div class="tiny">Test ad (browser only)</div><div class="display" style="font-size:40px;margin:10px 0">Ad plays here</div><div class="muted small">On the phone this is a real rewarded video.</div><div class="ad-count">5</div>`;
      document.body.appendChild(ov);
      let n = 5; const t = setInterval(() => { n--; ov.querySelector('.ad-count').textContent = n; if (n <= 0) { clearInterval(t); ov.remove(); resolve('rewarded'); } }, 1000);
    });
  },
  result(placement, r) { const f = this.pending[placement]; if (f) { delete this.pending[placement]; f(r); } },
};

// ---------- Local notifications (scheduled on the phone, no server) ----------
const Notify = {
  KEY_ID: 101, COMEBACK_ID: 102,
  native() { return !!(window.AndroidBridge && AndroidBridge.scheduleNotify); },
  state() { try { return this.native() ? AndroidBridge.notifyState() : 'prompt'; } catch (e) { return 'prompt'; } },
  granted() { return this.state() === 'granted'; },
  _resolve: null,
  // shows Android's permission dialog; resolves true/false
  request() {
    return new Promise(res => {
      if (!this.native()) { res(false); return; }
      this._resolve = res;
      try { AndroidBridge.requestNotify(); } catch (e) { res(false); }
    });
  },
  result(granted) { const r = this._resolve; this._resolve = null; if (r) r(!!granted); },
  schedule(id, delayMs, title, body) { if (this.native()) try { AndroidBridge.scheduleNotify(id, Math.round(delayMs), title, body); } catch (e) {} },
  cancel(id) { if (this.native()) try { AndroidBridge.cancelNotify(id); } catch (e) {} },
};

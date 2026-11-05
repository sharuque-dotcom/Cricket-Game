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

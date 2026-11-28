// Procedural sound: everything is synthesised with WebAudio, no audio files.
const Sfx = (() => {
  let ctx = null, master = null, crowdGain = null, crowdSrc = null, muted = false;
  let amb = { kind: null, nodes: [], timers: [] };
  let noiseBuf = null, softBuf = null;

  // Pink noise (energy falls off with pitch) for beds, crowds and rain: white noise through phone speakers
  // is the harsh "grainy" hiss players reported. Ends are crossfaded so a looping bed has no click.
  function makeSoft(sec) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, pk = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
      b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
      d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362; b6 = w * .115926;
    }
    const fade = Math.floor(ctx.sampleRate * .25);
    for (let i = 0; i < fade; i++) { const k = i / fade; d[i] = d[i] * k + d[n - fade + i] * (1 - k); }
    const out = ctx.createBuffer(1, n - fade, ctx.sampleRate), o = out.getChannelData(0);
    for (let i = 0; i < o.length; i++) { o[i] = d[i]; pk = Math.max(pk, Math.abs(d[i])); }
    for (let i = 0; i < o.length; i++) o[i] /= pk;
    return out;
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // master -> gentle top cut (phone speakers turn >10 kHz into fizz) -> limiter, so stacked sounds
      // (a cheer over music over a crowd) never clip and crackle
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8;
      const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 9000; air.Q.value = .5;
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 8; lim.ratio.value = 8; lim.attack.value = .004; lim.release.value = .25;
      master.connect(air); air.connect(lim); lim.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 1.3; musicGain.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      softBuf = makeSoft(4);
      if (musicWant) setTimeout(() => setMood(musicWant), 0);
    } catch (e) { ctx = null; }
  }

  function noise(dur, { type = 'bandpass', freq = 1000, q = 1, gain = .5, attack = .005, decay = dur, soft = false } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = soft ? softBuf : noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * Math.max(0, src.buffer.duration - dur - .1)); src.stop(t + dur + .05);
  }

  function tone(freq, dur, { type = 'sine', gain = .3, slide = 0, attack = .005, delay = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
  }

  // ---------- procedural music ----------
  // Indian-flavoured mood loops over a tanpura-style drone. Everything sits above ~200 Hz so phone
  // speakers can play it. Moods: calm | romance | tense | festive | stadium | off.
  // Pattern letters: lead x = note; drums k = dhol, s = slap, h = shaker, c = clap.
  const MOODS = {
    calm:    { bpm: 70,  root: 220.0, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 4, 5, 3], lead: 'pluck', rhythm: 'x...x...x.x.x...', alt: 'x...x.x.x...x...', drums: '................', shake: 'h.......h.......' },
    romance: { bpm: 76,  root: 196.0, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], lead: 'flute', rhythm: 'x.....x.x.....x.', alt: 'x...x.....x.x...', drums: 'k.......k...s...', shake: '....h.......h...' },
    tense:   { bpm: 92,  root: 164.8, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 5, 6], lead: 'pluck', rhythm: 'x.x.x.x.x.x.x.x.', alt: 'x.x.x.x.xx.x.x..', drums: 'k...k.....k.k...', shake: '................', low: true },
    festive: { bpm: 112, root: 196.0, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 0], lead: 'pluck', rhythm: 'x.xxx.x.x.xxx.x.', alt: 'xx.x.xx.x.x.xx..', drums: 'k..sk.s.k..sk.ss', shake: 'h.h.h.h.h.h.h.h.' },
    stadium: { bpm: 104, root: 164.8, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 6, 4], lead: 'pluck', rhythm: 'x.x.x...x.x.x...', alt: 'x.x.x.x.x...x.x.', drums: 'k...c...k.k.c...', shake: 'h.h.h.h.h.h.h.h.' },
  };
  let musicGain = null, musicOn = true, mus = { mood: null, timer: null, next: 0, step: 0, drone: [] }, musicWant = null;
  const semi = (f, n) => f * Math.pow(2, n / 12);
  const degree = (m, d) => { const n = m.scale.length, o = Math.floor(d / n); return m.scale[((d % n) + n) % n] + 12 * o; };
  const rnd = (seed) => { let x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
  function mvoice(type, freq, t, dur, gain, { attack = .01, filter = 0, q = .8, vib = 0 } = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filter * 3, t); f.frequency.exponentialRampToValueAtTime(filter, t + Math.min(dur, .25)); f.Q.value = q; o.connect(f); last = f; }
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.2; lg.gain.value = freq * vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
    last.connect(g); g.connect(musicGain); o.start(t); o.stop(t + dur + .05);
  }
  function mnoise(t, dur, type, freq, gain, q = 1) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(musicGain); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  function droneStart(m) {
    const t = ctx.currentTime;
    for (const [n, lvl] of [[0, .022], [7, .016], [12, .012]]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = semi(m.root, n); o.detune.value = (Math.random() - .5) * 8;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = m.low ? 700 : 1100;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 2);
      o.connect(f); f.connect(g); g.connect(musicGain); o.start(t); mus.drone.push({ o, g });
    }
  }
  function droneStop() {
    const t = ctx.currentTime;
    mus.drone.forEach(({ o, g }) => { try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 1.2); o.stop(t + 1.3); } catch (e) {} });
    mus.drone = [];
  }
  function mstep(m, i, t) {
    const s16 = i % 16, bar = Math.floor(i / 16) % 4, phrase = Math.floor(i / 64) % 2, sp = 60 / m.bpm / 4;
    const root = m.prog[bar];
    if (s16 === 0) { // pad: the bar's chord, soft and wide
      [0, 2, 4].forEach((k, j) => mvoice('triangle', semi(m.root, degree(m, root + k) + 12), t, sp * 16, .026 - j * .004, { attack: .5 }));
    }
    const pat = phrase ? m.alt : m.rhythm;
    if (pat[s16] === 'x') { // lead: a note from the chord or scale, the same every 4 bars, varied every 8
      const r = rnd(bar * 31 + s16 * 7 + phrase * 101 + m.bpm);
      const d = root + [0, 2, 4, 1, 4, 2, 7, 5][Math.floor(r * 8)];
      const f = semi(m.root, degree(m, d) + (m.low ? 12 : 24));
      if (m.lead === 'flute') mvoice('sine', f, t, sp * 5, .06, { attack: .06, vib: .006 });
      else mvoice('sawtooth', f, t, sp * 3, .045, { filter: 1400, q: 2 });
    }
    const dr = m.drums[s16];
    if (dr === 'k') { mvoice('sine', 220, t, .22, .16); mnoise(t, .09, 'bandpass', 400, .06, 1.2); } // dhol bass, pitched for phone speakers
    else if (dr === 's') mnoise(t, .08, 'bandpass', 1900, .07, 1.5);
    else if (dr === 'c') { mnoise(t, .1, 'bandpass', 1500, .09, .8); mnoise(t + .012, .08, 'bandpass', 2200, .05, .8); }
    if (m.shake[s16] === 'h') mnoise(t, .04, 'bandpass', 5200, .012, .9);
  }
  function mtick() {
    const m = MOODS[mus.mood]; if (!m || !ctx) return;
    const sp = 60 / m.bpm / 4;
    while (mus.next < ctx.currentTime + .35) { mstep(m, mus.step, mus.next); mus.next += sp; mus.step++; }
  }
  function setMood(mood) {
    musicWant = mood;
    if (!ctx || !musicGain) return;
    const want = musicOn && MOODS[mood] ? mood : null;
    if (want === mus.mood) return;
    droneStop(); clearInterval(mus.timer); mus.timer = null;
    mus.mood = want; mus.step = 0; mus.next = ctx.currentTime + .15;
    if (!want) return;
    droneStart(MOODS[want]); mtick(); mus.timer = setInterval(mtick, 100);
  }

  const api = {
    init,
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
    // stop every sound instantly when the app goes to the background, resume when it returns
    suspend() { try { if (ctx && ctx.state === 'running') ctx.suspend(); } catch (e) {} },
    resume() { try { if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume(); } catch (e) {} },
    get muted() { return muted; },
    // background music by mood; remembered until the audio context starts on the first tap
    music(mood) { setMood(mood || 'off'); },
    setMusic(on) { musicOn = !!on; const want = musicWant; setMood(on ? want : 'off'); musicWant = want; },
    get musicOn() { return musicOn; },
    get mood() { return mus.mood; },
    // for tests: schedule the current mood up to `sec` seconds ahead (offline rendering has no clock)
    _fill(sec) { const m = MOODS[mus.mood]; if (!m) return; const sp = 60 / m.bpm / 4; while (mus.next < sec) { mstep(m, mus.step, mus.next); mus.next += sp; mus.step++; } },
    get _ctx() { return ctx; },
    tap() { tone(520, .07, { type: 'triangle', gain: .12, slide: 180 }); },
    select() { tone(660, .09, { type: 'triangle', gain: .14 }); tone(990, .12, { type: 'triangle', gain: .1, delay: .05 }); },
    whoosh() { noise(.45, { type: 'bandpass', freq: 900, q: .7, gain: .3, attack: .15, decay: .45, soft: true }); },
    bat(power = 1) { // willow crack
      noise(.12, { type: 'highpass', freq: 1800, gain: .55 * power, decay: .1 });
      tone(180, .12, { type: 'square', gain: .12 * power, slide: -80 });
      tone(1200, .05, { type: 'triangle', gain: .25 * power });
    },
    edge() { noise(.08, { type: 'highpass', freq: 3200, gain: .3, decay: .07 }); tone(2400, .05, { type: 'triangle', gain: .12 }); },
    pad() { noise(.1, { type: 'lowpass', freq: 500, gain: .4, decay: .09 }); },
    stumps() {
      noise(.25, { type: 'highpass', freq: 1500, gain: .6, decay: .25 });
      [0, .04, .09].forEach((d, i) => tone(900 - i * 150, .2, { type: 'square', gain: .08, delay: d, slide: -300 }));
    },
    bounce() { noise(.06, { type: 'lowpass', freq: 700, gain: .25, decay: .06 }); },
    heartbeat() { tone(55, .16, { type: 'sine', gain: .5, slide: -15 }); tone(50, .18, { type: 'sine', gain: .4, delay: .22, slide: -15 }); },
    cheer(size = 1) {
      // a crowd roar: warm pink noise in two voice-like bands, rising and falling, no white hiss
      noise(2.6 * size, { type: 'bandpass', freq: 1100, q: .7, gain: .5 * size, attack: .3, decay: 2.6 * size, soft: true });
      noise(2.2 * size, { type: 'bandpass', freq: 520, q: .7, gain: .45 * size, attack: .22, decay: 2.2 * size, soft: true });
    },
    groan() { noise(1.4, { type: 'lowpass', freq: 500, gain: .3, attack: .1, decay: 1.4, soft: true }); tone(160, 1.1, { type: 'sawtooth', gain: .03, slide: -60 }); },
    coin() { tone(1320, .08, { type: 'square', gain: .08 }); tone(1760, .25, { type: 'square', gain: .07, delay: .08 }); },
    stinger() { // chapter / big moment
      tone(110, 1.6, { type: 'sawtooth', gain: .08, attack: .02 });
      tone(165, 1.6, { type: 'sawtooth', gain: .06, attack: .02 });
      noise(1.2, { type: 'lowpass', freq: 300, gain: .4, attack: .01, decay: 1.2, soft: true });
      tone(55, 1.8, { type: 'sine', gain: .5, attack: .01 });
    },
    rise() { tone(220, 1.2, { type: 'sawtooth', gain: .05, slide: 660, attack: .3 }); noise(1.2, { type: 'bandpass', freq: 2200, q: .6, gain: .14, attack: 1.1, decay: 1.2, soft: true }); },
    success() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, { type: 'triangle', gain: .14, delay: i * .08 })); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, .4, { type: 'triangle', gain: .14, delay: i * .12 })); },
    gavel() { noise(.12, { type: 'lowpass', freq: 900, gain: .8, decay: .12 }); tone(120, .2, { type: 'sine', gain: .5 }); },
    crowd(on, level = .12) {
      if (!ctx) return;
      if (on && !crowdSrc) {
        crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = softBuf; crowdSrc.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = .6;
        crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
        crowdSrc.connect(f); f.connect(crowdGain); crowdGain.connect(master); crowdSrc.start();
      }
      if (crowdGain) { const t = ctx.currentTime; crowdGain.gain.cancelScheduledValues(t); crowdGain.gain.setValueAtTime(crowdGain.gain.value, t); crowdGain.gain.linearRampToValueAtTime(on ? level * 1.4 : 0, t + 1); }
      if (!on && crowdSrc) { const s = crowdSrc; crowdSrc = null; setTimeout(() => { try { s.stop(); } catch (e) {} }, 1200); }
    },
    // soft typewriter tick
    tick() { tone(1800 + Math.random() * 300, .025, { type: 'sine', gain: .014 }); },
    // deep cinematic hit for reveals
    boom() { tone(48, 2.2, { type: 'sine', gain: .7, attack: .005, slide: -18 }); noise(1.6, { type: 'lowpass', freq: 220, gain: .55, decay: 1.6, soft: true }); tone(96, 1.2, { type: 'triangle', gain: .12, slide: -40 }); },
    // looping scene ambience: stall | maidan | room | rain | night | off
    ambience(kind) {
      if (!ctx) return;
      if (amb.kind === kind) return;
      const old = amb.nodes, oldTimers = amb.timers;
      oldTimers.forEach(clearInterval);
      old.forEach(n => { try { n.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2); setTimeout(() => { try { n.s.stop(); } catch (e) {} }, 1400); } catch (e) {} });
      amb = { kind, nodes: [], timers: [] };
      if (!kind || kind === 'off') return;
      const bed = (type, freq, q, level) => {
        const s = ctx.createBufferSource(); s.buffer = softBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.5);
        s.connect(f); f.connect(g); g.connect(master); s.start(0, Math.random() * 3); amb.nodes.push({ s, g });
      };
      const every = (ms, fn, chance = 1) => amb.timers.push(setInterval(() => { if (Math.random() < chance && !muted) fn(); }, ms));
      if (kind === 'stall') {
        bed('bandpass', 750, .7, .1); bed('bandpass', 2400, 2, .02);
        every(5200, () => noise(1.8, { type: 'bandpass', freq: 3000, q: 2, gain: .04, attack: .4, decay: 1.8, soft: true }), .5); // kettle hiss
        every(9000, () => { tone(392, .5, { type: 'sawtooth', gain: .035 }); tone(494, .5, { type: 'sawtooth', gain: .03 }); tone(392, .35, { type: 'sawtooth', gain: .03, delay: .6 }); }, .45); // bus horn
        every(3700, () => tone(1300 + Math.random() * 500, .06, { type: 'triangle', gain: .02 }), .4); // glasses clink
      } else if (kind === 'maidan') {
        bed('bandpass', 900, .6, .09);
        every(2300, () => { const f = 2600 + Math.random() * 1600; [0, .09, .18].forEach(d => tone(f + Math.random() * 300, .07, { type: 'sine', gain: .03, delay: d, slide: 400 })); }, .55); // birds
        every(6000, () => noise(1.2, { type: 'bandpass', freq: 1100, q: .7, gain: .06, attack: .3, decay: 1.2, soft: true }), .4); // distant kids shout
      } else if (kind === 'room') {
        bed('bandpass', 650, .7, .06);
        every(900, () => { tone(4400, .03, { type: 'sine', gain: .05 }); tone(4400, .03, { type: 'sine', gain: .05, delay: .06 }); }, .6); // crickets
      } else if (kind === 'night') {
        bed('bandpass', 700, .6, .065);
        every(1100, () => { tone(4100, .03, { type: 'sine', gain: .05 }); tone(4100, .03, { type: 'sine', gain: .05, delay: .07 }); }, .5);
      } else if (kind === 'rain') {
        bed('bandpass', 1600, .5, .11); bed('bandpass', 600, .6, .06); // steady rain, no fizz
        every(700, () => tone(2200 + Math.random() * 900, .03, { type: 'sine', gain: .02, slide: -600 }), .7); // drips on tin
        every(11000, () => { noise(3.2, { type: 'lowpass', freq: 140, gain: .5, attack: .2, decay: 3.2, soft: true }); }, .45); // thunder
      }
    },
  };
  return api;
})();

function haptic(ms) {
  try {
    if (window.AndroidBridge) AndroidBridge.vibrate(ms);
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}

// Screen off / app switched / tab hidden: silence everything
document.addEventListener('visibilitychange', () => { if (document.hidden) Sfx.suspend(); else Sfx.resume(); });
// Browsers only allow sound after the player touches the screen: start (or resume) audio on any tap.
// The old title screen did this; it was lost when the app started opening straight on the story home (1.5.0).
['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, () => Sfx.init(), { capture: true, passive: true }));

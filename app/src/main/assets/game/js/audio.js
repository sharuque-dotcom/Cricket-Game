// Procedural sound: everything is synthesised with WebAudio, no audio files.
const Sfx = (() => {
  let ctx = null, master = null, crowdGain = null, crowdSrc = null, muted = false;
  let amb = { kind: null, nodes: [], timers: [] };
  let noiseBuf = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }

  function noise(dur, { type = 'bandpass', freq = 1000, q = 1, gain = .5, attack = .005, decay = dur } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + dur + .05);
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

  const api = {
    init,
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
    // stop every sound instantly when the app goes to the background, resume when it returns
    suspend() { try { if (ctx && ctx.state === 'running') ctx.suspend(); } catch (e) {} },
    resume() { try { if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume(); } catch (e) {} },
    get muted() { return muted; },
    tap() { tone(520, .07, { type: 'triangle', gain: .12, slide: 180 }); },
    select() { tone(660, .09, { type: 'triangle', gain: .14 }); tone(990, .12, { type: 'triangle', gain: .1, delay: .05 }); },
    whoosh() { noise(.45, { type: 'bandpass', freq: 900, q: .7, gain: .25, attack: .15, decay: .45 }); },
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
      noise(2.6 * size, { type: 'bandpass', freq: 1400, q: .4, gain: .35 * size, attack: .25, decay: 2.6 * size });
      noise(2.2 * size, { type: 'bandpass', freq: 600, q: .5, gain: .25 * size, attack: .2, decay: 2.2 * size });
    },
    groan() { noise(1.4, { type: 'lowpass', freq: 500, gain: .3, attack: .1, decay: 1.4 }); tone(160, 1.1, { type: 'sawtooth', gain: .03, slide: -60 }); },
    coin() { tone(1320, .08, { type: 'square', gain: .08 }); tone(1760, .25, { type: 'square', gain: .07, delay: .08 }); },
    stinger() { // chapter / big moment
      tone(110, 1.6, { type: 'sawtooth', gain: .08, attack: .02 });
      tone(165, 1.6, { type: 'sawtooth', gain: .06, attack: .02 });
      noise(1.2, { type: 'lowpass', freq: 300, gain: .4, attack: .01, decay: 1.2 });
      tone(55, 1.8, { type: 'sine', gain: .5, attack: .01 });
    },
    rise() { tone(220, 1.2, { type: 'sawtooth', gain: .05, slide: 660, attack: .3 }); noise(1.2, { type: 'highpass', freq: 2000, gain: .12, attack: 1.1, decay: 1.2 }); },
    success() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, { type: 'triangle', gain: .14, delay: i * .08 })); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, .4, { type: 'triangle', gain: .14, delay: i * .12 })); },
    gavel() { noise(.12, { type: 'lowpass', freq: 900, gain: .8, decay: .12 }); tone(120, .2, { type: 'sine', gain: .5 }); },
    crowd(on, level = .12) {
      if (!ctx) return;
      if (on && !crowdSrc) {
        crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = noiseBuf; crowdSrc.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .35;
        crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
        crowdSrc.connect(f); f.connect(crowdGain); crowdGain.connect(master); crowdSrc.start();
      }
      if (crowdGain) crowdGain.gain.linearRampToValueAtTime(on ? level : 0, ctx.currentTime + 1);
      if (!on && crowdSrc) { const s = crowdSrc; crowdSrc = null; setTimeout(() => { try { s.stop(); } catch (e) {} }, 1200); }
    },
    // soft typewriter tick
    tick() { tone(1800 + Math.random() * 300, .02, { type: 'square', gain: .012 }); },
    // deep cinematic hit for reveals
    boom() { tone(48, 2.2, { type: 'sine', gain: .7, attack: .005, slide: -18 }); noise(1.6, { type: 'lowpass', freq: 220, gain: .55, decay: 1.6 }); tone(96, 1.2, { type: 'triangle', gain: .12, slide: -40 }); },
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
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.5);
        s.connect(f); f.connect(g); g.connect(master); s.start(0, Math.random()); amb.nodes.push({ s, g });
      };
      const every = (ms, fn, chance = 1) => amb.timers.push(setInterval(() => { if (Math.random() < chance && !muted) fn(); }, ms));
      if (kind === 'stall') {
        bed('lowpass', 380, .7, .07); bed('bandpass', 2600, 2, .012);
        every(5200, () => noise(1.8, { type: 'bandpass', freq: 3200, q: 1.5, gain: .05, attack: .4, decay: 1.8 }), .5); // kettle hiss
        every(9000, () => { tone(392, .5, { type: 'sawtooth', gain: .035 }); tone(494, .5, { type: 'sawtooth', gain: .03 }); tone(392, .35, { type: 'sawtooth', gain: .03, delay: .6 }); }, .45); // bus horn
        every(3700, () => tone(1300 + Math.random() * 500, .06, { type: 'triangle', gain: .02 }), .4); // glasses clink
      } else if (kind === 'maidan') {
        bed('bandpass', 500, .4, .05); bed('highpass', 4000, .5, .008);
        every(2300, () => { const f = 2600 + Math.random() * 1600; [0, .09, .18].forEach(d => tone(f + Math.random() * 300, .07, { type: 'sine', gain: .03, delay: d, slide: 400 })); }, .55); // birds
        every(6000, () => noise(1.2, { type: 'bandpass', freq: 1100, q: .6, gain: .05, attack: .3, decay: 1.2 }), .4); // distant kids shout
      } else if (kind === 'room') {
        bed('lowpass', 160, 1, .09); bed('bandpass', 4200, 6, .006);
        every(900, () => { tone(4400, .03, { type: 'sine', gain: .018 }); tone(4400, .03, { type: 'sine', gain: .018, delay: .06 }); }, .6); // crickets
      } else if (kind === 'night') {
        bed('lowpass', 260, .7, .05);
        every(1100, () => { tone(4100, .03, { type: 'sine', gain: .016 }); tone(4100, .03, { type: 'sine', gain: .016, delay: .07 }); }, .5);
      } else if (kind === 'rain') {
        bed('highpass', 1200, .3, .12); bed('lowpass', 500, .5, .06);
        every(700, () => noise(.04, { type: 'highpass', freq: 3000, gain: .05, decay: .04 }), .7); // drips on tin
        every(11000, () => { noise(3.2, { type: 'lowpass', freq: 140, gain: .5, attack: .2, decay: 3.2 }); }, .45); // thunder
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

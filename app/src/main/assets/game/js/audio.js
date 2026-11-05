// Procedural sound: everything is synthesised with WebAudio, no audio files.
const Sfx = (() => {
  let ctx = null, master = null, crowdGain = null, crowdSrc = null, muted = false;
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
  };
  return api;
})();

function haptic(ms) {
  try {
    if (window.AndroidBridge) AndroidBridge.vibrate(ms);
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}

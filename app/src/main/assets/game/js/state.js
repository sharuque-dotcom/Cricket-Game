// Career state + rules: training, weekly drift, events, ratings, selection.
const SAVE_KEY = 'gg_save_v1';

const Game = {
  s: null,

  newCareer(name, role) {
    const base = {
      bat: { technique: 34, power: 28, vsPace: 31, vsSpin: 29, temperament: 30, pace: 14, accuracy: 14, variation: 10, fitness: 33, iq: 25 },
      bowl: { technique: 14, power: 18, vsPace: 15, vsSpin: 15, temperament: 30, pace: 36, accuracy: 33, variation: 22, fitness: 35, iq: 25 },
      all: { technique: 27, power: 26, vsPace: 25, vsSpin: 24, temperament: 28, pace: 28, accuracy: 26, variation: 17, fitness: 33, iq: 25 },
    }[role];
    this.s = {
      v: 1, name, role, age: 16, stage: 0, week: 1, season: 1, totalWeeks: 0,
      skills: base,
      cond: { fatigue: 20, injury: 5, form: 50, confidence: 50, focus: 50 },
      life: { money: 3000, family: 60, fans: 40, reputation: 10, coachTrust: 40, integrity: 70, mental: 65, debt: 0 },
      selector: 0, stageRatings: [], lastRating: null, fails: 0, injuries: 0,
      career: { matches: 0, runs: 0, balls: 0, outs: 0, hs: 0, fifties: 0, hundreds: 0, wkts: 0, ballsBowled: 0, runsConceded: 0, best: '' },
      fmtStats: {}, flags: {}, seen: {}, diary: [], plan: [null, null, null],
      ipl: null, price: 0, missNext: false,
    };
    this.diary('Week 1. Rajgarh. Everyone says it\'s impossible. Good.');
    this.save();
    return this.s;
  },

  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); } catch (e) {} },
  load() { try { const j = localStorage.getItem(SAVE_KEY); if (j) { this.s = JSON.parse(j); this.s.fmtStats = this.s.fmtStats || {}; return true; } } catch (e) {} return false; },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} this.s = null; },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },

  get stageDef() { return STAGES[this.s.stage]; },
  get first() { return this.s.name.split(' ')[0]; },
  isBat() { return this.s.role !== 'bowl'; },
  isBowl() { return this.s.role !== 'bat'; },

  diary(text) { this.s.diary.unshift({ w: this.s.totalWeeks + 1, age: this.s.age, text }); this.s.diary = this.s.diary.slice(0, 60); },

  batRating() { const k = this.s.skills; return k.technique * .32 + (k.vsPace + k.vsSpin) / 2 * .24 + k.temperament * .16 + k.power * .14 + k.iq * .14; },
  bowlRating() { const k = this.s.skills; return k.accuracy * .34 + k.pace * .28 + k.variation * .22 + k.iq * .16; },
  overall() { return this.s.role === 'bat' ? this.batRating() : this.s.role === 'bowl' ? this.bowlRating() : (this.batRating() + this.bowlRating()) / 2 + 3; },

  // Readiness: how much of your skill shows up on match day (-0.2 .. +0.12)
  readiness() {
    const c = this.s.cond, l = this.s.life;
    const r = (c.form - 50) / 300 + (c.confidence - 50) / 400 + (c.focus - 50) / 450
      - Math.max(0, c.fatigue - 45) / 300 - c.injury / 500 - Math.max(0, 40 - l.mental) / 350 + Math.max(0, l.family - 70) / 1000;
    return clamp(r, -.22, .12);
  },

  // Apply a dict of deltas. Returns list of [key, delta] actually applied (for UI chips)
  apply(fx, mult = 1) {
    const s = this.s, out = [];
    for (const k in fx) {
      let v = fx[k];
      if (typeof v === 'string') v = this.special(v, k);
      if (typeof v !== 'number' || !v) continue;
      if (k in s.skills) {
        let d = v * (v > 0 ? mult : 1);
        if (d > 0) d *= clamp(1.35 - s.skills[k] / 100, .22, 1.2);
        const before = s.skills[k]; s.skills[k] = clamp(before + d, 1, 99); out.push([k, s.skills[k] - before]);
      } else if (k in s.cond) {
        const before = s.cond[k]; s.cond[k] = clamp(before + v, 0, 100); out.push([k, s.cond[k] - before]);
      } else if (k === 'money') {
        let d = v; if (d > 0 && s.flags.agent && d > 50000) d *= .85;
        s.life.money = Math.round(s.life.money + d); out.push([k, Math.round(d)]);
      } else if (k === 'fans') {
        s.life.fans = Math.max(0, Math.round(s.life.fans + v)); out.push([k, Math.round(v)]);
      } else if (k === 'debt') {
        s.life.debt = Math.max(0, Math.round(s.life.debt + v));
      } else if (k in s.life) {
        const before = s.life[k]; s.life[k] = clamp(before + v, 0, 100); out.push([k, s.life[k] - before]);
      } else if (k === 'selector') {
        s.selector += v; out.push([k, v]);
      }
    }
    return out;
  },

  special(code, key) {
    const s = this.s, st = s.stage;
    switch (code) {
      case 'social': return Math.round((20 + s.life.fans * .04) * rand(.5, 1.6) * (1 + st * .5));
      case 'shoot': return [0, 0, 0, 60000, 400000, 900000][st];
      case 'shootFans': return [0, 0, 0, 300, 2000, 6000][st];
      case 'physio2': return -COSTS.physio[st] * 2;
      case 'payDebt': { const d = s.life.debt; s.life.debt = 0; return -d; }
      case 'grow': return Math.round(s.life.debt * .2);
      case 'pinky': return -[12000, 20000, 40000, 60000][st];
      case 'brand': return [0, 0, 0, 300000, 1500000, 3000000][st];
      case 'clip': return Math.round(3000 + s.life.fans * .6);
    }
    return 0;
  },

  actionAvailable(a) {
    const s = this.s;
    if (a.roles && !a.roles.includes(s.role)) return false;
    if (a.minStage && s.stage < a.minStage) return false;
    if (a.maxStage !== undefined && s.stage > a.maxStage) return false;
    return true;
  },
  actionCost(a) { return a.cost ? COSTS[a.cost][this.s.stage] : 0; },

  // Run one week's three planned actions. Returns list of chips
  runWeek() {
    const s = this.s; const all = [];
    const facility = 1 + s.stage * .08;
    for (const id of s.plan) {
      const a = ACTIONS.find(x => x.id === id); if (!a) continue;
      const cost = this.actionCost(a);
      if (cost) { s.life.money -= cost; all.push(['money', -cost]); }
      const eff = clamp(1 - s.cond.fatigue / 150, .3, 1) * facility;
      all.push(...this.apply(a.fx, eff));
      if (a.risk === 'night' && Math.random() < .35) s.flags._nightRisk = true;
      if (a.risk === 'social' && s.cond.form < 40 && Math.random() < .3) all.push(...this.apply({ mental: -6 }));
      // overtraining can hurt you
      if (s.cond.fatigue > 85 && a.fx.fatigue > 0 && Math.random() < .25) { all.push(...this.apply({ injury: 15 })); toast('🩹 Overtraining — something tweaked.'); }
    }
    // passive drift
    const c = s.cond, l = s.life;
    all.push(...this.apply({ fatigue: -8 }));
    c.form += (50 - c.form) * .08; c.confidence += (50 - c.confidence) * .06; c.focus += (50 - c.focus) * .15;
    l.mental = clamp(l.mental + (l.family - 50) / 25 + (l.money < 0 ? -4 : 0), 0, 100);
    const living = COSTS.living[s.stage];
    l.money -= living; all.push(['money', -living]);
    if (l.money < 0) { l.family = clamp(l.family - 3, 0, 100); }
    s.plan = [null, null, null];
    s.totalWeeks++;
    return mergeChips(all);
  },

  // Pick a story or random event for the current week (or null)
  nextEvent() {
    const s = this.s;
    const story = STORY.find(e => e.stage === s.stage && e.week === s.week && !s.seen[e.id]);
    if (story) return story;
    if (s.life.mental <= 6 && !s.seen['breaking_' + s.totalWeeks]) return BREAKING;
    if (s.flags._nightRisk) { s.flags._nightRisk = false; return RANDOM_EVENTS.find(e => e.id === 'nightout'); }
    if (Math.random() < .5) {
      const pool = RANDOM_EVENTS.filter(e => e.id !== 'nightout' && e.when(s) && !(s.seen[e.id] && s.totalWeeks - s.seen[e.id] < 6));
      let tot = pool.reduce((a, e) => a + e.w, 0), r = Math.random() * tot;
      for (const e of pool) { r -= e.w; if (r <= 0) return e; }
    }
    return null;
  },

  markSeen(ev) {
    const s = this.s;
    if (ev.id === 'breaking') s.seen['breaking_' + s.totalWeeks] = 1;
    else s.seen[ev.id] = s.totalWeeks || 1;
  },

  fill(text) {
    const s = this.s;
    const ipl = s.ipl ? TEAMS_IPL.find(t => t.id === s.ipl) : null;
    const lastR = s.lastRating;
    return text
      .replace(/\{name\}/g, s.name).replace(/\{first\}/g, this.first)
      .replace(/\{debt\}/g, fmtMoney(s.life.debt))
      .replace(/\{pinkyFee\}/g, fmtMoney([12000, 20000, 40000, 60000][Math.min(3, s.stage)]).replace('₹', ''))
      .replace(/\{brandFee\}/g, fmtMoney([0, 0, 0, 300000, 1500000, 3000000][s.stage]).replace('₹', ''))
      .replace(/\{iplStar\}/g, ipl ? ipl.star : 'The captain')
      .replace(/\{fixAsk\}/g, s.role === 'bat' ? 'get out before you reach fifteen' : 'one no-ball in your second over')
      .replace(/\{bowlNote\}/g, s.role === 'bat' ? '' : ' and given only four overs')
      .replace(/\{clipBody\}/g, lastR !== null && lastR >= 6
        ? 'Someone filmed your last game from the stands. The clip — slow-mo, dramatic music, "UP\'s hidden gem?" — has 1.8 million views. Your DMs are a disaster. Rohan the agent has called three times.'
        : 'A clip from your last game is going around. Not a good one. A dropped catch, slow-mo, sad violin music. "Is this the future of Indian cricket? 😂" 1.2 million views.');
  },

  // ---------- Selection ----------
  stageScore() {
    const s = this.s, r = s.stageRatings;
    const avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
    const score = avg * 8.2 + s.life.reputation * .12 + s.life.coachTrust * .1 + s.selector + (s.skills.fitness - 45) * .12 + rand(-3, 3)
      - (s.flags.fight && s.stage === 0 ? 5 : 0);
    return { avg, score: Math.round(score) };
  },

  auctionPrice(score) {
    if (score < 48) return 0;
    return Math.min(180000000, Math.round(2000000 * Math.exp((score - 48) / 7) / 500000) * 500000);
  },

  // after stage completes successfully
  advance() {
    const s = this.s;
    s.stage++; s.week = 1; s.season++; s.age++; s.stageRatings = []; s.selector = 0;
    if (s.stage === 4 && s.ipl) {
      const opps = TEAMS_IPL.filter(t => t.id !== s.ipl).sort(() => Math.random() - .5).slice(0, 4);
      s.iplOpps = opps.map((t, i) => ({ name: t.name, cat: 'IPL', fmt: 'T20', comp: 'Indian Prime League', c2: t.c1, bowler: t.bowler, bowlerType: /Rashid|Jadega|Chahel|Krunal/.test(t.bowler) ? 'spin' : 'pace', batter: t.batter, str: 72 + i * 2 }));
    }
    this.save();
  },
  repeatStage() {
    const s = this.s;
    s.week = 1; s.season++; s.age++; s.stageRatings = []; s.selector = 0; s.fails++;
    this.save();
  },

  currentOpps() { const s = this.s; return s.stage === 4 ? s.iplOpps : this.stageDef.opps; },
  // fixture with category / format / competition filled in
  fixture(i) {
    const opps = this.currentOpps(), o = opps[i % opps.length];
    const d = STAGE_DEFAULT_CAT[this.stageDef.id];
    return Object.assign({ cat: d[0], fmt: d[1], comp: d[2] }, o);
  },
  myTeam() {
    const s = this.s;
    if (s.stage === 4) { const t = TEAMS_IPL.find(x => x.id === s.ipl); return { name: t.name, c1: t.c1 }; }
    return { name: this.stageDef.team, c1: this.stageDef.c1 };
  },
  isMatchWeek() { return this.stageDef.schedule[this.s.week - 1] === 'M'; },
  matchIndex() { return this.stageDef.schedule.slice(0, this.s.week).split('M').length - 2; },
  weeksInStage() { return this.stageDef.schedule.length; },
};

function mergeChips(list) {
  const m = new Map();
  for (const [k, v] of list) m.set(k, (m.get(k) || 0) + v);
  return [...m.entries()].filter(([k, v]) => Math.abs(v) >= (k === 'money' || k === 'fans' ? 1 : .05));
}

const BREAKING = { id: 'breaking', em: '🌧️', bg: ['#1f2937', '#000000'], who: '3 AM', title: 'Breaking Point',
  body: 'You haven\'t slept properly in weeks. The phone is face down. Your kit bag has been packed by the door for two days and you haven\'t touched it. A thought you\'ve never let yourself think: what if you just... stopped?',
  choices: [
    { t: 'Call Papa.', d: 'Talk to someone.', fx: { mental: 40, family: 8, focus: 6 }, out: 'He doesn\'t say much. He doesn\'t need to. "Come home for a few days, beta. The cricket will wait."' },
    { t: 'See the team psychologist.', d: 'Get help.', fx: { mental: 45, temperament: 2, coachTrust: 2 }, out: 'The first session you mostly stare at the floor. The second, you talk for an hour. It\'s a start.' },
    { t: 'Walk away from cricket.', d: 'End your career.', end: 'quit', out: '' },
  ] };

// Match flow: VS intro → toss → innings (simulated chunks + playable key moments) → result.
const FORMAT = {
  T20: { balls: 120, par: [138, 150, 160, 168, 182, 186], sr: 125, outP: .034, label: 'T20', fee: [300, 1500, 0, 35000, 0, 300000] },
  ODI: { balls: 300, par: [230, 245, 262, 275, 290, 300], sr: 82, outP: .02, label: '50 overs', fee: [300, 2500, 35000, 0, 0, 600000] },
  FC: { balls: 540, par: [260, 280, 310, 330, 340, 350], sr: 52, outP: .011, label: 'Multi-day', fee: [0, 0, 60000, 0, 0, 1500000] },
};
const PAPERS = ['Dainik Rajgarh Times', 'Kanpur Kesari', 'The Lucknow Herald', 'Sports Today', 'The Times of Bharat', 'The Times of Bharat'];

const Match = {
  m: null,

  async play() {
    const s = Game.s, sd = Game.stageDef;
    const idx = Game.matchIndex();
    const opp = Game.fixture(idx);
    const my = Game.myTeam();
    const fmt = FORMAT[opp.fmt] || FORMAT[sd.format];
    const level = sd.level;
    const m = this.m = {
      opp, my, fmt, level, idx,
      par: fmt.par[level],
      us: { r: 0, w: 0, b: 0 }, them: { r: 0, w: 0, b: 0 },
      bat: { r: 0, b: 0, out: false, how: '', fours: 0, sixes: 0, played: false },
      bowl: { b: 0, r: 0, w: 0, played: false },
      goals: 0, goalTotal: 0, target: null, batFirst: true, lastPlan: null,
      oppAbbr: abbr(opp.name), myAbbr: abbr(my.name),
    };
    Ambient.set(level >= 3 ? 'night' : 'dawn');
    Sfx.crowd(true, level >= 4 ? .16 : level >= 2 ? .07 : .04);

    await this.vsScreen();
    await this.toss();

    const order = m.batFirst ? ['us', 'them'] : ['them', 'us'];
    for (let i = 0; i < 2; i++) {
      const side = order[i];
      if (i === 1) m.target = (side === 'us' ? m.them.r : m.us.r) + 1;
      if (side === 'us') { if (Game.isBat()) await this.battingInnings(); else await this.simOurInnings(); }
      else { if (Game.isBowl()) await this.bowlingSpell(); else await this.simTheirInnings(); }
      if (i === 0) await this.inningsBreak(side);
    }
    Sfx.crowd(false);
    return this.finish();
  },

  // ---------- Screens ----------
  vsScreen() {
    const m = this.m, sd = Game.stageDef, s = Game.s;
    const ready = Game.readiness();
    const readyTxt = ready > .05 ? ['Sharp', 'green'] : ready > -.03 ? ['Steady', 'gold'] : ready > -.1 ? ['Rusty', 'saffron'] : ['Running on empty', 'red'];
    UI.show(`<div class="screen vs-screen" style="--c1:${m.my.c1};--c2:${m.opp.c2}">
      <div class="vs-half top"><div class="tiny" style="color:rgba(255,255,255,.7)">${esc(m.opp.comp)}</div><div class="tn">${esc(m.my.name)}</div></div>
      <div class="vs-half bot"><div class="tn">${esc(m.opp.name)}</div><div class="tiny" style="color:rgba(255,255,255,.7)">Danger: ${esc(m.opp.bowler)}</div></div>
      <div class="vs-badge">VS</div>
      <div class="vs-meta">
        <div class="card" style="background:rgba(8,8,14,.85)">
          <div class="row between"><span class="tiny">Format</span><b class="cond">${m.opp.cat} · ${m.fmt.label}</b></div>
          <div class="row between" style="margin-top:6px"><span class="tiny">Venue</span><span class="small">${esc(sd.venue || (TEAMS_IPL.find(t => t.id === s.ipl) || {}).name + ' home')}</span></div>
          <div class="row between" style="margin-top:6px"><span class="tiny">Your readiness</span><b class="cond ${readyTxt[1]}">${readyTxt[0]}</b></div>
        </div>
        <button class="btn primary block" style="margin-top:12px" data-go>Walk out</button>
      </div></div>`);
    Sfx.stinger();
    return UI.waitTap('[data-go]');
  },

  async toss() {
    const m = this.m;
    const won = Math.random() < .5;
    const batFirst = Math.random() < .5;
    m.batFirst = batFirst;
    const call = won ? (batFirst ? 'won the toss and chose to bat' : 'won the toss and chose to bowl') : (batFirst ? 'lost the toss. Asked to bat first' : 'lost the toss. Asked to bowl first');
    const el = UI.show(`<div class="screen sim">
      <div class="tiny">The Toss</div>
      <div class="coin-wrap" style="margin:40px auto 28px"><div class="coin"><div class="face">HEADS</div><div class="face back">TAILS</div></div></div>
      <div class="display" style="font-size:40px;opacity:0" data-res>${esc(m.my.name)}</div>
      <div class="muted" style="opacity:0;margin-top:6px" data-res2>${call}</div>
      <button class="btn ghost" style="margin-top:28px;opacity:0" data-go>Continue</button></div>`);
    const coin = $('.coin', el); coin.style.setProperty('--end', (won ? 1800 : 1980) + 'deg');
    await sleep(300); coin.classList.add('flip'); Sfx.whoosh();
    await sleep(1900); Sfx.coin(); haptic(20);
    $$('[data-res],[data-res2],[data-go]', el).forEach((e, i) => { e.style.transition = `opacity .6s ${i * .15}s`; e.style.opacity = 1; });
    await UI.waitTap('[data-go]');
  },

  async inningsBreak(side) {
    const m = this.m;
    const sc = side === 'us' ? m.us : m.them;
    const name = side === 'us' ? m.my.name : m.opp.name;
    UI.show(`<div class="screen sim">
      <div class="tiny">Innings break</div>
      <div class="display" style="font-size:34px;margin-top:10px">${esc(name)}</div>
      <div class="ticker" style="margin-top:6px"><span data-t>0</span><small>/${sc.w}</small></div>
      <div class="muted">${oversStr(sc.b)} overs</div>
      <div class="card" style="margin-top:24px;max-width:320px"><b class="cond gold">Target: ${sc.r + 1}</b><div class="small muted" style="margin-top:4px">${side === 'us' ? `${esc(m.opp.name)} need ${sc.r + 1} to win.` : `You need ${sc.r + 1} to win.`}</div></div>
      <button class="btn primary" style="margin-top:22px" data-go>Next innings</button></div>`);
    tweenNum($('[data-t]'), 0, sc.r, 1200);
    await UI.waitTap('[data-go]');
  },

  // Key moment intro card
  async momentIntro(title, desc, tag = 'KEY MOMENT') {
    Sfx.rise(); haptic(30);
    UI.show(`<div class="screen chapter" style="background:radial-gradient(circle at 50% 40%, #3b0d1a, #05060a 70%)">
      <div class="tiny" style="color:var(--red);letter-spacing:.5em;animation:pulse 1.2s infinite">● ${tag}</div>
      <div class="name" style="margin-top:14px">${esc(title)}</div>
      <div class="bar"></div>
      <div class="sub" style="color:#e9dccb;font-size:15px">${desc}</div>
      <button class="btn primary" style="margin-top:28px;animation:rise .6s 1.2s both" data-go>Take guard</button></div>`);
    await UI.waitTap('[data-go]');
  },

  openMomentScreen(view, opts) {
    const m = this.m;
    const el = UI.show(`<div class="screen match-screen"><div class="mroot" style="position:absolute;inset:0"></div>
      <div class="m-hud"><div class="scorebug" style="--c1:${view === 'bat' ? m.my.c1 : m.opp.c2}"><div class="tm" data-tm></div><div class="sc" data-sc></div><div class="ov" data-ov></div><div class="need" data-need></div></div>
      <div class="m-brief"><div class="bt" data-bt></div><div data-bd class="small"></div></div></div></div>`, 'fast');
    Moments.open($('.mroot', el), Object.assign({ view, level: m.level, whiteBall: m.fmt !== FORMAT.FC, myKit: m.my.c1, batKit: view === 'bat' ? lighten(m.my.c1) : lighten(m.opp.c2), bowlKit: view === 'bat' ? lighten(m.opp.c2) : lighten(m.my.c1) }, opts));
    return el;
  },
  hud(el, side, title, desc) {
    const m = this.m, sc = m[side];
    $('[data-tm]', el).textContent = side === 'us' ? m.myAbbr : m.oppAbbr;
    $('[data-sc]', el).textContent = `${sc.r}/${sc.w}`;
    $('[data-ov]', el).textContent = oversStr(sc.b) + ' ov';
    const needEl = $('[data-need]', el);
    if (m.target) { const need = m.target - sc.r; needEl.textContent = need > 0 ? `NEED ${need} · ${m.fmt.balls - sc.b} BALLS` : 'WON'; needEl.style.display = ''; }
    else needEl.style.display = 'none';
    $('[data-bt]', el).textContent = title; $('[data-bd]', el).innerHTML = desc;
  },

  // Fast simulated chunk, shown as a ticker
  async simScreen(title, lines, side, before, myBalls) {
    const m = this.m, sc = m[side];
    const el = UI.show(`<div class="screen sim">
      <div class="tiny">${esc(title)}</div>
      <div class="ticker" style="margin-top:14px"><span data-r>${before.r}</span><small>/<span data-w>${before.w}</span></small></div>
      <div class="muted cond" data-ov>${oversStr(before.b)} overs</div>
      <div class="ball-strip">${myBalls.slice(-18).map((b, i) => `<div class="bb ${b === 4 ? 'b4' : b === 6 ? 'b6' : b === 'W' ? 'bW' : ''}" style="animation-delay:${.2 + i * .07}s">${b === 0 ? '•' : b}</div>`).join('')}</div>
      <div style="margin-top:18px;max-width:330px">${lines.map((l, i) => `<div class="small" style="opacity:0;animation:rise .5s ${.4 + i * .35}s both;margin:4px 0;color:#e4dbe9">${l}</div>`).join('')}</div>
      <button class="btn ghost" style="margin-top:24px;animation:rise .5s ${.6 + lines.length * .35}s both" data-go>Continue</button></div>`);
    tweenNum($('[data-r]', el), before.r, sc.r, 1400);
    tweenNum($('[data-w]', el), before.w, sc.w, 1400);
    const ovEl = $('[data-ov]', el); tweenNum(ovEl, before.b, sc.b, 1400, v => oversStr(Math.round(v)) + ' overs');
    await UI.waitTap('[data-go]');
  },

  // ---------- Simulation helpers ----------
  myBatSkill(type) { const k = Game.s.skills; return Game.batRating() * .6 + (type === 'spin' ? k.vsSpin : k.vsPace) * .4; },

  // one simulated ball for you batting
  simMyBall(allowOut) {
    const m = this.m, f = m.fmt;
    const skill = this.myBatSkill(m.opp.bowlerType) + Game.readiness() * 100;
    const edge = (skill - m.opp.str) / 100;
    if (allowOut && Math.random() < f.outP * clamp(1 - edge * 1.6, .4, 2.2)) return 'W';
    const sr = f.sr * clamp(1 + edge * .8 + (Game.s.skills.power - 40) / 250, .55, 1.6);
    const mean = sr / 100;
    const r = Math.random();
    const p6 = mean * (f === FORMAT.T20 ? .055 : .02) * (Game.s.skills.power / 50), p4 = mean * .1;
    if (r < p6) return 6; if (r < p6 + p4) return 4;
    const r2 = Math.random();
    if (r2 < mean * .45) return 1; if (r2 < mean * .55) return 2; return 0;
  },
  // team (non-you) ball
  simTeamBall(side) {
    const m = this.m, f = m.fmt;
    const str = side === 'us' ? m.opp.str + rand(-3, 3) : m.opp.str;
    const vs = side === 'us' ? m.opp.str : m.opp.str - 2;
    const rr = m.par / f.balls * clamp(1 + (str - vs) / 120, .7, 1.3) * (m.target && side === 'them' ? 1.03 : 1);
    if (Math.random() < f.outP * 1.15) return 'W';
    const r = Math.random();
    if (r < rr * .05) return 6; if (r < rr * .14) return 4;
    if (r < rr * .14 + rr * .5) return 1; if (r < rr * .14 + rr * .58) return 2; return 0;
  },

  // ---------- Batting innings (you bat) ----------
  async battingInnings() {
    const m = this.m, f = m.fmt, s = Game.s;
    const isAll = s.role === 'all';
    const B = f.balls;
    // situation you walk in at
    const entry = f === FORMAT.FC ? (isAll ? 260 : 60) : Math.round(B * (isAll ? .52 : .12));
    const entryW = isAll ? 4 : 1;
    m.us.b = entry; m.us.w = entryW; m.us.r = Math.round(m.par / B * entry * rand(.85, 1.1));
    m.bat.played = true;
    const nMoments = isAll ? 2 : 3;
    const finalStart = f === FORMAT.FC ? null : B - (m.target ? 6 : 6);
    const span = f === FORMAT.FC ? (isAll ? 120 : 220) : finalStart - entry;
    const chunk = Math.max(6, Math.floor(span / nMoments));
    const balls = [];

    for (let i = 0; i < nMoments; i++) {
      if (m.bat.out || this.chaseDone('us')) break;
      // simulated chunk (no dismissal before key moments; your fate is in your hands)
      const before = { ...m.us }; const lines = [];
      const want = i === nMoments - 1 && f !== FORMAT.FC ? Math.max(0, finalStart - m.us.b) : chunk - (i === 0 ? 0 : 3);
      const pre = m.bat.r;
      this.runChunk(want, false, balls, i === nMoments - 1 && m.target ? this.steerTarget() : null);
      if (m.bat.r - pre > 0 || want) lines.push(`You: <b>${m.bat.r}*</b> (${m.bat.b}) · ${m.bat.fours}×4 ${m.bat.sixes}×6`);
      if (m.us.w > before.w) lines.push(`${m.us.w - before.w} wicket${m.us.w - before.w > 1 ? 's' : ''} fell at the other end.`);
      if (want > 0) await this.simScreen(i === 0 ? 'You walk out to bat' : 'The innings rolls on', lines, 'us', before, balls);
      if (this.chaseDone('us') || m.us.w >= 10) break;
      // the key moment
      await this.batMoment(i, nMoments);
    }
    if (!m.bat.out && !this.chaseDone('us') && m.us.w < 10) {
      // remaining balls: simulated with dismissal possible
      const left = f === FORMAT.FC ? randi(10, 50) : B - m.us.b;
      if (left > 0) {
        const before = { ...m.us }; const pre = m.bat.r;
        this.runChunk(left, true, balls);
        const lines = [m.bat.out ? `You fall for <b>${m.bat.r}</b> (${m.bat.b}).` : `You finish <b>${m.bat.r}*</b> (${m.bat.b}).`];
        if (m.target) lines.push(this.chaseDone('us') ? 'Target reached!' : 'Fell short.');
        await this.simScreen(f === FORMAT.FC ? 'The tail wags, then folds' : 'The final overs', lines, 'us', before, balls);
      }
    } else if (m.bat.out && !this.chaseDone('us')) {
      // rest of the team without you
      const before = { ...m.us };
      this.runTeamOnly('us');
      await this.simScreen('The rest of the innings', [`You made <b>${m.bat.r}</b> (${m.bat.b}).`, `${esc(m.my.name)} finish on ${m.us.r}/${m.us.w}.`], 'us', before, balls);
    }
  },

  // In a chase, nudge the team score before the final over so the finish is dramatic but earned
  steerTarget() {
    const m = this.m;
    const perf = (m.bat.r / Math.max(1, m.bat.b)) * 100 - m.fmt.sr;
    return clamp(Math.round(rand(6, 15) - perf / 18 + (m.opp.str - (Game.overall() + 15)) / 6), 3, 22);
  },

  runChunk(n, allowOut, strip, steerNeed) {
    const m = this.m, f = m.fmt;
    for (let k = 0; k < n; k++) {
      if (m.us.w >= 10 || this.chaseDone('us')) break;
      if (f !== FORMAT.FC && m.us.b >= f.balls) break;
      const mine = Math.random() < .55;
      if (mine) {
        const r = this.simMyBall(allowOut);
        m.bat.b++; m.us.b++;
        if (r === 'W') { m.bat.out = true; m.bat.how = pick(['c Cover b ' + m.opp.bowler, 'b ' + m.opp.bowler, 'lbw b ' + m.opp.bowler, 'c Keeper b ' + m.opp.bowler]); m.us.w++; strip.push('W'); break; }
        m.bat.r += r; m.us.r += r; if (r === 4) m.bat.fours++; if (r === 6) m.bat.sixes++; strip.push(r);
      } else {
        const r = this.simTeamBall('us'); m.us.b++;
        if (r === 'W') { if (m.us.w < 9) m.us.w++; } else m.us.r += r;
      }
    }
    if (steerNeed != null && m.target) { // set up the last-over equation
      const need = steerNeed;
      m.us.r = Math.max(m.us.r, 0); m.us.r = m.target - need;
      m.us.b = m.fmt.balls - 6;
      m.us.w = Math.min(m.us.w, 8);
    }
  },
  runTeamOnly(side) {
    const m = this.m, f = m.fmt, sc = m[side];
    let guard = 0;
    while (sc.w < 10 && sc.b < f.balls && guard++ < 1000) {
      if (m.target && sc.r >= m.target) break;
      const r = this.simTeamBall(side); sc.b++;
      if (r === 'W') sc.w++; else sc.r += r;
      if (f === FORMAT.FC && sc.w >= 10) break;
    }
  },
  chaseDone(side) { const m = this.m; return m.target && m[side].r >= m.target; },

  async batMoment(i, n) {
    const m = this.m, f = m.fmt, s = Game.s;
    const last = i === n - 1;
    const bowlerType = i === 1 && m.opp.bowlerType === 'pace' && Math.random() < .5 ? 'spin' : m.opp.bowlerType;
    const bowlerName = bowlerType === m.opp.bowlerType ? m.opp.bowler : 'the leg-spinner';
    let title, desc, balls, goal;
    const ms = f === FORMAT.T20 ? (m.bat.r >= 40 && m.bat.r < 50 ? 50 : null) : (m.bat.r >= 85 && m.bat.r < 100 ? 100 : m.bat.r >= 42 && m.bat.r < 50 ? 50 : null);
    if (last && m.target && f !== FORMAT.FC) {
      const need = m.target - m.us.r;
      title = `${need} off 6`; desc = `Last over. ${esc(bowlerName)} has the ball. The whole ground is on its feet. <b class="gold">Win it.</b>`;
      balls = 6; goal = { type: 'chase' };
    } else if (ms) {
      title = `Nervous ${ms === 100 ? 'Nineties' : 'Forties'}`; desc = `You're on <b>${m.bat.r}</b>. ${ms - m.bat.r} away from a ${ms === 100 ? 'hundred' : 'fifty'}. ${esc(bowlerName)} knows it too.`;
      balls = 3; goal = { type: 'milestone', at: ms };
    } else if (i === 0) {
      title = f === FORMAT.FC ? 'The New Ball' : bowlerType === 'spin' ? 'Spin Trap' : 'Welcome Spell';
      desc = `${esc(bowlerName)} ${bowlerType === 'spin' ? 'is turning it square. Fielders around the bat.' : 'is steaming in. First real test of your technique.'} <b class="gold">Survive 3 balls.</b>`;
      balls = 3; goal = { type: 'survive' };
    } else if (last && f !== FORMAT.FC) {
      title = 'Death Overs'; desc = `Three balls to launch. <b class="gold">Get 8 or more.</b> Every run is a selector's note.`;
      balls = 3; goal = { type: 'runs', n: 8 };
    } else {
      title = f === FORMAT.FC ? 'Last Session' : 'Pressure Builds';
      desc = f === FORMAT.FC ? `Fading light, ${esc(bowlerName)} smelling a collapse. <b class="gold">Survive 3 balls.</b>` : `Dot balls piling up. The required rate is climbing. <b class="gold">Get 5 or more off 3.</b>`;
      balls = 3; goal = f === FORMAT.FC ? { type: 'survive' } : { type: 'runs', n: 5 };
    }
    m.goalTotal++;
    await this.momentIntro(title, desc);
    const stakes = goal.type === 'chase' ? clamp((m.target - m.us.r) / 14, .3, 1) : goal.type === 'milestone' ? .6 : .35;
    const pressure = clamp(stakes * (1.25 - s.cond.confidence / 100) * (1 - s.skills.temperament / 220) + m.level * .04, 0, 1);
    const el = this.openMomentScreen('bat', { bowlerType, pressure });
    UI.pressure(pressure > .45);
    const skill = this.myBatSkill(bowlerType);
    const readSkill = (bowlerType === 'spin' ? s.skills.vsSpin : s.skills.vsPace) * .6 + s.skills.iq * .25 + s.cond.focus * .15;
    const bowlSkill = m.opp.str + 6;
    const ctx = {
      batSkill: skill, bowlSkill, ready: Game.readiness(),
      window: clamp(.045 + skill / 100 * .06 + Game.readiness() * .1 - pressure * .02, .04, .12),
      readFrac: clamp(.95 - readSkill / 100 * 1.15, .05, .9),
      slow: clamp(1 + (s.cond.focus - 40) / 220 + s.skills.temperament / 500, 1, 1.4),
    };
    // Nerves make the sweet spot dance: poor form, low confidence, tiredness and big moments
    const nerves = clamp((62 - s.cond.form) / 55 + (58 - s.cond.confidence) / 75 + pressure * .9 + Math.max(0, s.cond.fatigue - 40) / 120 - s.skills.temperament / 250, 0, 1.6);
    ctx.wobble = ctx.window * (.45 + nerves * 1.5);
    ctx.wobbleF = 5 + nerves * 9;
    let got = 0, legal = 0, startRuns = m.bat.r;
    while (legal < balls) {
      const need = m.target ? m.target - m.us.r : null;
      const ballTxt = `Ball ${legal + 1} of ${balls}`;
      const goalTxt = goal.type === 'chase' ? `Need <b>${need}</b> off ${balls - legal}` : goal.type === 'runs' ? `${got}/${goal.n} runs` : goal.type === 'milestone' ? `On <b>${m.bat.r}</b>` : 'Survive';
      this.hud(el, 'us', title, `${ballTxt} · ${goalTxt} · <span class="muted">${esc(bowlerName)}</span>`);
      const del = genDelivery(bowlerType, m.level, bowlSkill);
      const res = await Moments.batBall(del, ctx);
      if (res.extra === 'wide') { m.us.r += 1; got += 0; }
      else {
        legal++; m.bat.b++; m.us.b++;
        m.bat.r += res.runs; m.us.r += res.runs; got += res.runs;
        if (res.runs === 4) m.bat.fours++; if (res.runs === 6) m.bat.sixes++;
        if (res.out) { m.bat.out = true; m.bat.how = res.how; m.us.w++; }
      }
      // in-moment confidence swings
      if (res.out) Game.apply({ confidence: -6 }); else if (res.runs >= 4) Game.apply({ confidence: 3 });
      if (m.bat.out || this.chaseDone('us')) break;
      await sleep(250);
    }
    UI.pressure(false);
    let ok = false;
    if (goal.type === 'chase') ok = this.chaseDone('us');
    else if (goal.type === 'survive') ok = !m.bat.out;
    else if (goal.type === 'runs') ok = got >= goal.n;
    else if (goal.type === 'milestone') ok = m.bat.r >= goal.at;
    if (ok) m.goals++;
    this.hud(el, 'us', title, ok ? '<b class="green">Moment won.</b>' : '<b class="red">Moment lost.</b>');
    if (goal.type === 'milestone' && ok) { await sleep(400); Moments.showCall(goal.at === 100 ? 'HUNDRED!' : 'FIFTY!', 'call-six', 'Bat raised. Helmet off. Look at the sky.'); Burst.confetti(160); Sfx.cheer(1.3); }
    await sleep(goal.type === 'chase' && ok ? 1800 : 900);
    if (goal.type === 'chase' && ok) { Moments.showCall('WON IT!', 'call-six', `${esc(Game.first)} finishes it!`); Burst.confetti(200); Sfx.cheer(1.5); haptic(200); await sleep(2200); }
    Moments.close();
  },

  // ---------- Bowling spell (you bowl) ----------
  async bowlingSpell() {
    const m = this.m, f = m.fmt, s = Game.s;
    const B = f.balls;
    const quota = f === FORMAT.T20 ? 24 : f === FORMAT.ODI ? 60 : 108;
    m.bowl.played = true;
    const chase = !!m.target;
    const nMoments = s.role === 'all' ? 2 : 3;
    const finalOver = f !== FORMAT.FC;
    const before0 = { ...m.them };
    // Opposition innings is simulated in segments around your key moments.
    const segs = nMoments;
    const strip = [];
    for (let i = 0; i < segs; i++) {
      const last = i === segs - 1;
      const before = { ...m.them };
      const segBalls = last && finalOver ? Math.max(0, B - 6 - m.them.b) : Math.floor((f === FORMAT.FC ? 300 : B - 6) / segs) - (i ? 2 : 0);
      const remaining = quota - m.bowl.b;
      const myShare = last && finalOver ? Math.max(0, remaining - 6) : Math.max(0, Math.min(remaining - (finalOver ? 6 : 0) - 3 * (segs - i), Math.round(quota / segs) - 3));
      this.runOppChunk(segBalls, myShare, strip);
      if (last && chase && finalOver && m.them.r < m.target && m.them.w < 10) {
        // set the last-over equation, shaped by how you've bowled
        const perf = m.bowl.w * 1.5 - (m.bowl.r / Math.max(1, m.bowl.b) * 6 - 8);
        const need = clamp(Math.round(rand(7, 15) + perf + (Game.overall() + 15 - m.opp.str) / 6), 4, 24);
        m.them.r = m.target - need; m.them.b = B - 6; m.them.w = Math.min(m.them.w, 8);
      }
      const lines = [`Your figures: <b>${m.bowl.w}/${m.bowl.r}</b> (${oversStr(m.bowl.b)})`];
      if (m.them.w > before.w) lines.push(`${m.them.w - before.w} wicket${m.them.w - before.w > 1 ? 's' : ''} in this phase.`);
      await this.simScreen(i === 0 ? `${esc(m.opp.name)} are batting` : 'Overs tick by', lines, 'them', before, strip);
      if (m.them.w >= 10 || (chase && m.them.r >= m.target)) break;
      await this.bowlMoment(i, segs, last && finalOver);
      if (m.them.w >= 10 || (chase && m.them.r >= m.target)) break;
    }
    // finish the innings
    if (m.them.w < 10 && !(chase && m.them.r >= m.target) && m.them.b < B) {
      const before = { ...m.them };
      this.runOppChunk(B - m.them.b, 0, strip);
      await this.simScreen('Innings closes', [`Your figures: <b>${m.bowl.w}/${m.bowl.r}</b> (${oversStr(m.bowl.b)})`], 'them', before, strip);
    }
  },

  runOppChunk(n, mine, strip) {
    const m = this.m, f = m.fmt, s = Game.s;
    const myQ = (Game.bowlRating() + Game.readiness() * 100 - m.opp.str) / 100;
    let mineLeft = mine;
    for (let k = 0; k < n; k++) {
      if (m.them.w >= 10 || (m.target && m.them.r >= m.target) || (f !== FORMAT.FC && m.them.b >= f.balls)) break;
      const isMine = mineLeft > 0 && Math.random() < mine / Math.max(1, n - k) + .01;
      m.them.b++;
      if (isMine) {
        mineLeft--; m.bowl.b++;
        if (Math.random() < f.outP * 1.25 * clamp(1 + myQ * 1.8, .4, 2.2)) { m.them.w++; m.bowl.w++; strip.push('W'); continue; }
        const rr = m.par / f.balls * clamp(1 - myQ * .9, .55, 1.6);
        const r = Math.random(); const v = r < rr * .045 ? 6 : r < rr * .13 ? 4 : r < rr * .6 ? 1 : r < rr * .68 ? 2 : 0;
        m.them.r += v; m.bowl.r += v; strip.push(v);
      } else {
        const v = this.simTeamBall('them');
        if (v === 'W') m.them.w++; else m.them.r += v;
      }
    }
  },

  async bowlMoment(i, n, lastOver) {
    const m = this.m, f = m.fmt, s = Game.s;
    const chase = !!m.target;
    let title, desc, balls, goal;
    const star = m.opp.batter;
    if (lastOver && chase) {
      const need = m.target - m.them.r;
      title = `Defend ${need - 1}`; desc = `Last over. ${need} to win for them. ${esc(star)} on strike. The captain tosses you the ball and walks away. <b class="gold">Hold your nerve.</b>`;
      balls = 6; goal = { type: 'defend' };
    } else if (lastOver) {
      title = 'The Death Over'; desc = `${esc(star)} is looking to finish with a flourish. <b class="gold">Concede 8 or fewer in 4 balls.</b>`;
      balls = 4; goal = { type: 'tight', n: 8 };
    } else if (i === 0) {
      title = f === FORMAT.FC ? 'Hunting at the Top' : 'New Ball Duel';
      desc = `${esc(star)} — their best batter. ${s.skills.iq >= 40 ? 'Your video work says something about him.' : ''} <b class="gold">Take a wicket in 3 balls.</b>`;
      balls = 3; goal = { type: 'wicket' };
    } else {
      title = 'Break the Stand'; desc = `A partnership is building. Your captain says one thing: "Wicket." <b class="gold">3 balls.</b>`;
      balls = 3; goal = { type: 'wicket' };
    }
    m.goalTotal++;
    await this.momentIntro(title, desc);
    const stakes = goal.type === 'defend' ? clamp(1.2 - (m.target - m.them.r) / 18, .35, 1) : .4;
    const pressure = clamp(stakes * (1.25 - s.cond.confidence / 100) * (1 - s.skills.temperament / 220) + m.level * .04, 0, 1);
    const el = this.openMomentScreen('bowl', { pressure });
    UI.pressure(pressure > .45);
    const weakList = ['short', 'yorker', 'slower']; const weak = pick(weakList); const strong = pick(['full', 'short'].filter(x => x !== weak));
    let legal = 0, conceded = 0, wk = 0;
    while (legal < balls) {
      const need = chase ? m.target - m.them.r : null;
      const scout = s.skills.iq >= 40 ? ` · <span class="teal">Weak vs ${weak}</span>${s.skills.iq >= 55 ? ` · <span class="red">Loves ${strong}</span>` : ''}` : '';
      const goalTxt = goal.type === 'defend' ? `They need <b>${need}</b> off ${balls - legal}` : goal.type === 'tight' ? `Conceded ${conceded}/${goal.n}` : `Wickets: ${wk}`;
      this.hud(el, 'them', title, `Ball ${legal + 1} of ${balls} · ${goalTxt}<br><span class="muted">${esc(star)}</span>${scout}`);
      const ctx = {
        accuracy: s.skills.accuracy + Game.readiness() * 60, pace: s.skills.pace, variation: s.skills.variation,
        fatigue: s.cond.fatigue, pressure, bowlSkill: Game.bowlRating(), batSkill: m.opp.str + 6, ready: Game.readiness(),
        weak, strong, aggressive: goal.type === 'defend' || goal.type === 'tight', repeat: false,
      };
      const res = await Moments.bowlBall(ctx);
      ctx.repeat = res.plan === m.lastPlan; m.lastPlan = res.plan;
      m.them.r += res.runs; m.bowl.r += res.runs; conceded += res.runs;
      if (!res.extra) { legal++; m.them.b++; m.bowl.b++; }
      if (res.wicket) { m.them.w++; m.bowl.w++; wk++; Game.apply({ confidence: 5 }); }
      if (res.runs >= 4) Game.apply({ confidence: -3 });
      if (m.them.w >= 10 || (chase && m.them.r >= m.target)) break;
      if (goal.type === 'wicket' && wk) break;
      await sleep(200);
    }
    UI.pressure(false);
    let ok = goal.type === 'defend' ? m.them.r < m.target : goal.type === 'tight' ? conceded <= goal.n : wk > 0;
    if (ok) m.goals++;
    this.hud(el, 'them', title, ok ? '<b class="green">Moment won.</b>' : '<b class="red">Moment lost.</b>');
    await sleep(900);
    if (goal.type === 'defend') {
      if (ok) { Moments.showCall('DEFENDED!', 'call-six', 'Ice in the veins.'); Burst.confetti(200); Sfx.cheer(1.5); haptic(200); }
      else { Moments.showCall('LOST IT', 'call-out', 'They got there.'); Sfx.groan(); }
      await sleep(2200);
    }
    Moments.close();
  },

  async simOurInnings() {
    const m = this.m; const before = { ...m.us };
    this.runTeamOnly('us');
    const tail = randi(0, 12);
    await this.simScreen(`${esc(m.my.name)} bat`, [`You come in at No. 10 and scramble <b>${tail}*</b>.`, `${esc(m.my.name)} make ${m.us.r}/${m.us.w}.`], 'us', before, []);
  },
  async simTheirInnings() {
    const m = this.m; const before = { ...m.them };
    this.runTeamOnly('them');
    const fld = Math.random() < .3 + Game.s.skills.fitness / 300;
    if (fld) m.goals += .5;
    await this.simScreen(`${esc(m.opp.name)} bat`, [fld ? 'You take a sharp catch at cover. The crowd notices.' : 'A quiet day in the field at deep mid-wicket.', `${esc(m.opp.name)} make ${m.them.r}/${m.them.w}.`], 'them', before, []);
  },

  // ---------- Result ----------
  async finish() {
    const m = this.m, s = Game.s, f = m.fmt, sd = Game.stageDef;
    const win = m.us.r > m.them.r || (m.target && !m.batFirst && m.us.r >= m.target);
    const tie = m.us.r === m.them.r;
    // rating
    let bat = null, bowl = null;
    if (m.bat.played) {
      const sr = m.bat.b ? m.bat.r / m.bat.b * 100 : 0;
      const k = f === FORMAT.T20 ? [7, 120, 45] : f === FORMAT.ODI ? [11, 85, 60] : [14, 50, 999];
      bat = 3 + m.bat.r / k[0] + (m.bat.b >= 6 ? (sr - k[1]) / k[2] : 0) - (m.bat.out && m.bat.r < 10 ? 1 : 0);
    }
    if (m.bowl.played) {
      const econ = m.bowl.b ? m.bowl.r / m.bowl.b * 6 : 0;
      const k = f === FORMAT.T20 ? [2.3, 8, .45] : f === FORMAT.ODI ? [1.8, 5.5, .5] : [1.4, 3.2, .4];
      bowl = 3 + m.bowl.w * k[0] - (econ - k[1]) * k[2];
    }
    let rating = bat !== null && bowl !== null ? Math.max(bat, bowl) + Math.min(bat, bowl) * .25 - .8 : (bat ?? bowl ?? 4);
    rating += m.goals * .35 + (win ? .6 : -.3);
    rating = Math.round(clamp(rating, 1, 10) * 10) / 10;

    // career stats
    const c = s.career; c.matches++;
    if (m.bat.played) { c.runs += m.bat.r; c.balls += m.bat.b; if (m.bat.out) c.outs++; c.hs = Math.max(c.hs, m.bat.r); if (m.bat.r >= 100) c.hundreds++; else if (m.bat.r >= 50) c.fifties++; }
    const fs = s.fmtStats[m.opp.cat] = s.fmtStats[m.opp.cat] || { m: 0, runs: 0, balls: 0, outs: 0, hs: 0, f: 0, h: 0, wkts: 0, bb: 0, rc: 0, best: '' };
    fs.m++;
    if (m.bat.played) { fs.runs += m.bat.r; fs.balls += m.bat.b; if (m.bat.out) fs.outs++; fs.hs = Math.max(fs.hs, m.bat.r); if (m.bat.r >= 100) fs.h++; else if (m.bat.r >= 50) fs.f++; }
    if (m.bowl.played) { fs.wkts += m.bowl.w; fs.bb += m.bowl.b; fs.rc += m.bowl.r; const [bw, br] = (fs.best || '0/999').split('/').map(Number); if (m.bowl.w > bw || (m.bowl.w === bw && m.bowl.r < br)) fs.best = `${m.bowl.w}/${m.bowl.r}`; }
    if (m.bowl.played) { c.wkts += m.bowl.w; c.ballsBowled += m.bowl.b; c.runsConceded += m.bowl.r; const [bw, br] = (c.best || '0/999').split('/').map(Number); if (m.bowl.w > bw || (m.bowl.w === bw && m.bowl.r < br)) c.best = `${m.bowl.w}/${m.bowl.r}`; }

    // consequences
    const fee = f.fee[m.level] || 0;
    const fx = {
      form: (rating - 5.5) * 6, confidence: (rating - 5.5) * 5, reputation: (rating - 5) * (.9 + m.level * .25),
      fans: Math.round(Math.max(0, rating - 4) * [20, 60, 120, 900, 6000, 30000][m.level] * (win ? 1.2 : .8)),
      coachTrust: (rating - 5.5) * 1.6, fatigue: 16, injury: rand(2, 8) + (m.bowl.played ? 4 : 0), money: fee,
      mental: (rating - 5.5) * 2 + (win ? 2 : -2),
    };
    const chips = Game.apply(fx);
    s.stageRatings.push(rating); s.lastRating = rating;
    const resultLine = tie ? 'Match tied' : win ? `${m.my.name} won` : `${m.opp.name} won`;
    const perfTxt = [m.bat.played ? `${m.bat.r}${m.bat.out ? '' : '*'} (${m.bat.b})` : null, m.bowl.played ? `${m.bowl.w}/${m.bowl.r}` : null].filter(Boolean).join(' & ');
    Game.diary(`vs ${m.opp.name}: ${perfTxt}. ${resultLine}. Rating ${rating}.`);
    if (s.cond.injury >= 88) { s.missNext = true; s.injuries++; s.cond.injury = 55; toast('🦴 Scan shows a stress reaction. You\'ll miss the next game.'); Game.diary('Injured. Out for a match. Third one ends careers.'); }
    Game.save();

    // headline
    const first = Game.first.toUpperCase();
    const hl = rating >= 8.5 ? pick([`${first} FIREWORKS!`, `${first} STUNS ${abbr(m.opp.name)}`, `A STAR IS BORN`]) : rating >= 6.5 ? pick([`${first} STANDS TALL`, `SOLID SHOW FROM ${first}`]) : rating >= 4.5 ? pick([`${first} QUIET IN ${win ? 'WIN' : 'DEFEAT'}`, 'A DAY TO FORGET, ALMOST']) : pick([`${first} FLOPS`, `QUESTIONS OVER ${first}`, `${first} FAILS AGAIN`]);
    const ratingCol = rating >= 7.5 ? 'var(--green)' : rating >= 5 ? 'var(--gold)' : 'var(--red)';
    const circ = 2 * Math.PI * 62;
    const el = UI.show(`<div class="screen"><div class="scroll result">
      <div class="tiny" style="text-align:center">${tie ? 'Tied' : win ? 'Victory' : 'Defeat'}</div>
      <div class="display" style="text-align:center;font-size:44px;margin:4px 0 4px;color:${win ? 'var(--gold)' : 'var(--text)'}">${esc(resultLine)}</div>
      <div class="muted small" style="text-align:center">${esc(m.my.name)} ${m.us.r}/${m.us.w} · ${esc(m.opp.name)} ${m.them.r}/${m.them.w}</div>
      <div class="rating" style="margin-top:18px"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/><circle data-arc cx="70" cy="70" r="62" fill="none" stroke="${ratingCol}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" style="transition:stroke-dashoffset 1.4s var(--ease-out)"/></svg><div style="text-align:center"><b data-rt>0</b><div class="tiny">Match rating</div></div></div>
      <div class="stat-grid" style="margin-top:16px">
        ${m.bat.played ? `<div class="s"><b>${m.bat.r}${m.bat.out ? '' : '*'}</b><span class="tiny">Runs (${m.bat.b})</span></div>` : ''}
        ${m.bowl.played ? `<div class="s"><b>${m.bowl.w}/${m.bowl.r}</b><span class="tiny">${oversStr(m.bowl.b)} ov</span></div>` : ''}
        <div class="s"><b>${Math.floor(m.goals)}/${m.goalTotal}</b><span class="tiny">Moments won</span></div>
      </div>
      <div class="paper"><div class="mast">${PAPERS[m.level]}</div><div class="hl">${hl}</div><div class="sub">${m.bat.played && m.bat.out ? esc(m.bat.how) + '. ' : ''}${esc(resultLine)} at ${esc(sd.venue || 'a packed stadium')}.</div></div>
      <div class="deltas" style="justify-content:center;margin-top:18px">${chipsHtml(chips)}</div>
      <button class="btn primary block" style="margin-top:20px" data-go>Continue</button>
    </div></div>`);
    await sleep(200);
    $('[data-arc]', el).style.strokeDashoffset = circ * (1 - rating / 10);
    tweenNum($('[data-rt]', el), 0, rating, 1400, v => v.toFixed(1));
    if (win) { Sfx.success(); setTimeout(() => Burst.confetti(100), 400); } else Sfx.fail();
    await UI.waitTap('[data-go]');
    return { rating, win };
  },
};

function oversStr(b) { return Math.floor(b / 6) + '.' + (b % 6); }
function abbr(name) { const w = name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean); return (w.length === 1 ? w[0].slice(0, 3) : w.map(x => x[0]).join('').slice(0, 4)).toUpperCase(); }
function lighten(hex) { return hex || '#2ec4b6'; }

// UI shell, screens and the career loop.
const app = document.getElementById('app');

function chipsHtml(chips) {
  return chips.filter(([k]) => STAT_LABELS[k]).map(([k, v], i) => {
    const good = BAD_UP.has(k) ? v < 0 : v > 0;
    const val = k === 'money' ? fmtMoney(v).replace('₹', (v > 0 ? '+₹' : '₹')) : k === 'fans' ? (v > 0 ? '+' : '') + v.toLocaleString('en-IN') : (v > 0 ? '+' : '') + (Math.abs(v) < 10 ? v.toFixed(1).replace('.0', '') : Math.round(v));
    return `<span class="delta ${good ? 'up' : 'down'}" style="animation-delay:${.1 + i * .06}s">${STAT_LABELS[k]} ${val}</span>`;
  }).join('');
}

const UI = {
  cur: null, tab: 'week', backAt: 0,
  show(html, mode) {
    const old = this.cur;
    const wrap = document.createElement('div'); wrap.innerHTML = html.trim();
    const el = wrap.firstElementChild;
    if (mode !== 'fast') el.classList.add('enter');
    app.appendChild(el);
    if (old) { old.classList.add('exit'); setTimeout(() => old.remove(), 360); }
    this.cur = el;
    return el;
  },
  waitTap(sel, root) {
    return new Promise(res => {
      const el = (root || this.cur).querySelector(sel);
      const h = (e) => { e.stopPropagation(); Sfx.tap(); haptic(8); el.removeEventListener('click', h); res(); };
      el.addEventListener('click', h);
    });
  },
  pressure(on) { $('.pressure').classList.toggle('on', !!on); if (on) { this._hb = setInterval(() => Sfx.heartbeat(), 1100); } else clearInterval(this._hb); },
};

// ---------- Title ----------
function cityMarkup() {
  let p = 'M0,92 ';
  const blocks = [[0, 40], [22, 58], [40, 30], [62, 70], [80, 46], [104, 64], [126, 38], [150, 76], [168, 52], [190, 66], [214, 34], [236, 60], [258, 44], [280, 72], [300, 50], [322, 62], [346, 40], [370, 56], [400, 46]];
  blocks.forEach(([x, h]) => { p += `L${x},${92 - h} L${x + 20},${92 - h} `; });
  p += 'L420,92 Z';
  return `<svg class="title-city" viewBox="0 0 400 92" preserveAspectRatio="none"><path d="${p}" fill="#1c0f14"/><rect x="186" y="18" width="4" height="40" fill="#1c0f14"/><circle cx="188" cy="16" r="5" fill="#1c0f14"/></svg>`;
}
function kidMarkup() {
  return `<svg class="title-kid" viewBox="0 0 90 120"><g fill="#120a0d">
    <circle cx="44" cy="18" r="9"/><path d="M36 28 L52 28 L56 66 L50 66 L48 100 L54 118 L46 118 L42 100 L40 118 L32 118 L36 100 L34 66 L30 66 Z"/>
    <path d="M52 34 L70 52 L72 49 L56 30 Z"/><rect x="66" y="40" width="7" height="46" rx="2" transform="rotate(28 70 50)"/></g></svg>`;
}

function titleScreen() {
  Ambient.set('dawn');
  const has = Game.hasSave();
  const letters = (w, d) => w.split('').map((c, i) => `<span class="letter" style="animation-delay:${d + i * .07}s">${c}</span>`).join('');
  const el = UI.show(`<div class="screen title-screen">
    <div class="title-sky"></div><div class="title-sun-rays"></div><div class="title-sun"></div>${cityMarkup()}<div class="title-ground"></div>${kidMarkup()}
    <div class="title-logo"><div class="l1">${letters('GULLY', .3)}</div><div class="l2">— TO —</div><div class="l3">${letters('GLORY', .9)}</div></div>
    <div class="title-tag">A cricket life. From a chai stall to the blue cap.</div>
    <div class="title-actions">
      ${has ? '<button class="btn primary block" data-cont>Continue Career</button>' : ''}
      <button class="btn ${has ? 'ghost' : 'primary'} block" data-new>New Career</button>
      <button class="btn ghost" style="height:40px;font-size:12px;align-self:center" data-snd>${Sfx.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
    </div></div>`);
  el.addEventListener('pointerdown', () => Sfx.init(), { once: true });
  $('[data-new]', el).onclick = () => { Sfx.init(); Sfx.select(); if (has) { if (!confirm('Start a new career? Your current career will be lost.')) return; Game.wipe(); } createScreen(); };
  if (has) $('[data-cont]', el).onclick = () => { Sfx.init(); Sfx.select(); Game.load(); hub(); };
  $('[data-snd]', el).onclick = (e) => { Sfx.init(); Sfx.setMuted(!Sfx.muted); try { localStorage.setItem('gg_muted', Sfx.muted ? '1' : ''); } catch (er) {} e.target.textContent = Sfx.muted ? '🔇 Sound off' : '🔊 Sound on'; };
}

// ---------- Create ----------
function createScreen() {
  let role = 'bat';
  const el = UI.show(`<div class="screen create"><div class="scroll pad stagger">
    <div class="tiny" style="margin-top:20px">New career</div>
    <h1>Who are you,<br>kid?</h1>
    <div style="margin-top:22px"><div class="tiny" style="margin-bottom:6px">Your name</div><input class="field" maxlength="22" placeholder="e.g. Arjun Yadav" data-name></div>
    <div class="tiny" style="margin:22px 0 8px">Your game</div>
    <div class="role-grid">
      <button class="role sel" data-role="bat"><div class="ic">🏏</div><div><h3>Batter</h3><div class="small muted">Technique, timing, nerve. Every key moment is a ball you face.</div></div></button>
      <button class="role" data-role="bowl"><div class="ic">🎯</div><div><h3>Fast Bowler</h3><div class="small muted">Pace, line, variations. You pick the delivery and hit the spot.</div></div></button>
      <button class="role" data-role="all"><div class="ic">⚡</div><div><h3>All-Rounder</h3><div class="small muted">Bat and bowl. Twice the moments, twice the pressure.</div></div></button>
    </div>
    <button class="btn primary block" style="margin:24px 0 30px" data-go>Begin the journey</button>
  </div></div>`);
  $$('.role', el).forEach(b => b.onclick = () => { role = b.dataset.role; $$('.role', el).forEach(x => x.classList.toggle('sel', x === b)); Sfx.select(); haptic(10); });
  $('[data-go]', el).onclick = () => {
    const name = ($('[data-name]', el).value || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2) { $('[data-name]', el).focus(); toast('Every legend needs a name.'); return; }
    Sfx.select(); Game.newCareer(name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), role);
    introCinematic();
  };
}

// ---------- Cinematic ----------
async function cinematic(lines, art) {
  const el = UI.show(`<div class="screen cine">${art || ''}<div class="cine-text"></div><button class="btn ghost cine-skip" style="height:36px;font-size:11px;padding:0 12px" data-skip>Skip</button><div class="cine-tap tiny">Tap to continue</div></div>`);
  let skip = false;
  $('[data-skip]', el).onclick = (e) => { e.stopPropagation(); skip = true; el.click(); };
  const box = $('.cine-text', el);
  for (const line of lines) {
    if (skip) break;
    box.innerHTML = `<div class="cine-line">${kinetic(line, .1, .07)}</div>`;
    Sfx.whoosh();
    await new Promise(r => { const h = () => { el.removeEventListener('click', h); r(); }; setTimeout(() => el.addEventListener('click', h), 350); });
  }
}

function sceneArt() {
  // layered parallax: dawn sky, town, chai stall with steam
  return `<div class="cine-layer" style="background:linear-gradient(180deg,#0b0820 0%,#2a1540 45%,#7a2e3a 70%,#d9733a 85%,#1a0e08 86%)"></div>
  <div class="cine-layer" style="opacity:.9;animation:drift 18s ease-in-out infinite alternate">${cityMarkup().replace('title-city', 'cine-city" style="position:absolute;left:-5%;width:110%;top:62%;height:24%')}</div>
  <svg class="cine-layer" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" style="animation:drift2 14s ease-in-out infinite alternate">
    <g transform="translate(40,560)" fill="#0d0709">
      <rect x="0" y="40" width="150" height="90"/><path d="M-12 44 L162 44 L140 10 L10 10 Z" fill="#3a1a14"/>
      <rect x="20" y="62" width="40" height="24" fill="#f6b25a" opacity=".85"/><rect x="90" y="62" width="40" height="24" fill="#f6b25a" opacity=".55"/>
      <text x="75" y="33" text-anchor="middle" fill="#ffd166" font-family="Bebas" font-size="18" letter-spacing="2">SATISH TEA STALL</text>
    </g>
    <g fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linecap="round">
      <path d="M80 590 q-8 -14 0 -28 q8 -14 0 -28"><animate attributeName="opacity" values=".7;0;.7" dur="3s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -24" dur="3s" repeatCount="indefinite"/></path>
      <path d="M96 594 q-8 -14 0 -28 q8 -14 0 -28"><animate attributeName="opacity" values="0;.6;0" dur="3.5s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -28" dur="3.5s" repeatCount="indefinite"/></path>
    </g>
  </svg>
  <style>@keyframes drift{to{transform:translateX(-14px)}}@keyframes drift2{to{transform:translateX(10px) scale(1.03)}}</style>`;
}

async function introCinematic() {
  const f = Game.first;
  await cinematic([
    'Rajgarh, Uttar Pradesh.',
    'Population: 2 lakh. Cricket grounds: one. Shared with three goats and a wedding tent.',
    `Your name is ${esc(f)}. Your father runs a tea stall at the bus stand.`,
    'You learned to bat with a plank of wood, a tennis ball, and a wall that still has the marks.',
    'Everyone says it\'s impossible.',
    'Good.',
  ], sceneArt());
  await chapterCard();
  hub();
}

async function chapterCard() {
  const sd = Game.stageDef;
  Ambient.set(sd.ambient);
  const el = UI.show(`<div class="screen chapter">
    <div class="num">${sd.ch}</div>
    <div class="tiny kicker" style="letter-spacing:.5em">Chapter</div>
    <div class="name">${sd.title}</div>
    <div class="bar"></div>
    <div class="sub">${sd.sub}</div>
    <div class="cine-tap tiny">Tap to continue</div></div>`);
  Sfx.stinger(); haptic(40);
  await new Promise(r => setTimeout(() => el.addEventListener('click', r, { once: true }), 900));
}

// ---------- HUB ----------
function ring(label, val, col, bad) {
  const r = 22, c = 2 * Math.PI * r;
  const shown = Math.round(val);
  return `<div class="ring"><div class="wrap"><svg viewBox="0 0 54 54"><circle class="track" cx="27" cy="27" r="${r}" fill="none" stroke-width="5"/><circle class="val" cx="27" cy="27" r="${r}" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - val / 100)}"/></svg><span class="num" style="color:${bad && val > 65 ? 'var(--red)' : 'var(--text)'}">${shown}</span></div><span class="lbl">${label}</span></div>`;
}

function hub() {
  const s = Game.s, sd = Game.stageDef;
  Ambient.set(sd.ambient);
  const el = UI.show(`<div class="screen hub">
    <div class="hub-head">
      <div class="row between">
        <div class="row"><div class="avatar">${esc(s.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</div>
          <div class="col"><b class="cond" style="font-size:17px">${esc(s.name)}</b><span class="tiny">Age ${s.age} · ${{ bat: 'Batter', bowl: 'Fast Bowler', all: 'All-Rounder' }[s.role]} · OVR ${Math.round(Game.overall())}</span></div></div>
        <div class="col" style="align-items:flex-end"><span class="money ${s.life.money < 0 ? 'red' : 'gold'}">${fmtMoney(s.life.money)}</span><span class="tiny">${s.life.fans.toLocaleString('en-IN')} fans</span></div>
      </div>
    </div>
    <div class="scroll" data-body style="padding:0 16px 16px"></div>
    <div class="tabs">
      ${[['week', '📅', 'Week'], ['player', '🏏', 'Player'], ['life', '🏠', 'Life'], ['diary', '📓', 'Diary']].map(([id, ic, l]) => `<button class="tab ${UI.tab === id ? 'on' : ''}" data-tab="${id}"><span class="ti">${ic}</span>${l}</button>`).join('')}
    </div></div>`);
  $$('[data-tab]', el).forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; Sfx.tap(); $$('[data-tab]', el).forEach(x => x.classList.toggle('on', x === b)); renderTab(el); });
  renderTab(el);
}

function renderTab(el) {
  const body = $('[data-body]', el);
  const t = UI.tab;
  body.innerHTML = t === 'week' ? weekTab() : t === 'player' ? playerTab() : t === 'life' ? lifeTab() : diaryTab();
  body.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.ring .val', body).forEach(c => c.style.strokeDashoffset = c.dataset.off);
    $$('.bf', body).forEach(b => b.style.width = b.dataset.w + '%');
  }));
  if (t === 'week') bindWeek(el, body);
}

function weekTab() {
  const s = Game.s, sd = Game.stageDef, c = s.cond;
  const sched = sd.schedule;
  const matchNow = Game.isMatchWeek();
  let nextM = -1; for (let i = s.week - 1; i < sched.length; i++) if (sched[i] === 'M') { nextM = i; break; }
  const mi = sched.slice(0, nextM + 1).split('M').length - 2;
  const opps = Game.currentOpps();
  const opp = nextM >= 0 ? opps[mi % opps.length] : null;
  const tip = c.fatigue > 70 ? '😮‍💨 You\'re exhausted. Training now gives less and risks injury.' : c.injury > 60 ? '🩹 Your body is screaming. A physio or rest day would help.' : s.life.mental < 30 ? '🌧️ Your head is not in a good place. Family, yoga or a psych session help.' : s.life.money < 0 ? '💸 You\'re broke. Work shifts or a sponsor shoot can help.' : matchNow ? '🔥 Match at the end of this week. Arrive fresh and focused.' : '💡 Training is better when you\'re not tired. Balance work and rest.';
  const slotsNames = ['Morning', 'Afternoon', 'Evening'];
  return `<div class="stagger">
    <div class="row between" style="margin:2px 0 12px">
      <div class="week-pill"><b>WEEK ${s.week}</b><span class="tiny">of ${sched.length} · Ch.${sd.ch} ${sd.title}</span></div>
      <span class="chip">${sd.format === 'FC' ? 'Ranji' : sd.format}</span>
    </div>
    <div class="rings">${ring('Form', c.form, 'var(--gold)')}${ring('Confid.', c.confidence, 'var(--saffron)')}${ring('Focus', c.focus, 'var(--teal)')}${ring('Fatigue', c.fatigue, 'var(--violet)', true)}${ring('Injury', c.injury, 'var(--red)', true)}</div>
    <div class="card fixture ${matchNow ? 'today' : ''}" style="margin-top:14px">
      ${opp ? `<div class="tiny" style="color:rgba(255,255,255,.75)">${matchNow ? (s.missNext ? '🩹 Match day — you\'re injured' : '🔥 Match day this week') : `Next match in ${nextM - s.week + 1} week${nextM - s.week + 1 > 1 ? 's' : ''}`}</div>
      <div class="vs" style="margin-top:4px">vs ${esc(opp.name)}</div>
      <div class="small muted" style="margin-top:2px">Watch out: ${esc(opp.bowler)} (${opp.bowlerType}) · ${esc(opp.batter)}</div>`
      : `<div class="tiny">Coming up</div><div class="vs" style="margin-top:4px">${esc(sd.gate.name)}</div><div class="small muted">Selectors decide at the end of this week.</div>`}
    </div>
    <div class="row between" style="margin:18px 0 8px"><span class="tiny">Plan your week</span><span class="tiny" data-cnt></span></div>
    <div class="slots">${slotsNames.map((n, i) => { const a = ACTIONS.find(x => x.id === s.plan[i]); return `<button class="slot ${a ? 'filled' : 'empty'}" data-slot="${i}"><span class="when tiny">${n}</span><span class="em">${a ? a.em : '＋'}</span><span class="nm">${a ? a.name : 'Choose'}</span></button>`; }).join('')}</div>
    <div class="small muted" style="margin:12px 2px 0">${tip}</div>
    <button class="btn primary block" style="margin-top:16px" data-lock ${s.plan.every(Boolean) ? '' : 'disabled'}>${matchNow ? 'Lock in · Go to match' : 'Lock in week'}</button>
    <button class="btn ghost block" style="margin-top:8px;height:44px;font-size:13px" data-menu>Menu</button>
  </div>`;
}

function bars(list, cls = '') {
  return `<div class="bars">${list.map(([k, v, c]) => `<div class="b"><div class="bl"><span>${STAT_LABELS[k] || k}</span><b>${Math.round(v)}</b></div><div class="bt"><div class="bf ${c || cls}" data-w="${clamp(v, 0, 100)}"></div></div></div>`).join('')}</div>`;
}

function playerTab() {
  const s = Game.s, k = s.skills, c = s.career;
  const avg = c.outs ? (c.runs / c.outs).toFixed(1) : (c.runs || '-');
  const sr = c.balls ? (c.runs / c.balls * 100).toFixed(0) : '-';
  const econ = c.ballsBowled ? (c.runsConceded / c.ballsBowled * 6).toFixed(2) : '-';
  const batGroup = [['technique', k.technique], ['power', k.power], ['vsPace', k.vsPace], ['vsSpin', k.vsSpin], ['temperament', k.temperament]];
  const bowlGroup = [['pace', k.pace, 'teal'], ['accuracy', k.accuracy, 'teal'], ['variation', k.variation, 'teal']];
  const phys = [['fitness', k.fitness, 'violet'], ['iq', k.iq, 'violet']];
  const sections = s.role === 'bowl' ? [['Bowling', bowlGroup], ['Body & Mind', phys], ['Batting', batGroup]] : s.role === 'bat' ? [['Batting', batGroup], ['Body & Mind', phys], ['Bowling', bowlGroup]] : [['Batting', batGroup], ['Bowling', bowlGroup], ['Body & Mind', phys]];
  return `<div class="stagger">
    <div class="card" style="text-align:center;background:linear-gradient(135deg,rgba(255,159,28,.18),rgba(139,92,246,.1))">
      <div class="tiny">Overall</div><div class="display" style="font-size:86px;color:var(--gold)">${Math.round(Game.overall())}</div>
      <div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap"><span class="chip">Bat ${Math.round(Game.batRating())}</span><span class="chip">Bowl ${Math.round(Game.bowlRating())}</span><span class="chip">Readiness ${Game.readiness() >= 0 ? '+' : ''}${Math.round(Game.readiness() * 100)}</span></div>
    </div>
    <div class="stat-grid" style="margin-top:12px">
      <div class="s"><b>${c.matches}</b><span class="tiny">Matches</span></div>
      <div class="s"><b>${c.runs}</b><span class="tiny">Runs</span></div>
      <div class="s"><b>${avg}</b><span class="tiny">Average</span></div>
      <div class="s"><b>${sr}</b><span class="tiny">Strike rate</span></div>
      <div class="s"><b>${c.hs}</b><span class="tiny">High score</span></div>
      <div class="s"><b>${c.fifties}/${c.hundreds}</b><span class="tiny">50s / 100s</span></div>
      <div class="s"><b>${c.wkts}</b><span class="tiny">Wickets</span></div>
      <div class="s"><b>${econ}</b><span class="tiny">Economy</span></div>
      <div class="s"><b>${c.best || '-'}</b><span class="tiny">Best</span></div>
    </div>
    ${sections.map(([t, l]) => `<div class="card" style="margin-top:12px"><div class="tiny">${t}</div>${bars(l)}</div>`).join('')}
  </div>`;
}

function lifeTab() {
  const s = Game.s, l = s.life;
  const ipl = s.ipl ? TEAMS_IPL.find(t => t.id === s.ipl) : null;
  return `<div class="stagger">
    <div class="stat-grid" style="grid-template-columns:1fr 1fr">
      <div class="s"><b class="${l.money < 0 ? 'red' : 'gold'}">${fmtMoney(l.money)}</b><span class="tiny">Bank</span></div>
      <div class="s"><b>${l.fans.toLocaleString('en-IN')}</b><span class="tiny">Fans</span></div>
    </div>
    ${l.debt ? `<div class="card" style="margin-top:12px;border-color:rgba(230,57,70,.4)"><b class="red cond">Debt: ${fmtMoney(l.debt)}</b><div class="small muted">Ramesh-ji charges 20% a month. He will come back.</div></div>` : ''}
    ${ipl ? `<div class="card" style="margin-top:12px;background:linear-gradient(120deg,${ipl.c1}55,transparent)"><div class="tiny">IPL contract</div><b class="cond" style="font-size:18px">${esc(ipl.name)} · ${fmtMoney(s.price)}</b></div>` : ''}
    <div class="card" style="margin-top:12px"><div class="tiny">People & Mind</div>${bars([['family', l.family, 'saffron'], ['mental', l.mental, 'teal'], ['coachTrust', l.coachTrust], ['reputation', l.reputation, 'violet'], ['integrity', l.integrity, l.integrity < 40 ? 'red' : 'teal']])}</div>
    <div class="card" style="margin-top:12px"><div class="tiny">How it all connects</div><div class="small muted" style="margin-top:6px;line-height:1.6">
      <b class="saffron">Form, Confidence, Focus</b> widen your timing window and help you read the ball earlier.<br>
      <b class="red">Fatigue & Injury</b> shrink training gains and drag your match-day readiness.<br>
      <b class="teal">Family</b> keeps your mental health up. <b class="violet">Reputation & Coach Trust</b> sway selectors.<br>
      <b>Integrity</b>... you'll find out.</div></div>
  </div>`;
}

function diaryTab() {
  const s = Game.s;
  return `<div class="diary"><div class="display" style="font-size:34px;margin:4px 0 8px">Diary</div>${s.diary.map(d => `<div class="entry"><div class="wk">W${d.w}</div><div class="small">${esc(d.text)}<div class="tiny" style="margin-top:2px">Age ${d.age}</div></div></div>`).join('')}</div>`;
}

function bindWeek(el, body) {
  $$('[data-slot]', body).forEach(b => b.onclick = () => openActions(+b.dataset.slot, el));
  $('[data-lock]', body).onclick = () => { Sfx.select(); lockWeek(); };
  $('[data-menu]', body).onclick = () => {
    openSheet(`<div class="pad"><div class="display" style="font-size:32px">Menu</div>
      <button class="btn ghost block" style="margin-top:14px" data-snd>${Sfx.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
      <button class="btn ghost block" style="margin-top:8px" data-title>Title screen</button>
      <button class="btn ghost block" style="margin-top:8px;color:var(--red)" data-wipe>Retire (delete career)</button>
      <div class="tiny" style="margin-top:14px;text-align:center">Progress saves automatically</div></div>`, sh => {
      $('[data-snd]', sh).onclick = (e) => { Sfx.setMuted(!Sfx.muted); try { localStorage.setItem('gg_muted', Sfx.muted ? '1' : ''); } catch (er) {} e.target.textContent = Sfx.muted ? '🔇 Sound off' : '🔊 Sound on'; };
      $('[data-title]', sh).onclick = () => { closeSheet(); titleScreen(); };
      $('[data-wipe]', sh).onclick = () => { if (confirm('Delete this career forever?')) { closeSheet(); Game.wipe(); titleScreen(); } };
    });
  };
}

function openSheet(html, bind) {
  closeSheet(true);
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const sh = document.createElement('div'); sh.className = 'sheet';
  sh.innerHTML = `<div class="grab"></div><div class="scroll">${html}</div>`;
  document.body.append(bg, sh);
  requestAnimationFrame(() => { bg.classList.add('on'); sh.classList.add('on'); });
  bg.onclick = () => closeSheet();
  UI.sheet = { bg, sh };
  bind && bind(sh);
}
function closeSheet(instant) {
  if (!UI.sheet) return;
  const { bg, sh } = UI.sheet; UI.sheet = null;
  bg.classList.remove('on'); sh.classList.remove('on');
  setTimeout(() => { bg.remove(); sh.remove(); }, instant ? 0 : 450);
}

function fxSummary(a) {
  const parts = [];
  for (const k in a.fx) {
    const v = a.fx[k]; if (!STAT_LABELS[k]) continue;
    if (typeof v === 'string') { parts.push(`${STAT_LABELS[k]} ↑`); continue; }
    const up = v > 0, good = BAD_UP.has(k) ? !up : up;
    parts.push(`<span style="color:${good ? 'var(--green)' : '#ff6b78'}">${STAT_LABELS[k]} ${up ? '↑' : '↓'}</span>`);
  }
  return parts.slice(0, 4).join(' · ');
}

function openActions(slot, el) {
  const s = Game.s;
  const list = ACTIONS.filter(a => Game.actionAvailable(a));
  openSheet(`<div class="pad" style="padding-top:4px">
    <div class="row between"><div class="display" style="font-size:30px">${['Morning', 'Afternoon', 'Evening'][slot]}</div><span class="money gold">${fmtMoney(s.life.money)}</span></div>
    <div class="acts stagger" style="margin-top:10px">${list.map(a => {
      const cost = Game.actionCost(a);
      const cant = cost && s.life.money < cost;
      return `<button class="act ${cant ? 'locked' : ''}" data-act="${a.id}" ${cant ? 'disabled' : ''}><div class="top"><span class="em">${a.em}</span>${cost ? `<span class="cost">${fmtMoney(cost)}</span>` : ''}</div><span class="nm">${a.name}</span><span class="fx">${a.desc}</span><span class="fx" style="font-size:10.5px">${fxSummary(a)}</span></button>`;
    }).join('')}</div></div>`, sh => {
    $$('[data-act]', sh).forEach(b => b.onclick = () => {
      s.plan[slot] = b.dataset.act; Game.save(); Sfx.select(); haptic(12); closeSheet();
      renderTab(el);
    });
  });
}

// ---------- Week resolution ----------
async function lockWeek() {
  const s = Game.s;
  const plan = s.plan.map(id => ACTIONS.find(a => a.id === id));
  const chips = Game.runWeek();
  Game.save();
  const el = UI.show(`<div class="screen resolve">
    <div class="sky-arc"><div class="arc"></div><div class="orb" data-orb></div></div>
    <div class="phase" data-ph>&nbsp;</div><div class="phase-sub" data-ps>&nbsp;</div>
    <div class="deltas" data-d style="justify-content:center;margin-top:22px;min-height:60px;max-width:340px"></div>
    <button class="btn primary" style="margin-top:20px;opacity:0;transition:opacity .4s" data-go>Continue</button></div>`);
  const orb = $('[data-orb]', el);
  const names = ['Morning', 'Afternoon', 'Evening'];
  for (let i = 0; i < 3; i++) {
    const a = [150, 90, 30][i] * Math.PI / 180;
    orb.style.transition = 'left .9s cubic-bezier(.16,1,.3,1), top .9s cubic-bezier(.16,1,.3,1), background .9s';
    orb.style.left = (150 + Math.cos(a) * 150) + 'px';
    orb.style.top = (150 - Math.sin(a) * 150) + 'px';
    if (i === 2) orb.style.background = 'radial-gradient(circle, #e0e7ff, #818cf8 60%, transparent 70%)';
    const ph = $('[data-ph]', el); ph.style.animation = 'none'; void ph.offsetWidth; ph.style.animation = 'callIn .6s var(--ease-spring) both';
    ph.textContent = `${plan[i].em} ${plan[i].name}`; $('[data-ps]', el).textContent = names[i];
    Sfx.whoosh(); haptic(10);
    await sleep(850);
  }
  $('[data-d]', el).innerHTML = chipsHtml(chips);
  $('[data-go]', el).style.opacity = 1;
  await UI.waitTap('[data-go]');
  await afterWeek();
}

async function afterWeek() {
  const s = Game.s;
  // story/random event
  const ev = Game.nextEvent();
  if (ev) { const ended = await eventScreen(ev); if (ended) return; }
  if (Game.isMatchWeek()) {
    if (s.missNext) {
      s.missNext = false; s.stageRatings.push(3.5); Game.apply({ form: -6, injury: -25, confidence: -5 });
      await infoScreen('🩹', 'Watching from the Dugout', 'Strapped up, in a tracksuit, carrying drinks. Someone else is in your spot. Selectors notice who is on the field.', 'Continue');
    } else {
      const r = await Match.play();
      if (s.injuries >= 3) return ending('broken');
    }
  }
  // next week or end of stage
  if (s.week >= Game.weeksInStage()) return stageEnd();
  s.week++; Game.save();
  hub();
}

async function infoScreen(em, title, body, btn) {
  UI.show(`<div class="screen event"><div class="event-art" style="background:radial-gradient(circle at 50% 60%, #3b2a4a, #0b0a12 70%)"><div class="bigem">${em}</div></div>
    <div class="event-card"><h2>${esc(title)}</h2><div class="body">${body}</div><button class="btn primary block" style="margin-top:18px" data-go>${btn}</button></div></div>`);
  await UI.waitTap('[data-go]');
}

// ---------- Events ----------
async function eventScreen(ev) {
  const s = Game.s;
  Game.markSeen(ev);
  if (ev.id === 'praise' || ev.id === 'troll') s.lastRating = null; // don't re-trigger
  const el = UI.show(`<div class="screen event">
    <div class="event-art" style="background:radial-gradient(circle at 50% 55%, ${ev.bg[0]}, ${ev.bg[1]} 75%)"><div class="bigem">${ev.em}</div></div>
    <div class="event-card">
      <div class="who">${esc(Game.fill(ev.who))}</div>
      <h2>${esc(ev.title)}</h2>
      <div class="body">${Game.fill(ev.body)}</div>
      <div class="choices">${ev.choices.map((c, i) => { const ok = !c.req || c.req(s); return `<button class="choice" data-c="${i}" ${ok ? '' : 'disabled'}><b>${Game.fill(c.t)}</b>${c.d ? `<span>${ok ? c.d : 'Not possible right now · ' + c.d}</span>` : ''}</button>`; }).join('')}</div>
    </div></div>`);
  Sfx.stinger(); haptic(25);
  const idx = await new Promise(r => $$('[data-c]', el).forEach(b => b.onclick = () => { Sfx.select(); haptic(15); r(+b.dataset.c); }));
  const c = ev.choices[idx];
  if (c.end) { await ending(c.end); return true; }
  let fx = c.fx || {}, out = c.out, extra = '';
  if (c.check) {
    const k = c.check;
    const vals = k.stats.map(st => s.skills[st] ?? s.cond[st] ?? s.life[st] ?? 40);
    const v = Math.max(...vals) * .6 + vals.reduce((a, b) => a + b, 0) / vals.length * .4 + rand(-12, 12);
    const dc = k.dc === 'yoyo' ? [0, 0, 50, 56, 62, 68][s.stage] : k.dc;
    const win = v >= dc;
    fx = win ? k.win.fx : k.lose.fx; out = win ? k.win.out : k.lose.out;
    extra = `<div class="chip" style="margin-bottom:10px;color:${win ? 'var(--green)' : 'var(--red)'}">${win ? '✓ Success' : '✗ Failed'}</div>`;
    if (win) { Sfx.success(); Burst.confetti(60); } else { Sfx.fail(); shake(); }
  }
  if (c.flag) s.flags[c.flag] = true;
  if (c.setFlag) s.flags[c.setFlag(s)] = true;
  const chips = mergeChips(Game.apply(fx));
  Game.diary(`${ev.title}: ${Game.fill(c.t).replace(/"/g, '')}`);
  Game.save();
  const card = $('.event-card', el);
  card.style.animation = 'none'; void card.offsetWidth;
  card.innerHTML = `${extra}<div class="who">${esc(ev.title)}</div><div class="body" style="font-size:17px;margin-top:8px">${Game.fill(out)}</div><div class="deltas">${chipsHtml(chips)}</div><button class="btn primary block" style="margin-top:18px" data-go>Continue</button>`;
  card.style.animation = 'cardIn .6s var(--ease-out) both';
  await UI.waitTap('[data-go]');
  return false;
}

// ---------- Stage end: selection / auction ----------
async function stageEnd() {
  const s = Game.s, sd = Game.stageDef;
  if (sd.gate.final) {
    const avg = s.stageRatings.reduce((a, b) => a + b, 0) / Math.max(1, s.stageRatings.length);
    return ending(avg >= 6.3 ? 'glory' : 'debut');
  }
  if (s.stage === 4 && s.flags.fixer) return ending('banned');
  if (sd.gate.auction) return auction();
  const { avg, score } = Game.stageScore();
  const pass = score >= sd.gate.need;
  await selectionReveal(pass, avg, score);
  if (pass) { Game.advance(); await chapterCard(); return hub(); }
  if (s.age >= 26 || s.fails >= 3) return ending('aged');
  Game.repeatStage(); Game.diary(`Not selected. Season ${s.season}. Again.`);
  await infoScreen('🔁', 'Next Season', `You're ${s.age} now. Same maidan, same nets, same dream. ${s.fails >= 2 ? 'People have started asking Papa when you\'ll "get a proper job".' : 'Pandey-ji just says: "Again."'}`, 'Go again');
  hub();
}

async function selectionReveal(pass, avg, score) {
  const s = Game.s, sd = Game.stageDef;
  const pool = ['Vikrant Chauhan', 'Aman Rawat', 'Kunal Awasthi', 'Saurabh Dubey', 'Ishaan Mishra', 'Rahul Tomar', 'Yash Bhadoria', 'Faizan Ali', 'Nitin Saini', 'Abhay Pratap', 'Dev Malik'];
  const names = pool.sort(() => Math.random() - .5).slice(0, 7);
  if (pass) names.splice(randi(3, 6), 0, s.name); else names.push(pick(pool.filter(n => !names.includes(n))));
  const el = UI.show(`<div class="screen"><div class="scroll pad">
    <div class="tiny" style="margin-top:10px">Selection</div>
    <div class="display" style="font-size:44px">${esc(sd.gate.name)}</div>
    <div class="muted small" style="margin-top:6px">Stage average rating <b class="gold">${avg.toFixed(1)}</b> · Selection score <b class="gold">${score}</b> / needed ${sd.gate.need}</div>
    <div class="reveal-list" style="margin-top:16px" data-list></div>
    <div data-after style="opacity:0;transition:opacity .6s"><div class="card" style="margin-top:12px"><div class="body">${pass ? sd.gate.pass : sd.gate.fail}</div></div><button class="btn primary block" style="margin-top:14px" data-go>Continue</button></div>
  </div></div>`);
  const list = $('[data-list]', el);
  for (let i = 0; i < names.length; i++) {
    await sleep(380); Sfx.heartbeat();
    const me = names[i] === s.name;
    list.insertAdjacentHTML('beforeend', `<div class="nm ${me ? 'me' : ''}"><span>${i + 1}. ${esc(names[i])}</span>${me ? '<span class="gold">YOU</span>' : ''}</div>`);
    if (me) { Sfx.success(); Burst.confetti(150); haptic(120); }
  }
  await sleep(500);
  if (!pass) { Sfx.fail(); shake(); }
  el.insertAdjacentHTML('beforeend', `<div class="stamp ${pass ? 'sold' : 'unsold'}">${pass ? 'SELECTED' : 'DROPPED'}</div>`);
  Sfx.gavel();
  $('[data-after]', el).style.opacity = 1;
  await UI.waitTap('[data-go]');
}

async function auction() {
  const s = Game.s;
  const { avg, score } = Game.stageScore();
  const sc = score + (s.flags.agent ? 6 : 0) + Math.min(8, s.life.fans / 4000);
  const price = Game.auctionPrice(sc);
  const teams = TEAMS_IPL.slice().sort(() => Math.random() - .5).slice(0, 5);
  Ambient.set('gold');
  const el = UI.show(`<div class="screen"><div class="scroll pad" style="text-align:center">
    <div class="tiny" style="margin-top:10px;color:var(--gold);letter-spacing:.4em">● LIVE</div>
    <div class="display" style="font-size:48px;margin-top:4px">IPL Auction</div>
    <div class="card" style="margin-top:14px;text-align:left"><div class="row"><div class="avatar">${esc(s.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</div><div class="col"><b class="cond" style="font-size:18px">${esc(s.name)}</b><span class="tiny">Uncapped · ${{ bat: 'Batter', bowl: 'Fast bowler', all: 'All-rounder' }[s.role]} · Avg rating ${avg.toFixed(1)}</span></div></div></div>
    <div class="tiny" style="margin-top:22px">Current bid</div>
    <div class="auction-price" data-price>₹20 L</div>
    <div class="small muted" data-call style="min-height:20px">Base price ₹20 lakh. Any interest?</div>
    <div style="margin-top:14px" data-paddles>${teams.map(t => `<span class="paddle" data-t="${t.id}"><span class="dot" style="background:${t.c1}"></span>${t.id}</span>`).join('')}</div>
    <div data-after style="opacity:0;transition:opacity .6s;margin-top:20px"><div class="card"><div class="body" data-msg></div></div><button class="btn primary block" style="margin-top:14px" data-go>Continue</button></div>
  </div></div>`);
  const pEl = $('[data-price]', el), cEl = $('[data-call]', el);
  Sfx.stinger();
  await sleep(1600);
  let winner = null;
  if (price > 0) {
    let cur = 2000000, steps = 0;
    while (cur < price && steps < 40) {
      const t = pick(teams); winner = t;
      $$('.paddle', el).forEach(p => p.classList.toggle('up', p.dataset.t === t.id));
      const next = Math.min(price, cur + (cur < 1e7 ? 500000 : cur < 5e7 ? 2500000 : 5000000) * randi(1, 2));
      tweenNum(pEl, cur, next, 380, v => fmtMoney(Math.round(v / 100000) * 100000));
      cEl.textContent = `${t.name} raise the paddle!`;
      Sfx.coin(); haptic(10);
      cur = next; steps++;
      await sleep(steps < 4 ? 700 : 420);
    }
    if (!winner) winner = teams[0];
    cEl.textContent = 'Going once... going twice...'; await sleep(1200);
    Sfx.gavel(); flash(); shake(); haptic(200);
    el.insertAdjacentHTML('beforeend', `<div class="stamp sold">SOLD</div>`);
    Burst.confetti(220); Sfx.cheer(1.4);
    s.ipl = winner.id; s.price = price;
    Game.apply({ money: price, fans: Math.round(price / 2000), reputation: 10, confidence: 15 });
    $('[data-msg]', el).innerHTML = `<b class="gold">${esc(winner.name)}</b> buy you for <b>${fmtMoney(price)}</b>. Papa watches it live on a phone at the stall. The whole bus stand watches with him.`;
    Game.diary(`IPL auction: sold to ${winner.name} for ${fmtMoney(price)}.`);
  } else {
    cEl.textContent = 'Any interest? ...'; await sleep(1500);
    cEl.textContent = 'No bids.'; await sleep(900);
    Sfx.gavel(); Sfx.fail();
    el.insertAdjacentHTML('beforeend', `<div class="stamp unsold">UNSOLD</div>`);
    $('[data-msg]', el).innerHTML = 'Silence. The auctioneer moves to the next name. You watch the rest of the auction alone in your room. Back to domestic cricket.';
    Game.diary('IPL auction: unsold.');
  }
  $('[data-after]', el).style.opacity = 1;
  await UI.waitTap('[data-go]');
  if (price > 0) { Game.advance(); await chapterCard(); return hub(); }
  if (s.age >= 26 || s.fails >= 3) return ending('aged');
  Game.repeatStage(); hub();
}

// ---------- Endings ----------
async function ending(id) {
  const e = ENDINGS[id], s = Game.s, c = s.career;
  Ambient.set(id === 'glory' ? 'gold' : id === 'banned' ? 'tense' : 'night');
  const avg = c.outs ? (c.runs / c.outs).toFixed(1) : c.runs;
  const el = UI.show(`<div class="screen"><div class="scroll pad ending" style="display:flex;flex-direction:column;min-height:100%">
    <div style="font-size:84px;animation:emIn 1s var(--ease-spring) both">${e.em}</div>
    <div class="etitle" style="color:${e.col}">${e.title}</div>
    <div class="body" style="margin-top:14px;color:#e4dbe9;max-width:340px">${e.text}</div>
    <div class="stat-grid" style="margin-top:20px;width:100%">
      <div class="s"><b>${c.matches}</b><span class="tiny">Matches</span></div>
      <div class="s"><b>${c.runs}</b><span class="tiny">Runs · avg ${avg}</span></div>
      <div class="s"><b>${c.wkts}</b><span class="tiny">Wickets</span></div>
      <div class="s"><b>${c.hs}</b><span class="tiny">High score</span></div>
      <div class="s"><b>${c.best || '-'}</b><span class="tiny">Best bowling</span></div>
      <div class="s"><b>${s.age}</b><span class="tiny">Age</span></div>
    </div>
    <div class="small muted" style="margin-top:12px">Fans ${s.life.fans.toLocaleString('en-IN')} · Earned ${fmtMoney(Math.max(0, s.life.money))} · Integrity ${Math.round(s.life.integrity)}</div>
    <button class="btn primary block" style="margin-top:22px" data-go>New career</button>
  </div></div>`);
  if (id === 'glory') { Burst.confetti(260); Sfx.cheer(1.6); Sfx.success(); } else if (id === 'debut') { Burst.confetti(120); Sfx.success(); } else Sfx.stinger();
  Game.wipe();
  await UI.waitTap('[data-go]');
  createScreen();
}

// ---------- Android lifecycle hooks ----------
window.GG = {
  onPause() { Sfx.crowd(false); },
  onResume() {},
  onBack() {
    if (UI.sheet) { closeSheet(); return 'handled'; }
    const now = Date.now();
    if (now - UI.backAt < 1800) return 'exit';
    UI.backAt = now; toast('Press back again to exit. Progress is saved.');
    return 'handled';
  },
  // test hook
  _dev: { Game, Match, Moments },
};

// ---------- Boot ----------
(async function boot() {
  try { if (localStorage.getItem('gg_muted')) Sfx.setMuted(true); } catch (e) {}
  try { await document.fonts.ready; } catch (e) {}
  titleScreen();
})();

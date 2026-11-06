// Story Mode engine: episodic, choice-driven chapters with keys, diamonds and playable cricket moments.
const STORY_KEY = 'gg_story_v1';
const KEY_MAX = 2, KEY_MS = 3 * 60 * 60 * 1000; // one key every 3 hours
const AD_CAP = { key: 6, gems: 8 }; // rewarded ads allowed per day (lower these once gem packs are on sale)
const GEM_SVG = `<svg class="ico" viewBox="0 0 24 24"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9fbff"/><stop offset=".5" stop-color="#3fd0e0"/><stop offset="1" stop-color="#1a7f9c"/></linearGradient></defs><path d="M6 3h12l4 6-10 12L2 9z" fill="url(#gg)" stroke="#0b3a47" stroke-width="1.2"/><path d="M2 9h20M8 3l4 18 4-18M6 3l2 6M18 3l-2 6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".9"/></svg>`;
const KEY_SVG = `<svg class="ico" viewBox="0 0 24 24"><defs><linearGradient id="gk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#b9770e"/></linearGradient></defs><circle cx="7.5" cy="12" r="5" fill="none" stroke="url(#gk)" stroke-width="3"/><path d="M12 12h10M18 12v4M21 12v3" stroke="url(#gk)" stroke-width="3" stroke-linecap="round"/></svg>`;

const Story = {
  st: null, ep: null, labels: {}, el: null, tapFn: null, scene: { bg: null, left: null, right: null, speaking: null },

  // ---------- persistence ----------
  load() {
    try { this.st = JSON.parse(localStorage.getItem(STORY_KEY)); } catch (e) { this.st = null; }
    if (!this.st) this.st = { name: '', diamonds: 22, keys: KEY_MAX, keyTs: Date.now(), done: {}, rel: { papa: 0, pinky: 0, pandey: 0, neha: 0, vikrant: 0 }, flags: {}, cur: null };
    if (!this.st.keyTs) this.st.keyTs = Date.now();
    this.refillKeys();
    return this.st;
  },
  save() { try { localStorage.setItem(STORY_KEY, JSON.stringify(this.st)); } catch (e) {} },
  refillKeys() {
    const s = this.st, now = Date.now();
    if (s.keys >= KEY_MAX) { s.keyTs = now; return; }
    const gained = Math.floor((now - s.keyTs) / KEY_MS);
    if (gained > 0) { s.keys = Math.min(KEY_MAX, s.keys + gained); s.keyTs += gained * KEY_MS; if (s.keys >= KEY_MAX) s.keyTs = now; }
  },
  nextKeyIn() { const ms = KEY_MS - (Date.now() - this.st.keyTs); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return `${h}h ${String(m).padStart(2, '0')}m`; },
  fill(t) { return t.replace(/\{first\}/g, esc((this.st.name || 'Beta').split(' ')[0])); },

  // ---------- HUD ----------
  hudHtml(title) {
    return `<div class="st-hud">
      <button class="st-iconbtn" data-menu aria-label="Menu"><span></span><span></span><span></span></button>
      <div class="st-title">${title || ''}</div>
      <div class="row" style="gap:6px"><button class="cur-pill" data-store data-gems>${GEM_SVG}<b>${this.st.diamonds}</b></button><button class="cur-pill" data-store data-keys>${KEY_SVG}<b>${this.st.keys}</b></button></div>
    </div>`;
  },
  bumpCur() {
    const g = $('[data-gems] b'), k = $('[data-keys] b');
    if (g) { g.textContent = this.st.diamonds; g.parentElement.classList.remove('bump'); void g.offsetWidth; g.parentElement.classList.add('bump'); }
    if (k) k.textContent = this.st.keys;
  },
  bindHud(el, inEpisode) {
    $$('[data-store]', el).forEach(b => b.onclick = (e) => { e.stopPropagation(); this.store(); });
    $('[data-menu]', el).onclick = (e) => { e.stopPropagation(); inEpisode ? this.pauseMenu() : titleScreen(); };
  },

  // ---------- Book / episode list ----------
  open() {
    this.load();
    if (!this.st.name) return this.askName();
    this.bookScreen();
  },

  askName() {
    const el = UI.show(`<div class="screen story-book">${Art.bg('title')}<div class="art-shade" style="background:linear-gradient(180deg,rgba(11,10,18,.3),rgba(11,10,18,.95) 70%)"></div>
      <div class="scroll pad" style="display:flex;flex-direction:column;justify-content:flex-end">
        <div class="tiny" style="color:var(--gold)">Story Mode</div>
        <div class="display" style="font-size:52px;margin:4px 0 6px">What do they<br>call you?</div>
        <div class="muted small">Your choices write the story. Some of them cost more than others.</div>
        <input class="field" style="margin-top:18px" maxlength="20" placeholder="Your name" data-name>
        <button class="btn primary block" style="margin:14px 0 24px" data-go>Begin</button>
      </div></div>`);
    $('[data-go]', el).onclick = () => {
      const n = ($('[data-name]', el).value || '').trim();
      if (n.length < 2) { toast('Every legend needs a name.'); return; }
      this.st.name = n.replace(/\b\w/g, c => c.toUpperCase()); this.save(); Sfx.select(); this.bookScreen();
    };
  },

  bookScreen() {
    this.refillKeys(); this.save();
    const s = this.st;
    const b = BOOKS[0];
    const nextIdx = EPISODES.findIndex(e => !s.done[e.id]);
    const el = UI.show(`<div class="screen story-book">
      ${this.hudHtml('Story Mode')}
      <div class="scroll" style="padding-bottom:24px">
        <div class="book-cover">${Art.bg(b.art)}<div class="art-shade" style="background:linear-gradient(180deg,rgba(11,10,18,0) 30%,rgba(11,10,18,.96))"></div>
          <div class="bc-txt"><div class="tiny" style="color:var(--gold)">Book 1 · Sports Drama</div><div class="display" style="font-size:56px">${b.title}</div><div class="small" style="color:#e4dbe9;margin-top:4px">${b.blurb}</div>
          <div class="rel-row-wrap">${Object.entries(REL_KEYS).map(([k, l]) => `<span class="rel-chip" style="--c:${CAST[k].col}">${l} ${relHearts(s.rel[k])}</span>`).join('')}</div></div>
        </div>
        <div class="pad" style="padding-top:6px">
          ${s.cur ? `<button class="btn primary block" data-resume>Resume · Episode ${EPISODES.find(e => e.id === s.cur.ep).no}</button>` : ''}
          <div class="ep-list stagger">${EPISODES.map((e, i) => {
            const done = s.done[e.id], next = i === nextIdx, locked = i > nextIdx && nextIdx !== -1;
            return `<button class="ep-row ${done ? 'done' : ''} ${next ? 'next' : ''} ${locked ? 'locked' : ''}" data-ep="${i}" ${locked ? 'disabled' : ''}>
              <div class="ep-thumb" style="${Art.has(e.art) ? `background-image:url('${Art.url(e.art)}')` : ''}"><span>${e.no}</span></div>
              <div class="grow" style="text-align:left"><div class="tiny">Episode ${e.no}</div><b class="cond" style="font-size:18px">${e.title}</b></div>
              <div class="ep-cta">${done ? '<span class="tiny">Replay</span>' : locked ? '🔒' : `<span class="cost-tag">${KEY_SVG}1</span>`}</div></button>`;
          }).join('')}
            <div class="ep-row locked soon"><div class="ep-thumb" style="background-image:url('${Art.has(NEXT_TEASER.art) ? Art.url(NEXT_TEASER.art) : ''}')"><span>${NEXT_TEASER.no}</span></div><div class="grow" style="text-align:left"><div class="tiny" style="color:var(--saffron)">${NEXT_TEASER.note}</div><b class="cond" style="font-size:18px">${NEXT_TEASER.title}</b></div><div class="ep-cta">${Notify.granted() ? '✅' : '🔔'}</div></div>
          </div>
          <div class="tiny" style="margin:16px 2px 8px">${s.keys < KEY_MAX ? `Next key in ${this.nextKeyIn()}` : 'Keys full'}</div>
          <div class="tiny" style="margin:22px 2px 10px">More books</div>
          <div class="book-shelf">${BOOKS.slice(1).map(bk => `<div class="shelf-book">${Art.has(bk.art) ? `<div class="sb-art" style="background-image:url('${Art.url(bk.art)}')"></div>` : ''}<div class="sb-shade"></div><div class="sb-txt"><span class="chip" style="background:rgba(230,57,70,.85);border:0">Coming soon</span><div class="display" style="font-size:28px;margin-top:6px">${bk.title}</div><div class="small" style="opacity:.85">${bk.blurb}</div></div></div>`).join('')}</div>
        </div>
      </div></div>`);
    this.bindHud(el, false);
    $$('[data-ep]', el).forEach(btn => btn.onclick = () => this.tryStart(+btn.dataset.ep));
    if (s.cur) $('[data-resume]', el).onclick = () => { Sfx.select(); this.resume(); };
    $('.ep-row.soon', el).onclick = () => this.askNotify(true);
  },

  tryStart(i) {
    const e = EPISODES[i], s = this.st;
    if (s.done[e.id]) { Sfx.select(); return this.startEpisode(i, true); }
    this.refillKeys();
    if (s.keys < 1) return this.noKeys();
    s.keys--; if (s.keys === KEY_MAX - 1) s.keyTs = Date.now();
    this.save(); this.scheduleReminders(); Sfx.coin(); this.startEpisode(i, false);
  },

  noKeys() {
    openSheet(`<div class="pad" style="text-align:center">
      <div class="big-ico">${KEY_SVG}</div>
      <div class="display" style="font-size:36px">Out of keys</div>
      <div class="muted small" style="margin-top:6px">Next free key in <b class="gold">${this.nextKeyIn()}</b></div>
      <button class="btn primary block" style="margin-top:16px" data-ad ${this.adsLeft('key') > 0 ? '' : 'disabled'}>▶ Watch an ad · +1 key</button>
      <div class="tiny" style="margin-top:6px">${this.adsLeft('key') > 0 ? `${this.adsLeft('key')} ad keys left today` : 'Ad keys used up for today'}</div>
      <button class="btn ghost block" style="margin-top:8px" data-shop>Open store</button></div>`, sh => {
      $('[data-ad]', sh).onclick = async (e) => {
        const ok = await this.watchAd('key', e.currentTarget, () => { this.st.keys++; toast(`${KEY_SVG} +1 key`); });
        if (ok) closeSheet();
      };
      $('[data-shop]', sh).onclick = () => { closeSheet(); setTimeout(() => this.store(), 300); };
    });
  },

  // Launch build: free rewards only. Gem packs and VIP return with Google Play Billing.
  store() {
    const gemsLeft = Math.max(0, this.adsLeft('gems')), keysLeft = Math.max(0, this.adsLeft('key'));
    openSheet(`<div class="pad">
      <div class="row between"><div class="display" style="font-size:34px">Free rewards</div><div class="row" style="gap:6px"><span class="cur-pill">${GEM_SVG}<b>${this.st.diamonds}</b></span><span class="cur-pill">${KEY_SVG}<b>${this.st.keys}</b></span></div></div>
      <div class="small muted" style="margin-top:4px">Watch a short video to earn rewards. Limits reset every day.</div>
      <button class="btn primary block" style="margin-top:14px" data-ad="gems" ${gemsLeft ? '' : 'disabled'}>▶ +5 diamonds <span class="tiny" style="margin-left:6px;color:#1a0c00">${gemsLeft} left today</span></button>
      <button class="btn ghost block" style="margin-top:8px" data-ad="key" ${keysLeft ? '' : 'disabled'}>▶ +1 key <span class="tiny" style="margin-left:6px">${keysLeft} left today</span></button>
      <div class="small muted" style="text-align:center;margin-top:14px">Free key every 3 hours · +2 diamonds for every new episode</div></div>`, sh => {
      $$('[data-ad]', sh).forEach(btn => btn.onclick = async (e) => {
        const kind = btn.dataset.ad;
        const ok = await this.watchAd(kind, e.currentTarget, () => {
          if (kind === 'gems') { this.st.diamonds += 5; toast(`${GEM_SVG} +5 diamonds`); }
          else { this.st.keys++; toast(`${KEY_SVG} +1 key`); }
        });
        if (ok) closeSheet();
      });
    });
  },

  adsLeft(kind) {
    const s = this.st, day = new Date().toDateString();
    if (s.adDay !== day) { s.adDay = day; s.adUsed = { key: 0, gems: 0 }; }
    return AD_CAP[kind] - (s.adUsed[kind] || 0);
  },
  // play a rewarded ad; calls give() only if the player watched to the end
  async watchAd(kind, btn, give) {
    if (kind !== 'double' && this.adsLeft(kind) <= 0) { toast('Daily ad limit reached. Come back tomorrow.'); return false; }
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = 'Loading ad…'; }
    Sfx.crowd(false);
    const r = await Ads.show(kind);
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
    if (r === 'rewarded') {
      if (kind !== 'double') this.st.adUsed[kind] = (this.st.adUsed[kind] || 0) + 1;
      give(); this.save(); this.bumpCur(); Sfx.success(); return true;
    }
    toast(r === 'skipped' ? 'Watch the whole ad to get the reward.' : 'No ad available right now. Try again in a minute.');
    return false;
  },

  fakeAd(done) {
    const ov = document.createElement('div'); ov.className = 'fake-ad';
    ov.innerHTML = `<div class="tiny">Advertisement</div><div class="display" style="font-size:40px;margin:10px 0">Your ad here</div><div class="muted small">Real rewarded ads (AdMob) plug in here.</div><div class="ad-count">5</div>`;
    document.body.appendChild(ov);
    let n = 5; const t = setInterval(() => { n--; $('.ad-count', ov).textContent = n; if (n <= 0) { clearInterval(t); ov.remove(); Sfx.success(); done(); } }, 1000);
  },

  pauseMenu() {
    openSheet(`<div class="pad"><div class="display" style="font-size:32px">Paused</div>
      <button class="btn ghost block" style="margin-top:14px" data-book>Back to episodes</button>
      <button class="btn ghost block" style="margin-top:8px" data-snd>${Sfx.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
      <div class="tiny" style="margin-top:12px;text-align:center">Your place in the episode is saved</div></div>`, sh => {
      $('[data-book]', sh).onclick = () => { closeSheet(); this.abort = true; this.bookScreen(); };
      $('[data-snd]', sh).onclick = (e) => { Sfx.setMuted(!Sfx.muted); e.target.textContent = Sfx.muted ? '🔇 Sound off' : '🔊 Sound on'; };
    });
  },

  // ---------- Episode playback ----------
  async startEpisode(i, replay) {
    const e = EPISODES[i];
    this.ep = e; this.replay = replay; this.abort = false;
    this.labels = {}; e.nodes.forEach((n, k) => { if (n.label) this.labels[n.label] = k; });
    if (!replay) { this.st.flagsAtStart = { ...this.st.flags }; }
    this.scene = { bg: null, left: null, right: null, speaking: null };
    this.st.cur = { ep: e.id, pos: 0, scene: this.scene, replay };
    this.save();
    await this.titleCard(e);
    this.run(0);
  },
  resume() {
    const c = this.st.cur; const i = EPISODES.findIndex(e => e.id === c.ep);
    this.ep = EPISODES[i]; this.replay = c.replay; this.abort = false;
    this.labels = {}; this.ep.nodes.forEach((n, k) => { if (n.label) this.labels[n.label] = k; });
    this.scene = c.scene || { bg: null, left: null, right: null };
    this.run(c.pos);
  },

  async titleCard(e) {
    const el = UI.show(`<div class="screen ep-card">${Art.bg(e.art)}<div class="art-shade" style="background:radial-gradient(circle at 50% 45%,rgba(11,10,18,.2),rgba(11,10,18,.92) 75%)"></div>
      <div class="ep-card-in"><div class="tiny" style="letter-spacing:.5em;color:var(--gold)">Book 1 · Episode ${e.no}</div>
      <div class="ep-card-title">${e.title}</div><div class="ep-card-rule"></div>
      <div class="small" style="color:#e9dccb">${BOOKS[0].title}</div></div>
      <div class="cine-tap tiny">Tap to begin</div></div>`);
    Sfx.stinger(); haptic(30);
    await new Promise(r => setTimeout(() => el.addEventListener('click', r, { once: true }), 700));
  },

  renderScene() {
    const el = UI.show(`<div class="screen story-scene">
      <div class="st-bgwrap"><div class="st-bg a"></div><div class="st-bg b"></div></div>
      <div class="st-grad"></div>
      <canvas class="scene-fx" data-fx="dust" data-story-fx></canvas><div class="godrays" data-story-rays></div><div class="st-dark"></div>
      <div class="st-stage"><div class="chr left" data-side="left"></div><div class="chr right" data-side="right"></div></div>
      ${this.hudHtml(`EP ${this.ep.no} · ${this.ep.title}`)}
      <div class="st-layer" data-layer></div>
    </div>`, 'fast');
    this.el = el; this.bgFlip = false;
    this.bindHud(el, true);
    el.addEventListener('click', () => { if (this.tapFn) this.tapFn(); });
    if (this.scene.bg) this.setBg(this.scene.bg, true);
    ['left', 'right'].forEach(side => { if (this.scene[side]) this.placeChar(side, this.scene[side], true); });
    return el;
  },

  setBg(name, instant) {
    this.scene.bg = name;
    const layers = $$('.st-bg', this.el);
    const next = layers[this.bgFlip ? 0 : 1], cur = layers[this.bgFlip ? 1 : 0];
    this.bgFlip = !this.bgFlip;
    next.style.backgroundImage = Art.has(name) ? `url('${Art.url(name)}')` : 'linear-gradient(180deg,#2b1640,#0b0a12)';
    next.style.transition = instant ? 'none' : ''; cur.style.transition = instant ? 'none' : '';
    next.classList.add('on'); cur.classList.remove('on');
    const mode = this.weather || SceneFX.for(name);
    const c = $('[data-story-fx]', this.el); if (c) SceneFX.set(c, mode);
    const r = $('[data-story-rays]', this.el); if (r) r.style.display = DAY_ART.has(name) && !this.weather ? '' : 'none';
    Sfx.ambience(this.weather === 'rain' ? 'rain' : ({ intro: 'stall', ch1: 'maidan', ch2: 'maidan', ch3: 'maidan', bd_maidan: 'night', ev_call: 'room', bg_home: 'room', bg_street_dusk: 'night', bg_club_match: 'maidan', bg_clubhouse_wall: 'maidan', bg_mandi_night: 'rain', bg_burnt_stall: 'stall', bg_hospital: 'room', bg_tennis_night: 'night', bg_hostel: 'room', bg_dressing_room: 'room', bg_hotel_lobby: 'room', bg_newsroom: 'room', bg_hearing_room: 'room', bg_stall_rebuilt: 'stall', ev_party: 'night', ch4: 'room', ch5: 'night', bd_stadium_night: 'night' }[name] || 'night'));
  },

  portraitHtml(id) {
    const c = CAST[id];
    if (Art.has('char_' + id)) return `<img class="cut" src="${Art.imgs['char_' + id].src}" alt="" draggable="false">`;
    // Painted-card fallback: framed character card using their event art, or a stylised silhouette
    const art = c.art && Art.has(c.art) ? `<div class="card-art" style="background-image:url('${Art.url(c.art)}')"></div>` : `<svg class="sil" viewBox="0 0 200 260"><defs><linearGradient id="sg_${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.col}" stop-opacity=".55"/><stop offset=".5" stop-color="#1a1526"/><stop offset="1" stop-color="#0b0a12"/></linearGradient></defs><path d="M100 30c22 0 38 18 38 42 0 18-9 33-22 39v10c34 6 62 26 70 60l6 79H8l6-79c8-34 36-54 70-60v-10c-13-6-22-21-22-39 0-24 16-42 38-42z" fill="url(#sg_${id})" stroke="${c.col}" stroke-width="2.5" stroke-opacity=".9"/></svg>`;
    return `<div class="chr-card" style="--c:${c.col}">${art}<div class="chr-card-shade"></div><div class="chr-card-name">${c.name}</div></div>`;
  },

  placeChar(side, id, instant) {
    this.scene[side] = id;
    const slot = $(`.chr.${side}`, this.el);
    slot.innerHTML = this.portraitHtml(id);
    slot.dataset.id = id;
    slot.classList.remove('in', 'out', 'talk'); void slot.offsetWidth;
    slot.classList.add(instant ? 'in-instant' : 'in');
  },
  removeChar(which) {
    const sides = which === 'all' ? ['left', 'right'] : ['left', 'right'].filter(sd => this.scene[sd] === which);
    sides.forEach(sd => { this.scene[sd] = null; const slot = $(`.chr.${sd}`, this.el); slot.classList.remove('in', 'in-instant', 'talk'); slot.classList.add('out'); setTimeout(() => { if (!this.scene[sd]) slot.innerHTML = ''; }, 400); });
  },
  // swap to an expression portrait if we have one (falls back to the base portrait)
  expr(id, ex) {
    const slot = $$('.chr', this.el).find(c => c.dataset.id === id); if (!slot) return;
    const img = $('.cut', slot); if (!img) return;
    const key = ex && Art.has('char_' + id + '_' + ex) ? 'char_' + id + '_' + ex : 'char_' + id;
    const src = Art.imgs[key].src;
    if (img.getAttribute('src') !== src) { img.src = src; img.classList.remove('swap'); void img.offsetWidth; img.classList.add('swap'); }
  },
  focus(id) {
    $$('.chr', this.el).forEach(c => c.classList.toggle('talk', !!id && c.dataset.id === id && !!this.scene[c.dataset.side]));
    $$('.chr', this.el).forEach(c => c.classList.toggle('dim', !!id && c.dataset.id !== id));
  },

  waitTap() { return new Promise(r => { this.tapFn = () => { this.tapFn = null; Sfx.tap(); r(); }; }); },

  async typeInto(node, text, speed = 22) {
    node.textContent = '';
    let done = false, i = 0;
    return new Promise(res => {
      const finish = () => { if (done) return; done = true; clearInterval(t); node.textContent = text; res(); };
      const t = setInterval(() => { i += 1; node.textContent = text.slice(0, i); if (i % 3 === 0) Sfx.tick && Sfx.tick(); if (i >= text.length) finish(); }, speed);
      this.tapFn = () => { this.tapFn = null; finish(); };
    });
  },

  async line(kind, who, text, mood, ex) {
    const layer = $('[data-layer]', this.el);
    text = this.fill(text);
    const reveal = mood === 'reveal';
    this.el.classList.toggle('reveal-on', reveal);
    if (kind === 'n') {
      this.focus(null);
      layer.innerHTML = `<div class="cap ${reveal ? 'reveal' : ''}"><div class="cap-in"><span data-tx></span></div></div>`;
      if (reveal) { Sfx.boom(); haptic(220); setTimeout(() => Sfx.heartbeat(), 700); setTimeout(() => Sfx.heartbeat(), 1800); }
    } else if (kind === 'th') {
      this.focus(null);
      layer.innerHTML = `<div class="thought"><div class="th-label">${esc(this.st.name.split(' ')[0])} · thinking</div><div class="th-tx" data-tx></div><i class="d1"></i><i class="d2"></i><i class="d3"></i></div>`;
    } else {
      const c = CAST[who]; const side = this.scene.left === who ? 'left' : this.scene.right === who ? 'right' : 'center';
      this.focus(who);
      const shout = mood === 'shout';
      const autoEx = ex || (shout ? 'angry' : mood === 'soft' ? { papa: 'sad', pandey: 'proud' }[who] : null);
      this.expr(who, autoEx);
      layer.innerHTML = `<div class="bub ${side} ${mood || ''}" style="--c:${c.col}">
        ${shout ? burstSvg() : ''}
        <svg class="tail" viewBox="0 0 40 30"><path d="M4 30 L18 2 L36 30" /></svg>
        <div class="np">${esc(c.name)}</div>
        <div class="bub-tx" data-tx></div><div class="nxt"></div></div>`;
      if (shout) { shake(); haptic(40); Sfx.edge(); const bw = $('.st-bgwrap', this.el); bw.classList.remove('punch'); void bw.offsetWidth; bw.classList.add('punch'); }
    }
    const tx = $('[data-tx]', layer);
    await this.typeInto(tx, text, reveal ? 75 : kind === 'n' ? 26 : 20);
    layer.firstElementChild.classList.add('ready');
    await this.waitTap();
  },

  async phone(from, msgs) {
    const layer = $('[data-layer]', this.el);
    this.focus(null);
    layer.innerHTML = `<div class="phone"><div class="ph-notch"></div><div class="ph-head"><div class="ph-av">${esc(from[0])}</div><div><b>${esc(from)}</b><div class="tiny" style="letter-spacing:.04em;text-transform:none">online</div></div></div><div class="ph-body" data-pb></div><div class="ph-foot">Message</div></div>`;
    Sfx.coin(); haptic(30);
    const body = $('[data-pb]', layer);
    for (const m of msgs) {
      body.insertAdjacentHTML('beforeend', '<div class="ph-typing"><i></i><i></i><i></i></div>');
      await sleep(650);
      body.lastElementChild.remove();
      body.insertAdjacentHTML('beforeend', `<div class="ph-msg">${esc(this.fill(m.t))}<span class="ph-time">${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}</span></div>`);
      haptic(12); Sfx.tap();
      await sleep(350);
    }
    layer.firstElementChild.classList.add('ready');
    await this.waitTap();
  },

  async choice(opts) {
    const layer = $('[data-layer]', this.el);
    this.focus(null);
    const list = opts.filter(o => !o.show || o.show(this.st));
    layer.innerHTML = `<div class="choices-box"><div class="ch-head"><span></span>Choose<span></span></div>${list.map((o, i) => {
      const prem = !!o.cost; const can = !prem || this.st.diamonds >= o.cost;
      return `<button class="opt ${prem ? 'prem' : ''} ${can ? '' : 'cant'}" data-i="${i}" style="animation-delay:${.08 + i * .09}s"><div class="opt-main"><b>${this.fill(o.t)}</b>${o.d ? `<span>${o.d}</span>` : ''}</div>${prem ? `<div class="gem-cost">${GEM_SVG}<b>${o.cost}</b></div>` : ''}</button>`;
    }).join('')}</div>`;
    return new Promise(res => {
      $$('.opt', layer).forEach(b => b.onclick = (e) => {
        e.stopPropagation();
        const o = list[+b.dataset.i];
        if (o.cost && this.st.diamonds < o.cost) { Sfx.fail(); this.store(); return; }
        if (o.cost) { this.st.diamonds -= o.cost; this.bumpCur(); Sfx.coin(); Burst.sparks(b.getBoundingClientRect().right - 40, b.getBoundingClientRect().top + 20, 30, '#7ef0ff'); }
        else Sfx.select();
        haptic(15);
        b.classList.add('picked'); $$('.opt', layer).forEach(x => { if (x !== b) x.classList.add('gone'); });
        setTimeout(() => res(o), 420);
      });
    });
  },

  applyFx(fx, set) {
    if (set) this.st.flags[set] = true;
    if (!fx) return;
    for (const k in fx) {
      const v = fx[k]; if (!v || !(k in this.st.rel)) continue;
      this.st.rel[k] += v;
      rememberToast(k, v);
    }
  },

  async run(start) {
    const nodes = this.ep.nodes;
    if (!this.el || !document.body.contains(this.el) || !this.el.classList.contains('story-scene')) this.renderScene();
    for (let i = start; i < nodes.length; i++) {
      if (this.abort) return;
      const n = nodes[i];
      this.st.cur.pos = i; this.st.cur.scene = this.scene; this.save();
      if (n.label) continue;
      if (n.weather !== undefined) { this.weather = n.weather; this.setBg(this.scene.bg); continue; }
      if (n.bg) { this.weather = null; this.setBg(n.bg); await sleep(350); continue; }
      if (n.enter) {
        const side = n.side || (this.scene.left ? 'right' : 'left');
        this.placeChar(side, n.enter); Sfx.whoosh(); await sleep(380); continue;
      }
      if (n.exit) { this.removeChar(n.exit); await sleep(300); continue; }
      if (n.if) { const ok = typeof n.if === 'function' ? n.if(this.st) : this.st.flags[n.if]; if (ok) i = this.labels[n.go] - 1; continue; }
      if (n.go) { i = this.labels[n.go] - 1; continue; }
      if (n.fx || n.set) { this.applyFx(n.fx, n.set); if (!n.s && !n.n) continue; }
      if (n.n) { await this.line('n', null, n.n, n.reveal ? 'reveal' : null); continue; }
      if (n.th) { await this.line('th', 'me', n.th); continue; }
      if (n.s) { await this.line('s', n.s, n.t, n.mood, n.ex); continue; }
      if (n.phone) { await this.phone(n.phone, n.msgs); continue; }
      if (n.choice) {
        const o = await this.choice(n.choice);
        this.applyFx(o.fx, o.set);
        if (o.go) i = this.labels[o.go] - 1;
        await sleep(200);
        continue;
      }
      if (n.moment) {
        const win = await this.playMoment(n.moment);
        this.renderScene();
        await sleep(300);
        i = this.labels[win ? n.win : n.lose] - 1;
        continue;
      }
      if (n.end) { await this.endCard(n); return; }
    }
  },

  // ---------- playable cricket moment ----------
  async playMoment(cfg) {
    const s = this.st, f = s.flags;
    await Match.momentIntro(cfg.title, cfg.desc, 'STORY MOMENT');
    const el = UI.show(`<div class="screen match-screen"><div class="mroot" style="position:absolute;inset:0"></div>
      <div class="m-hud"><div class="scorebug" style="--c1:#b45309"><div class="tm">RGK</div><div class="sc" data-sc>0</div><div class="ov" data-ov></div><div class="need" data-need></div></div>
      <div class="m-brief"><div class="bt">${esc(cfg.title)}</div><div class="small" data-bd></div></div></div></div>`, 'fast');
    const pressure = cfg.kind === 'chase' ? .6 : .45;
    Moments.open($('.mroot', el), { view: 'bat', level: 0, whiteBall: false, bowlerType: 'pace', pressure, myKit: '#b45309', batKit: '#f4ede4', bowlKit: cfg.kind === 'duel' ? '#7c3aed' : '#475569' });
    UI.pressure(pressure > .5);
    const skill = 36 + (f.tyre ? 7 : 0) + (f.wonDuel ? 3 : 0) + (f.goodBat ? 5 : 0) + (f.rockyMentor ? 5 : 0) + (f.campImpress ? 2 : 0) + Math.max(0, s.rel.pandey);
    const steady = f.focused || f.calm;
    const ctx = {
      batSkill: skill, bowlSkill: (cfg.kind === 'duel' ? 40 : 42) + (cfg.hard && f[cfg.hard] ? 7 : 0), ready: f.pinkyBox ? .03 : 0,
      window: .07 + (f.drill ? .03 : 0), readFrac: f.drill ? .15 : .55, slow: 1.12,
    };
    ctx.wobble = ctx.window * (steady ? .45 : .8) * (f.drill ? .7 : 1); ctx.wobbleF = steady ? 5 : 8;
    let runs = 0, out = false, legal = 0;
    const need = cfg.need || 0;
    while (legal < cfg.balls) {
      $('[data-sc]', el).textContent = cfg.kind === 'chase' ? `${runs}` : `${runs}*`;
      $('[data-ov]', el).textContent = `Ball ${legal + 1}/${cfg.balls}`;
      const nd = $('[data-need]', el);
      if (cfg.kind === 'chase') nd.textContent = `NEED ${need - runs} OFF ${cfg.balls - legal}`; else nd.textContent = 'SURVIVE';
      $('[data-bd]', el).innerHTML = `${esc(cfg.bowler)} · ${f.drill ? '<span class="teal">Watch the wrist: short balls show early</span>' : 'Read the length, pick your shot'}`;
      let del;
      for (let k = 0; k < 6; k++) { del = genDelivery('pace', 0, ctx.bowlSkill); if (!f.angry || ['short', 'bouncer'].includes(del.len) || Math.random() < .45) break; }
      const r = await Moments.batBall(del, ctx);
      if (r.extra === 'wide') { runs += 1; continue; }
      legal++; runs += r.runs;
      if (r.out) { out = true; break; }
      if (cfg.kind === 'chase' && runs >= need) break;
      await sleep(250);
    }
    UI.pressure(false);
    const win = cfg.kind === 'chase' ? runs >= need : !out;
    await sleep(500);
    Moments.showCall(win ? (cfg.winCall || (cfg.kind === 'chase' ? 'WON IT!' : 'SURVIVED!')) : (cfg.loseCall || (cfg.kind === 'chase' ? 'SO CLOSE' : 'BOWLED')), win ? 'call-six' : 'call-out', win ? (cfg.winSub || 'The maidan erupts.') : (cfg.loseSub || 'Silence.'));
    if (win) { Burst.confetti(180); Sfx.cheer(1.4); haptic(150); } else Sfx.groan();
    await sleep(2200);
    Moments.close();
    return win;
  },

  async endCard(n) {
    const s = this.st, e = this.ep;
    const first = !s.done[e.id];
    s.done[e.id] = true; s.cur = null;
    if (first) s.diamonds += 2;
    this.save();
    const nextIdx = EPISODES.findIndex(x => x.id === e.id) + 1;
    const next = EPISODES[nextIdx];
    const el = UI.show(`<div class="screen ep-end">${Art.bg(e.art)}<div class="art-shade" style="background:linear-gradient(180deg,rgba(11,10,18,.55),rgba(11,10,18,.97) 65%)"></div>
      <div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;text-align:center">
        <div class="tbc">To be continued<span>...</span></div>
        <div class="cliff">${esc(this.fill(n.cliff))}</div>
        ${first ? `<div class="reward">${GEM_SVG}<b>+2</b><span>Episode complete</span></div><button class="btn block btn-double" data-double>▶ Watch an ad · Double it <span class="dbl-gem">${GEM_SVG}+2</span></button>` : ''}
        ${next ? `<button class="btn primary block" style="margin-top:18px" data-next>Next: Episode ${next.no} · <span style="display:inline-flex;align-items:center;gap:4px">${KEY_SVG}1</span></button>` : `<div class="card" style="margin-top:18px"><b class="cond gold">Episode ${NEXT_TEASER.no}: ${NEXT_TEASER.title}, coming soon</b><div class="small muted">Turn on notifications so you don't miss it.</div></div>`}
        <button class="btn ghost block" style="margin-top:8px" data-book>Episodes</button>
        <div class="rel-sum">${Object.entries(REL_KEYS).map(([k, l]) => `<div class="rel-row" style="--c:${CAST[k].col}"><span>${l}</span><span>${relHearts(s.rel[k])}</span></div>`).join('')}</div>
      </div></div>`);
    Sfx.stinger(); if (first) setTimeout(() => { Sfx.coin(); Burst.sparks(innerWidth / 2, innerHeight * .45, 40, '#7ef0ff'); }, 900);
    if (next) $('[data-next]', el).onclick = () => this.tryStart(nextIdx);
    const dbl = $('[data-double]', el);
    if (dbl) dbl.onclick = async () => {
      const ok = await this.watchAd('double', dbl, () => { this.st.diamonds += 2; toast(`${GEM_SVG} +2 diamonds`); });
      if (ok) { dbl.outerHTML = `<div class="dbl-done">✓ Doubled · ${GEM_SVG}+4 this episode</div>`; Burst.sparks(innerWidth / 2, innerHeight * .42, 40, '#7ef0ff'); }
    };
    $('[data-book]', el).onclick = () => this.bookScreen();
    this.scheduleReminders();
    if (e.no >= 3 && !s.notifyAsked && !Notify.granted()) setTimeout(() => this.askNotify(false), 2200);
  },

  // Soft pre-prompt first; Android's own dialog only if the player says yes.
  askNotify(fromBell) {
    const st = Notify.state();
    if (st === 'granted') { toast('🔔 Notifications are on. We\'ll tell you when the story continues.'); return; }
    if (st === 'denied' && !fromBell) return;
    openSheet(`<div class="pad" style="text-align:center">
      <div style="font-size:54px;line-height:1;margin:4px 0 6px">🔔</div>
      <div class="display" style="font-size:36px">Don't miss what happens next</div>
      <div class="small muted" style="margin:8px auto 0;max-width:300px">We'll tell you when your free key refills and when the next episode is waiting. No spam.</div>
      ${st === 'denied' ? '<div class="small" style="margin-top:10px;color:var(--gold)">Notifications are off for this app. Turn them on in Android Settings → Apps → Gully to Glory → Notifications.</div>' : ''}
      <button class="btn primary block" style="margin-top:16px" data-yes ${st === 'denied' ? 'disabled' : ''}>Notify me</button>
      <button class="btn ghost block" style="margin-top:8px" data-no>Not now</button></div>`, sh => {
      $('[data-yes]', sh).onclick = async () => {
        this.st.notifyAsked = true; this.save(); closeSheet();
        const ok = await Notify.request();
        if (ok) { toast('🔔 You\'re in. We\'ll ping you.'); this.scheduleReminders(); } else toast('No problem. You can turn them on any time.');
        if (document.querySelector('.story-book')) this.bookScreen();
      };
      $('[data-no]', sh).onclick = () => { this.st.notifyAsked = true; this.save(); closeSheet(); };
    });
  },

  // Key-refill reminder + next-day comeback nudge built from the latest cliffhanger.
  scheduleReminders() {
    if (!this.st || !Notify.granted()) return;
    const s = this.st;
    this.refillKeys();
    if (s.keys < KEY_MAX) {
      const due = Math.max(60 * 1000, KEY_MS - (Date.now() - s.keyTs));
      const nextEp = EPISODES.find(e => !s.done[e.id]);
      Notify.schedule(Notify.KEY_ID, due, '🔑 Your key is ready', nextEp ? `Episode ${nextEp.no}, "${nextEp.title}", is waiting for you.` : 'Replay an episode and try a different choice.');
    } else Notify.cancel(Notify.KEY_ID);
    const lastDone = [...EPISODES].reverse().find(e => s.done[e.id]);
    const cliff = lastDone ? (lastDone.nodes.find(n => n.end) || {}).cliff : null;
    Notify.schedule(Notify.COMEBACK_ID, 22 * 60 * 60 * 1000, 'Gully to Glory', cliff ? this.fill(cliff) : 'Rajgarh is waiting. Your story isn\'t over.');
  },
};

function relHearts(v) { const n = clamp(Math.round((v + 3) / 2), 0, 5); return '<span class="hearts">' + '♥'.repeat(n) + '<i>' + '♥'.repeat(5 - n) + '</i></span>'; }

function rememberToast(k, v) {
  const c = CAST[k];
  const t = document.createElement('div'); t.className = 'remember'; t.style.setProperty('--c', c.col);
  t.innerHTML = `<span class="rm-av">${esc(c.name[0])}</span><span><b>${esc(c.name)}</b> will remember that.</span><span class="rm-dir ${v > 0 ? 'up' : 'down'}">${v > 0 ? '▲' : '▼'}</span>`;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
}

// Jagged starburst frame for shouted lines
function burstSvg() {
  // rounded-rect outline with alternating spikes, so text sits safely inside
  const pts = [], n = 36;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const k = Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(sn), 4), -1 / 4); // squircle radius
    const r = (i % 2 ? .95 : 1.05) * k;
    pts.push([50 + c * 48 * r, 50 + sn * 48 * r]);
  }
  return `<svg class="burst" viewBox="-8 -8 116 116" preserveAspectRatio="none"><polygon points="${pts.map(p => p.map(x => x.toFixed(1)).join(',')).join(' ')}"/></svg>`;
}

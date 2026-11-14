// Story Mode engine: episodic, choice-driven chapters with keys, diamonds and playable cricket moments.
const STORY_KEY = 'gg_story_v1';
const KEY_MAX = 2, KEY_MS = 3 * 60 * 60 * 1000; // one key every 3 hours
// Rewarded ads allowed per day. Keys: one ad = one chapter, so effectively unlimited; 40 is only a
// safety net against automated ad farming (which can get the AdMob account flagged). Gems stay capped
// so diamond choices keep their value (and so future gem packs are worth buying).
const AD_CAP = { key: 40, gems: 8 };
const capNote = (n) => n <= 5; // only mention the daily limit when someone is close to it
const GEM_SVG = `<svg class="ico" viewBox="0 0 24 24"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9fbff"/><stop offset=".5" stop-color="#3fd0e0"/><stop offset="1" stop-color="#1a7f9c"/></linearGradient></defs><path d="M6 3h12l4 6-10 12L2 9z" fill="url(#gg)" stroke="#0b3a47" stroke-width="1.2"/><path d="M2 9h20M8 3l4 18 4-18M6 3l2 6M18 3l-2 6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".9"/></svg>`;
const KEY_SVG = `<svg class="ico" viewBox="0 0 24 24"><defs><linearGradient id="gk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#b9770e"/></linearGradient></defs><circle cx="7.5" cy="12" r="5" fill="none" stroke="url(#gk)" stroke-width="3"/><path d="M12 12h10M18 12v4M21 12v3" stroke="url(#gk)" stroke-width="3" stroke-linecap="round"/></svg>`;

const Story = {
  st: null, ep: null, labels: {}, el: null, tapFn: null, scene: { bg: null, left: null, right: null, speaking: null },

  // ---------- persistence ----------
  load() {
    try { this.st = JSON.parse(localStorage.getItem(STORY_KEY)); } catch (e) { this.st = null; }
    if (!this.st) this.st = { name: '', diamonds: 22, keys: KEY_MAX, keyTs: Date.now() };
    const s = this.st;
    if (!s.keyTs) s.keyTs = Date.now();
    if (!s.books) { // saves from v1.3 kept one story: it becomes Book 1
      s.books = {};
      if (s.done || s.flags || s.cur) s.books.b1 = { done: s.done || {}, rel: s.rel || this.freshRel('b1'), flags: s.flags || {}, cur: s.cur || null, flagsAtStart: s.flagsAtStart };
      ['done', 'rel', 'flags', 'cur', 'flagsAtStart'].forEach(k => { s[k] = undefined; });
    }
    if (!s.book || !this.bookDef(s.book)) s.book = 'b1';
    // st.done / st.rel / st.flags / st.cur always mean "the book being played"
    ['done', 'rel', 'flags', 'cur', 'flagsAtStart'].forEach(k => Object.defineProperty(s, k, {
      get: () => this.bk()[k], set: (v) => { this.bk()[k] = v; }, enumerable: false, configurable: true,
    }));
    this.refillKeys();
    return s;
  },

  // ---------- books ----------
  bookDef(id) { return BOOKS.find(b => b.id === id); },
  book() { return this.bookDef(this.st.book) || BOOKS[0]; },
  eps(id) { id = id || this.st.book; return EPISODES.filter(e => (e.book || 'b1') === id); },
  relKeys(id) { const b = this.bookDef(id || this.st.book) || {}; return b.rel || (b.carry ? this.relKeys(b.carry) : b.id === 'b1' ? REL_KEYS : {}); },
  freshRel(id) { const r = {}; for (const k in this.relKeys(id)) r[k] = 0; return r; },
  bk(id) {
    id = id || this.st.book;
    const all = this.st.books;
    if (!all[id]) {
      const b = this.bookDef(id) || {}, from = b.carry && all[b.carry];
      // a sequel starts with the earlier book's choices and relationships
      all[id] = { done: {}, rel: Object.assign(this.freshRel(id), from ? from.rel : {}), flags: from ? { ...from.flags } : {}, cur: null };
    }
    return all[id];
  },
  // read-only status for the library: never creates progress for a book the player hasn't opened
  bookInfo(b) {
    const eps = this.eps(b.id), p = this.st.books[b.id] || { done: {} };
    const done = eps.filter(e => p.done[e.id]).length;
    const finished = !!eps.length && done === eps.length;
    const locked = !!(b.after && !this.bookInfo(this.bookDef(b.after) || { id: b.after }).finished);
    const playable = b.live !== false && eps.length > 0;
    return { eps, done, finished, locked, playable, started: done > 0 || !!p.cur };
  },
  teaser(b) { b = b || this.book(); return b.teaser || (b.id === 'b1' && typeof NEXT_TEASER !== 'undefined' ? NEXT_TEASER : null); },
  save() { try { localStorage.setItem(STORY_KEY, JSON.stringify(this.st)); } catch (e) {} },
  refillKeys() {
    const s = this.st, now = Date.now();
    if (s.keys >= KEY_MAX) { s.keyTs = now; return; }
    const gained = Math.floor((now - s.keyTs) / KEY_MS);
    if (gained > 0) { s.keys = Math.min(KEY_MAX, s.keys + gained); s.keyTs += gained * KEY_MS; if (s.keys >= KEY_MAX) s.keyTs = now; }
  },
  nextKeyIn() { const ms = KEY_MS - (Date.now() - this.st.keyTs); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return t('{h}h {m}m', { h, m: String(m).padStart(2, '0') }); },
  fill(t) { return String(t).replace(/\{first\}/g, esc((this.st.name || 'Beta').split(' ')[0])); },
  // translated story text: tr(line) for the episode being played, et(e) for an episode's title,
  // bt(s) for book titles / blurbs / names / relationship labels (I18N '_common')
  tr(s, ep) { return I18N.s(ep || (this.ep && this.ep.id), s); },
  et(e) { return I18N.s(e.id, e.title); },
  bt(s) { return I18N.s('_common', s); },

  // ---------- HUD ----------
  // light: the bar on white pages (home, book). Dark-art scenes use the floating version.
  hudHtml(title, light) {
    return `<div class="st-hud ${light ? 'light' : ''}">
      ${light === 'home' ? `<div class="brand"><span class="brand-ball"></span><b>Gully <i>to</i> Glory</b></div>`
        : `<button class="st-iconbtn ${light ? 'back' : ''}" data-menu aria-label="${light ? t('Back') : t('Menu')}">${light ? '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<span></span><span></span><span></span>'}</button>
      <div class="st-title">${title || ''}</div>`}
      <div class="row" style="gap:6px"><button class="cur-pill" data-store data-gems>${GEM_SVG}<b>${this.st.diamonds}</b></button><button class="cur-pill" data-store data-keys>${KEY_SVG}<b>${this.st.keys}</b></button>${light === 'home' ? `<button class="st-iconbtn dots" data-settings aria-label="${t('Settings')}"><i></i><i></i><i></i></button>` : ''}</div>
    </div>`;
  },
  bumpCur() {
    const g = $('[data-gems] b'), k = $('[data-keys] b');
    if (g) { g.textContent = this.st.diamonds; g.parentElement.classList.remove('bump'); void g.offsetWidth; g.parentElement.classList.add('bump'); }
    if (k) k.textContent = this.st.keys;
  },
  bindHud(el, where) {
    $$('[data-store]', el).forEach(b => b.onclick = (e) => { e.stopPropagation(); this.store(); });
    const m = $('[data-menu]', el);
    if (m) m.onclick = (e) => { e.stopPropagation(); where === true ? this.pauseMenu() : (Sfx.select(), this.home()); };
    const st = $('[data-settings]', el);
    if (st) st.onclick = (e) => { e.stopPropagation(); this.settings(); };
  },
  // Android back button. Returns true when it handled the press.
  back() {
    const cur = UI.cur;
    if (!cur || !this.st) return false;
    if (cur.classList.contains('story-scene')) { this.pauseMenu(); return true; }
    if (cur.classList.contains('book-page') || cur.classList.contains('ep-end')) { Sfx.select(); this.home(); return true; }
    return false;
  },

  // ---------- Open ----------
  open() {
    this.load();
    Content.refresh().then(Content.announce);
    if (!I18N.chosen()) return this.pickLang(() => this.open(), true);
    if (!this.st.name) return this.askName();
    this.home();
  },
  library() { this.home(); }, // old name, still used by the content refresher

  // where a book stands: the chapter to play next and whether there's a saved place in it
  nextOf(b) {
    const i = this.bookInfo(b), p = this.st.books[b.id] || { done: {} };
    const cur = p.cur && i.eps.find(e => e.id === p.cur.ep);
    const nextIdx = i.eps.findIndex(e => !p.done[e.id]);
    return { info: i, cur, nextIdx, next: cur || i.eps[nextIdx] || null };
  },
  badge(b) {
    const i = this.bookInfo(b);
    return !i.playable ? `<span class="bdg soon">${t('Coming soon')}</span>`
      : i.locked ? `<span class="bdg lock">🔒 ${t('Book 2')}</span>`
      : i.finished ? `<span class="bdg done">✓ ${t('Finished')}</span>`
      : i.started ? `<span class="bdg prog">${i.done}/${i.eps.length}</span>`
      : `<span class="bdg new">${t('New')}</span>`;
  },
  coverStyle(art) { return Art.has(art) ? `background-image:url('${Art.url(art)}')` : ''; },

  // ---------- Home: hero, all stories, chapter list ----------
  home() {
    const s = this.st;
    // forget a saved place in an episode the server has withdrawn
    for (const id in s.books) { const c = s.books[id].cur; if (c && !EPISODES.some(e => e.id === c.ep)) s.books[id].cur = null; }
    this.refillKeys(); this.save();
    const order = BOOKS.slice().sort((a, b) => this.bookRank(a) - this.bookRank(b));
    const open = b => { const i = this.bookInfo(b); return i.playable && !i.locked && !i.finished; };
    // hero = the book you were reading, else the first one you can open
    const last = this.bookDef(s.book);
    const hero = (last && open(last) ? last : order.find(open)) || order[0];
    const H = this.nextOf(hero), HI = H.info;
    const pct = HI.eps.length ? Math.round(HI.done / HI.eps.length * 100) : 0;
    const newbie = !Object.values(s.books).some(p => Object.keys(p.done || {}).length);
    const heroBtn = !HI.playable || HI.locked ? '' : H.cur ? `▶ ${t('Continue Chapter {n}', { n: H.cur.no })}` : H.next ? `▶ ${t(HI.started ? 'Play Chapter {n}' : 'Start Chapter {n}', { n: H.next.no })} <span class="cost-tag">${KEY_SVG}1</span>` : '';
    const shelf = order.map(b => `<button class="shelf-card ${this.bookInfo(b).playable && !this.bookInfo(b).locked ? '' : 'shut'}" data-book-id="${esc(b.id)}">
        <div class="sc-cover" style="${this.coverStyle(b.art)}">${this.badge(b)}</div>
        <b>${esc(this.bt(b.title))}</b><span>${esc(this.bt((b.genre || '').split('·')[0].trim()))}</span></button>`).join('');
    // a short window of the hero book's chapters, around the next one
    const E = HI.eps, from = Math.max(0, Math.min((H.nextIdx < 0 ? E.length : H.nextIdx) - 1, E.length - 4));
    const rows = E.slice(from, from + 4).map((e, k) => this.chapterRow(hero, e, from + k)).join('');
    const el = UI.show(`<div class="screen story-home home">
      ${this.hudHtml('', 'home')}
      <div class="scroll home-body">
        <div class="hello">${t('Hi {name}', { name: esc((s.name || '').split(' ')[0]) })} <span class="wave">👋</span></div>
        <div class="hello-sub">${newbie ? t('Your story starts here. You make every choice.') : t('Pick up where you left off.')}</div>
        ${newbie ? `<button class="howto-chip" data-howto><span>?</span> ${t('New here? See how to play')}</button>` : ''}
        <div class="hero" data-hero="${esc(hero.id)}">
          <div class="hero-art" style="${this.coverStyle(hero.art)}"><div class="hero-fade"></div>${this.badge(hero)}</div>
          <div class="hero-body">
            <div class="hero-genre">${esc(this.bt(hero.genre || ''))}</div>
            <div class="hero-title">${esc(this.bt(hero.title))}</div>
            ${H.next && HI.playable && !HI.locked ? `<div class="hero-next">${t('Chapter {n}', { n: H.next.no })} · ${esc(this.et(H.next))}</div>` : `<div class="hero-next">${esc(this.bt(hero.blurb || ''))}</div>`}
            ${HI.playable && HI.started ? `<div class="pbar"><i style="width:${pct}%"></i></div><div class="pbar-l">${t('{done} of {total} chapters read', { done: HI.done, total: HI.eps.length })}</div>` : ''}
            ${heroBtn ? `<button class="btn primary block hero-btn" data-play>${heroBtn}</button>` : ''}
          </div>
        </div>
        <div class="sec-head"><h3>${t('All stories')}</h3><span>${t('{n} books', { n: BOOKS.length })}</span></div>
        <div class="shelf">${shelf}</div>
        ${E.length && HI.playable && !HI.locked ? `<div class="sec-head"><h3>${t('Chapters')}</h3><button data-see>${t('See all {n}', { n: E.length })} ›</button></div>
        <div class="ch-list">${rows}</div>` : ''}
        <div class="key-note">${s.keys < KEY_MAX ? `${KEY_SVG} ${t('Next free key in {time}', { time: this.nextKeyIn() })}` : `${KEY_SVG} ${t('Keys full. Each new chapter uses 1 key.')}`}</div>
      </div></div>`);
    this.bindHud(el, 'home');
    const hb = $('[data-play]', el);
    if (hb) hb.onclick = (e) => { e.stopPropagation(); Sfx.select(); this.st.book = hero.id; this.bk(); this.save(); H.cur ? this.resume() : this.tryStart(H.nextIdx); };
    $('[data-hero]', el).onclick = () => this.pickBook(hero.id);
    const see = $('[data-see]', el); if (see) see.onclick = () => this.pickBook(hero.id);
    const how = $('[data-howto]', el); if (how) how.onclick = () => this.howTo();
    $$('[data-book-id]', el).forEach(btn => btn.onclick = () => this.pickBook(btn.dataset.bookId));
    this.bindRows(el, hero);
  },
  pickBook(id) {
    const b = this.bookDef(id), i = this.bookInfo(b);
    if (!i.playable) return this.askNotify(true);
    if (i.locked) { Sfx.fail(); toast(t('Finish {prev} first. {book} picks up where it ends.', { prev: this.bt((this.bookDef(b.after) || {}).title || 'the last book'), book: this.bt(b.title) })); return; }
    Sfx.select(); this.openBook(b.id);
  },
  // in progress first, then new, finished, locked sequels, coming soon
  bookRank(b) { const i = this.bookInfo(b); return (!i.playable ? 40 : i.locked ? 30 : i.finished ? 20 : i.started ? 0 : 10) + BOOKS.indexOf(b) / 100; },
  openBook(id) { this.st.book = id; this.bk(); this.save(); this.bookScreen(); },

  // one compact line per chapter
  chapterRow(b, e, i) {
    const p = this.st.books[b.id] || { done: {} }, E = this.eps(b.id);
    const nextIdx = E.findIndex(x => !p.done[x.id]);
    const done = p.done[e.id], next = i === nextIdx, locked = nextIdx !== -1 && i > nextIdx;
    const here = p.cur && p.cur.ep === e.id;
    return `<button class="ch-row ${done ? 'done' : ''} ${next ? 'next' : ''} ${locked ? 'locked' : ''}" data-ep="${i}" data-b="${esc(b.id)}" ${locked ? 'disabled' : ''}>
      <span class="ch-no" style="${this.coverStyle(e.art)}"><em>${e.no}</em></span>
      <span class="ch-t"><b>${esc(this.et(e))}${I18N.has(e.id) ? '' : ' <i class="en-tag">EN</i>'}</b><small>${here ? t('In progress') : done ? t('Read · tap to replay') : next ? t('Up next') : t('Chapter {n}', { n: e.no })}</small></span>
      <span class="ch-cta">${done ? '<i class="tick">✓</i>' : locked ? '<i class="lk">🔒</i>' : here ? '<span class="go">▶</span>' : `<span class="cost-tag">${KEY_SVG}1</span>`}</span></button>`;
  },
  bindRows(el, b) {
    $$('.ch-row[data-ep]', el).forEach(btn => btn.onclick = () => {
      this.st.book = btn.dataset.b; this.bk(); this.save();
      const i = +btn.dataset.ep, c = this.st.cur;
      if (c && c.ep === this.eps()[i].id) { Sfx.select(); return this.resume(); }
      this.tryStart(i);
    });
  },

  settings() {
    const cur = LANGS.find(x => x.id === I18N.lang) || LANGS[0];
    openSheet(`<div class="pad"><div class="sheet-title">${t('Settings')}</div>
      <button class="btn ghost block" style="margin-top:14px" data-lang>🌐 ${t('Language')}: ${cur.native}</button>
      <button class="btn ghost block" style="margin-top:8px" data-howto>❓ ${t('How to play')}</button>
      <button class="btn ghost block" style="margin-top:8px" data-snd>${Sfx.muted ? '🔇 ' + t('Sound off') : '🔊 ' + t('Sound on')}</button>
      <button class="btn ghost block" style="margin-top:8px" data-bell>${Notify.granted() ? '🔔 ' + t('Notifications on') : '🔔 ' + t('Turn on notifications')}</button>
      <div class="tiny" style="margin-top:14px;text-align:center">${t('Playing as {name}', { name: esc(this.st.name || '') })}</div></div>`, sh => {
      $('[data-lang]', sh).onclick = () => { closeSheet(); setTimeout(() => this.pickLang(() => this.home()), 300); };
      $('[data-howto]', sh).onclick = () => { closeSheet(); setTimeout(() => this.howTo(), 300); };
      $('[data-snd]', sh).onclick = (e) => { Sfx.setMuted(!Sfx.muted); try { localStorage.setItem('gg_muted', Sfx.muted ? '1' : ''); } catch (er) {} e.target.textContent = Sfx.muted ? '🔇 ' + t('Sound off') : '🔊 ' + t('Sound on'); };
      $('[data-bell]', sh).onclick = () => { closeSheet(); setTimeout(() => this.askNotify(true), 300); };
    });
  },

  // Language picker: on first launch (full screen) and from Settings (sheet).
  pickLang(done, first) {
    const html = `<div class="lang-list">${LANGS.map(l => `<button class="lang-opt ${l.id === I18N.lang && !first ? 'on' : ''}" data-l="${l.id}"><b>${l.native}</b><span>${l.name}</span></button>`).join('')}</div>`;
    const choose = async (l) => {
      Sfx.select(); await I18N.set(l); await Content.lang(l);
      if (first) done(); else { closeSheet(); done(); }
    };
    if (first) {
      const el = UI.show(`<div class="screen story-home lang-page"><div class="scroll pad">
        <div class="brand big" style="justify-content:center;margin-top:28px"><span class="brand-ball"></span><b>Gully <i>to</i> Glory</b></div>
        <div class="np-h" style="text-align:center;margin-top:22px">Choose your language</div>
        <div class="np-sub" style="text-align:center">Bhasha chuno · भाषा चुनें · ভাষা বেছে নিন · ഭാഷ തിരഞ്ഞെടുക്കുക</div>${html}</div></div>`);
      $$('[data-l]', el).forEach(b => b.onclick = () => choose(b.dataset.l));
    } else {
      openSheet(`<div class="pad"><div class="sheet-title">${t('Language')}</div>${html}</div>`, sh => $$('[data-l]', sh).forEach(b => b.onclick = () => choose(b.dataset.l)));
    }
  },

  // Four plain steps. Shown once before the first chapter and any time from Settings / the pause menu.
  howTo(done) {
    const firstTime = !this.st.seenHowTo;
    const steps = [
      ['👆', t('Tap to read on'), t('Tap anywhere on the screen to see the next line. That\'s it.')],
      ['🤔', t('Make choices'), t('When buttons appear, pick one. Your choices change the story and how people feel about you.')],
      [GEM_SVG, t('Diamond choices'), t('Choices with a {gem} cost diamonds. You earn diamonds by finishing chapters. Free choices are always there too.', { gem: GEM_SVG })],
      ['🏏', t('Cricket moments'), t('Sometimes you bat. Tap the big <b>HIT</b> button when it turns green.')],
      [KEY_SVG, t('Keys'), t('Each new chapter uses 1 key. Keys refill for free every 3 hours, or watch a short ad to get one straight away. Replays are free.')],
    ];
    openSheet(`<div class="pad howto">
      <div class="sheet-title">${t('How to play')}</div>
      ${steps.map(([ic, h, d], k) => `<div class="ht-step" style="animation-delay:${.05 + k * .07}s"><div class="ht-ic">${ic}</div><div><b>${h}</b><p>${d}</p></div></div>`).join('')}
      <button class="btn primary block" style="margin-top:16px" data-ok>${t('Got it')}</button></div>`, sh => {
      $('[data-ok]', sh).onclick = () => { closeSheet(); if (firstTime) Track.ev('tutorial_complete'); done && setTimeout(done, 350); };
    });
    if (!this.st.seenHowTo) { this.st.seenHowTo = true; this.save(); }
  },

  askName() {
    const el = UI.show(`<div class="screen story-home name-page">
      <div class="np-art" style="${this.coverStyle('title')}"><div class="hero-fade"></div></div>
      <div class="scroll pad np-body">
        <div class="brand big"><span class="brand-ball"></span><b>Gully <i>to</i> Glory</b></div>
        <div class="np-h">${t('What should we<br>call you?')}</div>
        <div class="np-sub">${t('You\'re the hero. Every choice you make writes the story.')}</div>
        <input class="field" maxlength="20" placeholder="${t('Your name')}" data-name>
        <button class="btn primary block" style="margin:14px 0 24px" data-go>${t('Let\'s go')}</button>
      </div></div>`);
    const go = () => {
      const n = ($('[data-name]', el).value || '').trim();
      if (n.length < 2) { toast(t('Type your name first (2 letters or more).')); return; }
      this.st.name = n.replace(/\b\w/g, c => c.toUpperCase()); this.save(); Sfx.select(); this.home();
    };
    $('[data-go]', el).onclick = go;
    $('[data-name]', el).addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  },

  bookScreen() {
    this.refillKeys(); this.save();
    const s = this.st;
    const b = this.book(), EPS = this.eps(), T = this.teaser(b), RK = this.relKeys();
    if (s.cur && !EPS.some(e => e.id === s.cur.ep)) { s.cur = null; this.save(); } // episode was withdrawn from the server
    const nextIdx = EPS.findIndex(e => !s.done[e.id]);
    const curEp = s.cur && EPS.find(e => e.id === s.cur.ep);
    const doneN = EPS.filter(e => s.done[e.id]).length;
    const main = curEp ? `▶ ${t('Continue Chapter {n}', { n: curEp.no })}` : nextIdx >= 0 ? `▶ ${t(doneN ? 'Play Chapter {n}' : 'Start Chapter {n}', { n: EPS[nextIdx].no })} <span class="cost-tag">${KEY_SVG}1</span>` : '';
    const rels = Object.entries(RK).filter(([k]) => CAST[k]);
    const el = UI.show(`<div class="screen story-home book-page">
      ${this.hudHtml(esc(this.bt(b.title)), true)}
      <div class="scroll" style="padding-bottom:28px">
        <div class="bp-cover" style="${this.coverStyle(b.art)}"><div class="hero-fade"></div></div>
        <div class="pad bp-body">
          <div class="hero-genre">${esc(this.bt(b.genre || ''))}</div>
          <div class="hero-title">${esc(this.bt(b.title))}</div>
          <div class="bp-blurb">${esc(this.bt(b.blurb || ''))}</div>
          ${rels.length && doneN ? `<div class="rel-strip">${rels.map(([k, l]) => `<span class="rel-chip" style="--c:${CAST[k].col}">${esc(this.bt(l))} ${relHearts(s.rel[k])}</span>`).join('')}</div>` : ''}
          ${main ? `<button class="btn primary block" style="margin-top:14px" data-main>${main}</button>` : `<div class="all-read">✓ ${t('You\'ve read every chapter. Tap one to replay it and try other choices.')}</div>`}
          <div class="sec-head"><h3>${t('Chapters')}</h3><span>${t('{done} of {total} read', { done: doneN, total: EPS.length })}</span></div>
          <div class="ch-list">${EPS.map((e, i) => this.chapterRow(b, e, i)).join('')}
            ${T ? `<button class="ch-row soon" data-soon><span class="ch-no" style="${Art.has(T.art) ? this.coverStyle(T.art) : ''}"><em>${esc(String(T.no || ''))}</em></span><span class="ch-t"><b>${esc(this.bt(T.title || ''))}</b><small>${esc(T.note ? this.bt(T.note) : t('Coming soon'))}</small></span><span class="ch-cta"><i class="lk">${Notify.granted() ? '✅' : '🔔'}</i></span></button>` : ''}
          </div>
          <div class="key-note">${s.keys < KEY_MAX ? `${KEY_SVG} ${t('Next free key in {time}', { time: this.nextKeyIn() })}` : `${KEY_SVG} ${t('Keys full')}`}</div>
        </div>
      </div></div>`);
    this.bindHud(el, 'book');
    this.bindRows(el, b);
    const m = $('[data-main]', el);
    if (m) m.onclick = () => { Sfx.select(); curEp ? this.resume() : this.tryStart(nextIdx); };
    const soon = $('[data-soon]', el); if (soon) soon.onclick = () => this.askNotify(true);
  },
  tryStart(i) {
    const e = this.eps()[i], s = this.st;
    if (!s.seenHowTo) return this.howTo(() => this.tryStart(i));
    if (s.done[e.id]) { Sfx.select(); return this.startEpisode(i, true); }
    this.refillKeys();
    if (s.keys < 1) return this.noKeys();
    s.keys--; if (s.keys === KEY_MAX - 1) s.keyTs = Date.now();
    this.save(); this.scheduleReminders(); Sfx.coin(); this.startEpisode(i, false);
  },

  noKeys() {
    openSheet(`<div class="pad" style="text-align:center">
      <div class="big-ico">${KEY_SVG}</div>
      <div class="sheet-title">${t('Out of keys')}</div>
      <div class="muted small" style="margin-top:6px">${t('Next free key in {time}', { time: `<b class="gold">${this.nextKeyIn()}</b>` })}</div>
      <button class="btn primary block" style="margin-top:16px" data-ad ${this.adsLeft('key') > 0 ? '' : 'disabled'}>▶ ${t('Watch an ad · +1 key')}</button>
      ${this.adsLeft('key') <= 0 ? `<div class="tiny" style="margin-top:6px">${t('Ad keys used up for today')}</div>` : capNote(this.adsLeft('key')) ? `<div class="tiny" style="margin-top:6px">${t('{n} ad keys left today', { n: this.adsLeft('key') })}</div>` : ''}
      <button class="btn ghost block" style="margin-top:8px" data-shop>${t('Open store')}</button></div>`, sh => {
      $('[data-ad]', sh).onclick = async (e) => {
        const ok = await this.watchAd('key', e.currentTarget, () => { this.st.keys++; toast(`${KEY_SVG} ${t('+1 key')}`); });
        if (ok) closeSheet();
      };
      $('[data-shop]', sh).onclick = () => { closeSheet(); setTimeout(() => this.store(), 300); };
    });
  },

  // Launch build: free rewards only. Gem packs and VIP return with Google Play Billing.
  store() {
    const gemsLeft = Math.max(0, this.adsLeft('gems')), keysLeft = Math.max(0, this.adsLeft('key'));
    openSheet(`<div class="pad">
      <div class="row between"><div class="sheet-title">${t('Free rewards')}</div><div class="row" style="gap:6px"><span class="cur-pill">${GEM_SVG}<b>${this.st.diamonds}</b></span><span class="cur-pill">${KEY_SVG}<b>${this.st.keys}</b></span></div></div>
      <div class="small muted" style="margin-top:4px">${t('Watch a short video to earn rewards. Limits reset every day.')}</div>
      <button class="btn primary block" style="margin-top:14px" data-ad="gems" ${gemsLeft ? '' : 'disabled'}>▶ ${t('+5 diamonds')} <span class="tiny" style="margin-left:6px;color:#1a0c00">${t('{n} left today', { n: gemsLeft })}</span></button>
      <button class="btn ghost block" style="margin-top:8px" data-ad="key" ${keysLeft ? '' : 'disabled'}>▶ ${t('+1 key')}${capNote(keysLeft) ? ` <span class="tiny" style="margin-left:6px">${t('{n} left today', { n: keysLeft })}</span>` : ''}</button>
      <div class="small muted" style="text-align:center;margin-top:14px">${t('Free key every 3 hours · +2 diamonds for every new chapter')}</div></div>`, sh => {
      $$('[data-ad]', sh).forEach(btn => btn.onclick = async (e) => {
        const kind = btn.dataset.ad;
        const ok = await this.watchAd(kind, e.currentTarget, () => {
          if (kind === 'gems') { this.st.diamonds += 5; toast(`${GEM_SVG} ${t('+5 diamonds')}`); }
          else { this.st.keys++; toast(`${KEY_SVG} ${t('+1 key')}`); }
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
    if (kind !== 'double' && this.adsLeft(kind) <= 0) { toast(t('Daily ad limit reached. Come back tomorrow.')); return false; }
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = t('Loading ad…'); }
    Sfx.crowd(false);
    const pay = () => {
      if (kind !== 'double') { this.adsLeft(kind); this.st.adUsed[kind] = (this.st.adUsed[kind] || 0) + 1; }
      give(); this.save(); this.bumpCur(); Sfx.success();
      Track.ev('ad_reward', { kind });
    };
    const r = await Ads.show(kind, pay);
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
    if (r === 'rewarded') { pay(); return true; }
    if (r === 'skipped') {
      openSheet(`<div class="pad" style="text-align:center"><div style="font-size:46px;line-height:1">⏳</div>
        <div class="sheet-title" style="margin-top:6px">${t('The ad closed early')}</div>
        <div class="small muted" style="margin:8px auto 0;max-width:300px">${t('Google only gives the reward when the ad plays to the end. Some are two short ads in a row. Wait for the <b>✕</b> after the last one, then tap it.')}</div>
        <button class="btn primary block" style="margin-top:16px" data-ok>${t('OK')}</button></div>`, sh => { $('[data-ok]', sh).onclick = () => closeSheet(); });
      return false;
    }
    toast(t('No ad available right now. Try again in a minute.'));
    return false;
  },

  fakeAd(done) {
    const ov = document.createElement('div'); ov.className = 'fake-ad';
    ov.innerHTML = `<div class="tiny">Advertisement</div><div class="display" style="font-size:40px;margin:10px 0">Your ad here</div><div class="muted small">Real rewarded ads (AdMob) plug in here.</div><div class="ad-count">5</div>`;
    document.body.appendChild(ov);
    let n = 5; const t = setInterval(() => { n--; $('.ad-count', ov).textContent = n; if (n <= 0) { clearInterval(t); ov.remove(); Sfx.success(); done(); } }, 1000);
  },

  pauseMenu() {
    openSheet(`<div class="pad"><div class="sheet-title">${t('Paused')}</div>
      <button class="btn primary block" style="margin-top:14px" data-go>▶ ${t('Keep reading')}</button>
      <button class="btn ghost block" style="margin-top:8px" data-book>${t('All chapters')}</button>
      <button class="btn ghost block" style="margin-top:8px" data-home>${t('Home')}</button>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost grow" data-how>❓ ${t('How to play')}</button><button class="btn ghost grow" data-snd>${Sfx.muted ? '🔇 ' + t('Sound off') : '🔊 ' + t('Sound on')}</button></div>
      <div class="tiny" style="margin-top:12px;text-align:center">${t('Your place in this chapter is saved')}</div></div>`, sh => {
      $('[data-go]', sh).onclick = () => closeSheet();
      $('[data-how]', sh).onclick = () => { closeSheet(); setTimeout(() => this.howTo(), 300); };
      $('[data-home]', sh).onclick = () => { closeSheet(); this.abort = true; this.home(); };
      $('[data-book]', sh).onclick = () => { closeSheet(); this.abort = true; this.bookScreen(); };
      $('[data-snd]', sh).onclick = (e) => { Sfx.setMuted(!Sfx.muted); e.target.textContent = Sfx.muted ? '🔇 ' + t('Sound off') : '🔊 ' + t('Sound on'); };
    });
  },

  // ---------- Episode playback ----------
  async startEpisode(i, replay) {
    const e = this.eps()[i];
    this.ep = e; this.replay = replay; this.abort = false;
    this.labels = {}; e.nodes.forEach((n, k) => { if (n.label) this.labels[n.label] = k; });
    if (!replay) { this.st.flagsAtStart = { ...this.st.flags }; Track.ev('chapter_start', { book: this.st.book, chapter: e.no }); }
    this.scene = { bg: null, left: null, right: null, speaking: null };
    this.st.cur = { ep: e.id, pos: 0, scene: this.scene, replay };
    this.save();
    if (!I18N.has(e.id)) toast(t('This chapter is in English for now. Your language is coming soon.'));
    await this.titleCard(e);
    this.run(0);
  },
  resume() {
    const c = this.st.cur; const E = this.eps(); const i = E.findIndex(e => e.id === c.ep);
    if (i < 0) { this.st.cur = null; this.save(); return this.bookScreen(); }
    this.ep = E[i]; this.replay = c.replay; this.abort = false;
    this.labels = {}; this.ep.nodes.forEach((n, k) => { if (n.label) this.labels[n.label] = k; });
    this.scene = c.scene || { bg: null, left: null, right: null };
    this.run(c.pos);
  },

  async titleCard(e) {
    const el = UI.show(`<div class="screen ep-card">${Art.bg(e.art)}<div class="art-shade ep-card-shade"></div>
      <div class="ep-card-in"><div class="ep-card-no">${t('Chapter {n}', { n: e.no })}</div>
      <div class="ep-card-title">${esc(this.et(e))}</div><div class="ep-card-rule"></div>
      <div class="ep-card-book">${esc(this.bt(this.book().title))}</div></div>
      <div class="tap-pill">${t('Tap to start')}</div></div>`);
    Sfx.stinger(); haptic(30);
    await new Promise(r => setTimeout(() => el.addEventListener('click', r, { once: true }), 700));
  },

  renderScene() {
    const el = UI.show(`<div class="screen story-scene">
      <div class="st-bgwrap"><div class="st-bg a"></div><div class="st-bg b"></div></div>
      <div class="st-grad"></div>
      <canvas class="scene-fx" data-fx="dust" data-story-fx></canvas><div class="godrays" data-story-rays></div><div class="st-dark"></div>
      <div class="st-stage"><div class="chr left" data-side="left"></div><div class="chr right" data-side="right"></div></div>
      ${this.hudHtml(`${t('Ch {n}', { n: this.ep.no })} · ${esc(this.et(this.ep))}`)}
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
    Sfx.ambience(this.weather === 'rain' ? 'rain' : CONTENT_AMB[name] || ({ intro: 'stall', ch1: 'maidan', ch2: 'maidan', ch3: 'maidan', bd_maidan: 'night', ev_call: 'room', bg_home: 'room', bg_street_dusk: 'night', bg_club_match: 'maidan', bg_clubhouse_wall: 'maidan', bg_mandi_night: 'rain', bg_burnt_stall: 'stall', bg_hospital: 'room', bg_tennis_night: 'night', bg_hostel: 'room', bg_dressing_room: 'room', bg_hotel_lobby: 'room', bg_newsroom: 'room', bg_hearing_room: 'room', bg_stall_rebuilt: 'stall', ev_party: 'night', ch4: 'room', ch5: 'night', bd_stadium_night: 'night' }[name] || 'night'));
  },

  portraitHtml(id) {
    const c = CAST[id];
    if (Art.has('char_' + id)) return `<img class="cut" src="${Art.imgs['char_' + id].src}" alt="" draggable="false">`;
    // Painted-card fallback: framed character card using their event art, or a stylised silhouette
    const art = c.art && Art.has(c.art) ? `<div class="card-art" style="background-image:url('${Art.url(c.art)}')"></div>` : `<svg class="sil" viewBox="0 0 200 260"><defs><linearGradient id="sg_${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.col}" stop-opacity=".55"/><stop offset=".5" stop-color="#1a1526"/><stop offset="1" stop-color="#0b0a12"/></linearGradient></defs><path d="M100 30c22 0 38 18 38 42 0 18-9 33-22 39v10c34 6 62 26 70 60l6 79H8l6-79c8-34 36-54 70-60v-10c-13-6-22-21-22-39 0-24 16-42 38-42z" fill="url(#sg_${id})" stroke="${c.col}" stroke-width="2.5" stroke-opacity=".9"/></svg>`;
    return `<div class="chr-card" style="--c:${c.col}">${art}<div class="chr-card-shade"></div><div class="chr-card-name">${esc(this.bt(c.name))}</div></div>`;
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
    const parts = typeof Intl !== 'undefined' && Intl.Segmenter ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), x => x.segment) : Array.from(text);
    return new Promise(res => {
      const finish = () => { if (done) return; done = true; clearInterval(tm); node.textContent = text; res(); };
      const tm = setInterval(() => { i += 1; node.textContent = parts.slice(0, i).join(''); if (i % 3 === 0) Sfx.tick && Sfx.tick(); if (i >= parts.length) finish(); }, speed);
      this.tapFn = () => { this.tapFn = null; finish(); };
    });
  },

  async line(kind, who, text, mood, ex) {
    const layer = $('[data-layer]', this.el);
    text = this.fill(this.tr(text));
    const reveal = mood === 'reveal';
    this.el.classList.toggle('reveal-on', reveal);
    if (kind === 'n') {
      this.focus(null);
      layer.innerHTML = `<div class="cap ${reveal ? 'reveal' : ''}"><div class="cap-in"><span data-tx></span></div></div>`;
      if (reveal) { Sfx.boom(); haptic(220); setTimeout(() => Sfx.heartbeat(), 700); setTimeout(() => Sfx.heartbeat(), 1800); }
    } else if (kind === 'th') {
      this.focus(null);
      layer.innerHTML = `<div class="thought"><div class="th-label">${t('{name} · thinking', { name: esc(this.st.name.split(' ')[0]) })}</div><div class="th-tx" data-tx></div><i class="d1"></i><i class="d2"></i><i class="d3"></i></div>`;
    } else {
      const c = CAST[who]; const side = this.scene.left === who ? 'left' : this.scene.right === who ? 'right' : 'center';
      this.focus(who);
      const shout = mood === 'shout';
      const autoEx = ex || (shout ? 'angry' : mood === 'soft' ? { papa: 'sad', pandey: 'proud' }[who] : null);
      this.expr(who, autoEx);
      layer.innerHTML = `<div class="bub ${side} ${mood || ''}" style="--c:${c.col}">
        ${shout ? burstSvg() : ''}
        <svg class="tail" viewBox="0 0 40 30"><path d="M4 30 L18 2 L36 30" /></svg>
        <div class="np">${esc(this.bt(c.name))}</div>
        <div class="bub-tx" data-tx></div><div class="nxt"></div></div>`;
      if (shout) { shake(); haptic(40); Sfx.edge(); const bw = $('.st-bgwrap', this.el); bw.classList.remove('punch'); void bw.offsetWidth; bw.classList.add('punch'); }
    }
    const tx = $('[data-tx]', layer);
    const coach = (this.st.taps || 0) < 6;
    await this.typeInto(tx, text, reveal ? 75 : kind === 'n' ? 26 : 20);
    layer.firstElementChild.classList.add('ready');
    if (coach) { this.st.taps = (this.st.taps || 0) + 1; layer.insertAdjacentHTML('beforeend', `<div class="tap-pill in-scene">👆 ${t('Tap anywhere to continue')}</div>`); }
    await this.waitTap();
  },

  async phone(from, msgs) {
    const layer = $('[data-layer]', this.el);
    this.focus(null);
    layer.innerHTML = `<div class="phone"><div class="ph-notch"></div><div class="ph-head"><div class="ph-av">${esc(Array.from(this.bt(from))[0])}</div><div><b>${esc(this.bt(from))}</b><div class="tiny" style="letter-spacing:.04em;text-transform:none">${t('online')}</div></div></div><div class="ph-body" data-pb></div><div class="ph-foot">${t('Message')}</div></div>`;
    Sfx.coin(); haptic(30);
    const body = $('[data-pb]', layer);
    for (const m of msgs) {
      body.insertAdjacentHTML('beforeend', '<div class="ph-typing"><i></i><i></i><i></i></div>');
      await sleep(650);
      body.lastElementChild.remove();
      body.insertAdjacentHTML('beforeend', `<div class="ph-msg">${esc(this.fill(this.tr(m.t)))}<span class="ph-time">${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}</span></div>`);
      haptic(12); Sfx.tap();
      await sleep(350);
    }
    layer.firstElementChild.classList.add('ready');
    await this.waitTap();
  },

  async choice(opts) {
    const layer = $('[data-layer]', this.el);
    this.focus(null);
    const list = opts.filter(o => o.show === undefined || storyCond(o.show, this.st));
    layer.innerHTML = `<div class="choices-box"><div class="ch-head">${(this.st.picks || 0) < 2 ? t('Your choice · tap one') : t('What do you do?')}</div>${list.map((o, i) => {
      const prem = !!o.cost; const can = !prem || this.st.diamonds >= o.cost;
      return `<button class="opt ${prem ? 'prem' : `c${i % 3}`} ${can ? '' : 'cant'}" data-i="${i}" style="animation-delay:${.08 + i * .09}s"><div class="opt-main"><b>${this.fill(this.tr(o.t))}</b>${o.d ? `<span>${this.fill(this.tr(o.d))}</span>` : ''}</div>${prem ? `<div class="gem-cost">${GEM_SVG}<b>${o.cost}</b></div>` : ''}</button>`;
    }).join('')}</div>`;
    return new Promise(res => {
      $$('.opt', layer).forEach(b => b.onclick = (e) => {
        e.stopPropagation();
        const o = list[+b.dataset.i];
        if (o.cost && this.st.diamonds < o.cost) { Sfx.fail(); this.store(); return; }
        if (o.cost) { this.st.diamonds -= o.cost; this.bumpCur(); Sfx.coin(); Burst.sparks(b.getBoundingClientRect().right - 40, b.getBoundingClientRect().top + 20, 30, '#7ef0ff'); }
        else Sfx.select();
        haptic(15);
        this.st.picks = (this.st.picks || 0) + 1;
        b.classList.add('picked'); $$('.opt', layer).forEach(x => { if (x !== b) x.classList.add('gone'); });
        setTimeout(() => res(o), 420);
      });
    });
  },

  applyFx(fx, set) {
    if (set) this.st.flags[set] = true;
    if (!fx) return;
    for (const k in fx) {
      const v = fx[k]; if (!v) continue;
      if (!(k in this.st.rel)) { if (!(k in this.relKeys())) continue; this.st.rel[k] = 0; }
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
      if (n.if) { const ok = storyCond(n.if, this.st); if (ok) i = this.labels[n.go] - 1; continue; }
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
  async momentIntro(cfg) {
    Sfx.rise(); haptic(30);
    const goal = cfg.kind === 'chase' ? t('Score <b>{runs}</b> runs in <b>{balls}</b> balls', { runs: cfg.need, balls: cfg.balls }) : t('Don\'t get out for <b>{balls}</b> balls', { balls: cfg.balls });
    UI.show(`<div class="screen story-home moment-intro">
      <div class="mi-card">
        <div class="mi-tag">🏏 ${t('Cricket moment')}</div>
        <div class="mi-title">${esc(this.tr(cfg.title))}</div>
        <div class="mi-desc">${this.tr(cfg.desc || '')}</div>
        <div class="mi-goal">${goal}</div>
        <div class="mi-how">
          <div class="mi-demo"><span class="mi-btn">${t('HIT!')}</span><span class="mi-btn go">${t('HIT!')}</span></div>
          <p>${t('Watch the ball. When the <b>HIT</b> button turns <b class="grn">green</b>, tap it. We pick the right shot for you.')}</p>
        </div>
        <button class="btn primary block" data-go>${t('I\'m ready')}</button>
      </div></div>`);
    await UI.waitTap('[data-go]');
  },
  async playMoment(cfg) {
    const s = this.st, f = s.flags;
    await this.momentIntro(cfg);
    const el = UI.show(`<div class="screen match-screen"><div class="mroot" style="position:absolute;inset:0"></div>
      <div class="m-hud"><div class="scorebug" style="--c1:#b45309"><div class="tm">RGK</div><div class="sc" data-sc>0</div><div class="ov" data-ov></div><div class="need" data-need></div></div>
      <div class="m-brief"><div class="bt">${esc(this.tr(cfg.title))}</div><div class="small" data-bd></div></div></div></div>`, 'fast');
    const pressure = cfg.kind === 'chase' ? .6 : .45;
    Moments.open($('.mroot', el), { view: 'bat', simple: true, level: 0, whiteBall: false, bowlerType: 'pace', pressure, myKit: '#b45309', batKit: '#f4ede4', bowlKit: cfg.kind === 'duel' ? '#7c3aed' : '#475569' });
    UI.pressure(pressure > .5);
    const skill = 36 + (f.tyre ? 7 : 0) + (f.wonDuel ? 3 : 0) + (f.goodBat ? 5 : 0) + (f.rockyMentor ? 5 : 0) + (f.campImpress ? 2 : 0) + Math.max(0, s.rel.pandey || 0);
    const steady = f.focused || f.calm;
    const ctx = {
      batSkill: skill, bowlSkill: (cfg.kind === 'duel' ? 40 : 42) + (cfg.hard && f[cfg.hard] ? 7 : 0), ready: f.pinkyBox ? .03 : 0,
      window: .095 + (f.drill ? .03 : 0), readFrac: f.drill ? .15 : .55, slow: 1.2,
    };
    ctx.wobble = ctx.window * (steady ? .45 : .8) * (f.drill ? .7 : 1); ctx.wobbleF = steady ? 5 : 8;
    let runs = 0, out = false, legal = 0;
    const need = cfg.need || 0;
    while (legal < cfg.balls) {
      $('[data-sc]', el).textContent = cfg.kind === 'chase' ? `${runs}` : `${runs}*`;
      $('[data-ov]', el).textContent = t('Ball {n}/{of}', { n: legal + 1, of: cfg.balls });
      const nd = $('[data-need]', el);
      if (cfg.kind === 'chase') nd.textContent = t('NEED {runs} OFF {balls}', { runs: need - runs, balls: cfg.balls - legal }); else nd.textContent = t('SURVIVE');
      $('[data-bd]', el).innerHTML = `${esc(this.bt(cfg.bowler))} · ${f.drill ? `<span class="teal">${t('Watch the wrist: short balls show early')}</span>` : t('Tap HIT when it glows green')}`;
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
    Track.ev('moment_end', { win: win ? 1 : 0, kind: cfg.kind || '' });
    await sleep(500);
    Moments.showCall(win ? (cfg.winCall ? this.tr(cfg.winCall) : t(cfg.kind === 'chase' ? 'WON IT!' : 'SURVIVED!')) : (cfg.loseCall ? this.tr(cfg.loseCall) : t(cfg.kind === 'chase' ? 'SO CLOSE' : 'BOWLED')), win ? 'call-six' : 'call-out', win ? (cfg.winSub ? this.tr(cfg.winSub) : t('The maidan erupts.')) : (cfg.loseSub ? this.tr(cfg.loseSub) : t('Silence.')));
    if (win) { Burst.confetti(180); Sfx.cheer(1.4); haptic(150); } else Sfx.groan();
    await sleep(2200);
    Moments.close();
    return win;
  },

  async endCard(n) {
    const s = this.st, e = this.ep;
    const first = !s.done[e.id];
    s.done[e.id] = true; s.cur = null;
    if (first) {
      const read = Object.values(s.books).reduce((n, p) => n + Object.keys(p.done || {}).length, 0);
      Track.ev('chapter_complete', { book: s.book, chapter: e.no, read });
      if (read === 1) Track.ev('first_chapter_complete', { book: s.book });
      if (read === 3) Track.ev('third_chapter_complete', { book: s.book });
    }
    if (first) s.diamonds += 2;
    this.save();
    const E = this.eps(), nextIdx = E.findIndex(x => x.id === e.id) + 1;
    const next = E[nextIdx], T = this.teaser();
    // finished the book? point at the sequel if it's out
    const sequel = !next && BOOKS.find(x => x.after === this.st.book && this.bookInfo(x).playable);
    const el = UI.show(`<div class="screen story-home ep-end">
      <div class="scroll" style="padding-bottom:28px">
      <div class="end-art" style="${this.coverStyle(e.art)}"><div class="hero-fade"></div><span class="end-badge">${t('Chapter {n} complete', { n: e.no })}</span></div>
      <div class="pad" style="text-align:center;padding-top:0">
        <div class="tbc">${t('To be continued')}<span>...</span></div>
        <div class="cliff">${esc(this.fill(this.tr(n.cliff)))}</div>
        ${first ? `<div class="reward">${GEM_SVG}<b>+2</b><span>${t('Earned')}</span></div><button class="btn block btn-double" data-double>▶ ${t('Watch an ad · Double it')} <span class="dbl-gem">${GEM_SVG}+2</span></button>` : ''}
        ${next ? `<button class="btn primary block" style="margin-top:18px" data-next>▶ ${t('Next: Chapter {n}', { n: next.no })} <span class="cost-tag">${KEY_SVG}1</span></button>` : sequel ? `<button class="btn primary block" style="margin-top:18px" data-sequel>${t('Start {book}', { book: esc(this.bt(sequel.title)) })}</button>` : T ? `<div class="card" style="margin-top:18px"><b class="cond gold">${/^\d+$/.test(String(T.no)) ? t('Chapter {n}', { n: T.no }) + ': ' : ''}${esc(this.bt(T.title || ''))} · ${esc(T.note ? this.bt(T.note) : t('Coming soon'))}</b><div class="small muted">${t('Turn on notifications so you don\'t miss it.')}</div></div>` : ''}
        <div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost grow" data-book>${t('Chapters')}</button><button class="btn ghost grow" data-lib>${t('Home')}</button></div>
        <div class="rel-sum">${Object.entries(this.relKeys()).filter(([k]) => CAST[k]).map(([k, l]) => `<div class="rel-row" style="--c:${CAST[k].col}"><span>${esc(this.bt(l))}</span><span>${relHearts(s.rel[k])}</span></div>`).join('')}</div>
      </div></div></div>`);
    Sfx.stinger(); if (first) setTimeout(() => { Sfx.coin(); Burst.sparks(innerWidth / 2, innerHeight * .45, 40, '#7ef0ff'); }, 900);
    if (next) $('[data-next]', el).onclick = () => this.tryStart(nextIdx);
    const dbl = $('[data-double]', el);
    if (dbl) dbl.onclick = async () => {
      const ok = await this.watchAd('double', dbl, () => { this.st.diamonds += 2; toast(`${GEM_SVG} ${t('+2 diamonds')}`); });
      if (ok) { dbl.outerHTML = `<div class="dbl-done">✓ ${t('Doubled · {gem}+4 this chapter', { gem: GEM_SVG })}</div>`; Burst.sparks(innerWidth / 2, innerHeight * .42, 40, '#7ef0ff'); }
    };
    $('[data-book]', el).onclick = () => this.bookScreen();
    $('[data-lib]', el).onclick = () => this.home();
    const sq = $('[data-sequel]', el); if (sq) sq.onclick = () => { Sfx.select(); this.openBook(sequel.id); };
    this.scheduleReminders();
    const askBell = e.no >= 3 && !s.notifyAsked && !Notify.granted();
    if (askBell) setTimeout(() => this.askNotify(false), 2200);
    else if (first) this.maybeReview();
  },

  // Google Play's rating card, after finishing a chapter: at 2, 6 and 12 chapters read (across all books).
  // No "do you like the game?" question first: Play's rules forbid steering who gets asked.
  maybeReview() {
    const s = this.st, read = Object.values(s.books).reduce((n, p) => n + Object.keys(p.done || {}).length, 0);
    const at = [2, 6, 12].find(m => read >= m && !(s.reviewAt || []).includes(m));
    if (!at || !(window.AndroidBridge && AndroidBridge.requestReview)) return;
    s.reviewAt = (s.reviewAt || []).concat(at); this.save();
    setTimeout(() => { try { AndroidBridge.requestReview(); } catch (e) {} }, 2600);
  },

  // Soft pre-prompt first; Android's own dialog only if the player says yes.
  askNotify(fromBell) {
    const st = Notify.state();
    if (st === 'granted') { toast('🔔 ' + t('Notifications are on. We\'ll tell you when the story continues.')); return; }
    if (st === 'denied' && !fromBell) return;
    openSheet(`<div class="pad" style="text-align:center">
      <div style="font-size:54px;line-height:1;margin:4px 0 6px">🔔</div>
      <div class="sheet-title">${t('Don\'t miss what happens next')}</div>
      <div class="small muted" style="margin:8px auto 0;max-width:300px">${t('We\'ll tell you when your free key refills and when the next chapter is waiting. No spam.')}</div>
      ${st === 'denied' ? `<div class="small" style="margin-top:10px;color:var(--gold)">${t('Notifications are off for this app. Turn them on in Android Settings → Apps → Gully to Glory → Notifications.')}</div>` : ''}
      <button class="btn primary block" style="margin-top:16px" data-yes ${st === 'denied' ? 'disabled' : ''}>${t('Notify me')}</button>
      <button class="btn ghost block" style="margin-top:8px" data-no>${t('Not now')}</button></div>`, sh => {
      $('[data-yes]', sh).onclick = async () => {
        this.st.notifyAsked = true; this.save(); closeSheet();
        const ok = await Notify.request();
        if (ok) { toast('🔔 ' + t('You\'re in. We\'ll ping you.')); this.scheduleReminders(); } else toast(t('No problem. You can turn them on any time.'));
        Content.redraw();
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
      const nextEp = this.eps().find(e => !s.done[e.id]);
      Notify.schedule(Notify.KEY_ID, due, '🔑 ' + t('Your key is ready'), nextEp ? t('Chapter {n}, "{title}", is waiting for you.', { n: nextEp.no, title: this.et(nextEp) }) : t('Replay a chapter and try a different choice.'));
    } else Notify.cancel(Notify.KEY_ID);
    const lastDone = [...this.eps()].reverse().find(e => s.done[e.id]);
    const cliff = lastDone ? (lastDone.nodes.find(n => n.end) || {}).cliff : null;
    Notify.schedule(Notify.COMEBACK_ID, 22 * 60 * 60 * 1000, 'Gully to Glory', cliff ? this.fill(this.tr(cliff, lastDone.id)) : t('Rajgarh is waiting. Your story isn\'t over.'));
  },
};

function relHearts(v) { const n = clamp(Math.round((v + 3) / 2), 0, 5); return '<span class="hearts">' + '♥'.repeat(n) + '<i>' + '♥'.repeat(5 - n) + '</i></span>'; }

function rememberToast(k, v) {
  const c = CAST[k];
  const el = document.createElement('div'); el.className = 'remember'; el.style.setProperty('--c', c.col);
  const nm = I18N.s('_common', c.name);
  el.innerHTML = `<span class="rm-av">${esc(Array.from(nm)[0])}</span><span>${t('<b>{name}</b> will remember that.', { name: esc(nm) })}</span><span class="rm-dir ${v > 0 ? 'up' : 'down'}">${v > 0 ? '▲' : '▼'}</span>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2800);
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

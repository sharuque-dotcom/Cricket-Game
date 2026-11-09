// Live content: new Story Mode episodes downloaded from the server, so they don't need a Play release.
// The server holds content/manifest.json + one JSON file per episode (see content/README.md).
// Downloaded episodes are saved on the phone, so they still play offline.
// Downloads are data only (JSON + images), never code.

const CONTENT_ENGINE = 1; // bump when the episode format gains features older apps can't play
const CONTENT_KEY = 'gg_content_v1';
const CONTENT_BASES = [
  'https://raw.githubusercontent.com/sharuque-dotcom/Cricket-Game/HEAD/content/',
  'https://cdn.jsdelivr.net/gh/sharuque-dotcom/Cricket-Game/content/',
];
const CONTENT_REFRESH_MS = 30 * 60 * 1000;
const NODE_KEYS = ['bg', 'weather', 'n', 'enter', 'exit', 's', 'th', 'phone', 'choice', 'label', 'go', 'if', 'fx', 'set', 'moment', 'end'];

// Story conditions that can live in JSON: "flag", "!flag", {any:[...]}, {all:[...]}, {not:c}, {rel:'papa', min:2, max:5}
function storyCond(c, st) {
  if (typeof c === 'function') return !!c(st);
  if (typeof c === 'string') return c[0] === '!' ? !st.flags[c.slice(1)] : !!st.flags[c];
  if (!c || typeof c !== 'object') return false;
  if (Array.isArray(c.any)) return c.any.some(x => storyCond(x, st));
  if (Array.isArray(c.all)) return c.all.every(x => storyCond(x, st));
  if ('not' in c) return !storyCond(c.not, st);
  if (c.rel) { const v = (st.rel || {})[c.rel] || 0; return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max); }
  return false;
}

const Content = (() => {
  let bundledIds = null, lastCheck = 0, busy = null;
  const remoteArt = new Set();
  const RE_NAME = /^[a-z0-9_]{1,40}$/, RE_COL = /^#[0-9a-f]{3,8}$/i, RE_PATH = /^[a-z0-9_\-/]+\.(jpg|jpeg|png|webp)$/i;

  // Strip anything that could become HTML: story text is shown with innerHTML in places.
  function clean(v) {
    if (typeof v === 'string') return v.replace(/[<>]/g, '');
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = clean(v[k]); return o; }
    return v;
  }

  function condErrors(c, where, out) {
    if (typeof c === 'string') { if (!c.replace(/^!/, '')) out.push(where + ': empty condition'); return; }
    if (!c || typeof c !== 'object') { out.push(where + ': bad condition'); return; }
    if (Array.isArray(c.any) || Array.isArray(c.all)) (c.any || c.all).forEach(x => condErrors(x, where, out));
    else if ('not' in c) condErrors(c.not, where, out);
    else if (typeof c.rel !== 'string') out.push(where + ': unknown condition ' + JSON.stringify(c));
  }

  // Returns a list of problems; an episode with any problem is never shown to players.
  function validate(ep, cast, known) {
    const err = [], at = (i) => `${ep && ep.id || '?'} node ${i}`;
    if (!ep || typeof ep !== 'object') return ['not an object'];
    if (typeof ep.id !== 'string' || !RE_NAME.test(ep.id)) err.push('bad id');
    if (typeof ep.no !== 'number') err.push('no must be a number');
    if (typeof ep.title !== 'string' || !ep.title) err.push('missing title');
    if (ep.art && !RE_NAME.test(ep.art)) err.push('bad art name');
    if (ep.book !== undefined && !RE_NAME.test(ep.book)) err.push('bad book id');
    if (!Array.isArray(ep.nodes) || !ep.nodes.length) return err.concat('no nodes');
    const allCast = Object.assign({}, cast, ep.cast || {});
    for (const k in ep.cast || {}) {
      const c = ep.cast[k];
      if (!RE_NAME.test(k) || !c || typeof c.name !== 'string' || !RE_COL.test(c.col || '')) err.push('bad cast entry ' + k);
      if (c && c.art && !RE_NAME.test(c.art)) err.push('bad cast art ' + k);
    }
    const labels = new Set(ep.nodes.filter(n => n && typeof n.label === 'string').map(n => n.label));
    const needLabel = (l, i) => { if (!labels.has(l)) err.push(`${at(i)}: label "${l}" not found`); };
    const needCast = (w, i) => { if (!allCast[w]) err.push(`${at(i)}: unknown character "${w}"`); };
    let ends = 0;
    ep.nodes.forEach((n, i) => {
      if (!n || typeof n !== 'object') { err.push(at(i) + ': not an object'); return; }
      if (!Object.keys(n).some(k => NODE_KEYS.includes(k))) err.push(`${at(i)}: unknown node ${JSON.stringify(n).slice(0, 60)}`);
      if (n.bg !== undefined && !RE_NAME.test(n.bg)) err.push(`${at(i)}: bad bg name`);
      if (n.enter !== undefined) needCast(n.enter, i);
      if (n.exit !== undefined && n.exit !== 'all') needCast(n.exit, i);
      if (n.s !== undefined) { needCast(n.s, i); if (typeof n.t !== 'string') err.push(`${at(i)}: speech without t`); }
      if (n.if !== undefined) { condErrors(n.if, at(i), err); needLabel(n.go, i); }
      else if (n.go !== undefined) needLabel(n.go, i);
      if (n.phone !== undefined && (!Array.isArray(n.msgs) || !n.msgs.every(m => m && typeof m.t === 'string'))) err.push(`${at(i)}: phone needs msgs [{t}]`);
      if (n.choice !== undefined) {
        if (!Array.isArray(n.choice) || !n.choice.length) err.push(`${at(i)}: empty choice`);
        else n.choice.forEach((o, j) => {
          if (!o || typeof o.t !== 'string') err.push(`${at(i)} option ${j}: missing t`);
          if (o && o.go !== undefined) needLabel(o.go, i);
          if (o && o.show !== undefined) condErrors(o.show, `${at(i)} option ${j}`, err);
          if (o && o.cost !== undefined && !(o.cost > 0)) err.push(`${at(i)} option ${j}: bad cost`);
        });
        // a choice must always leave at least one option the player can pick
        if (Array.isArray(n.choice) && n.choice.every(o => o && (o.show !== undefined || o.cost))) err.push(`${at(i)}: every option is hidden or paid; add a free, always-visible one`);
      }
      if (n.moment !== undefined) {
        const m = n.moment;
        if (!m || typeof m.balls !== 'number' || typeof m.title !== 'string') err.push(`${at(i)}: moment needs title and balls`);
        needLabel(n.win, i); needLabel(n.lose, i);
      }
      if (n.end !== undefined) { ends++; if (typeof n.cliff !== 'string') err.push(`${at(i)}: end needs cliff`); }
    });
    if (!ends) err.push('no end node');
    if (known && known.has(ep.id)) err.push('id clashes with a built-in episode');
    return err;
  }

  function read() { try { return JSON.parse(localStorage.getItem(CONTENT_KEY)) || null; } catch (e) { return null; } }
  function write(d) { try { localStorage.setItem(CONTENT_KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function base() { try { const b = localStorage.getItem('gg_content_base'); if (b) return [b]; } catch (e) {} return CONTENT_BASES; }

  async function getJson(path, bust) {
    let last;
    for (const b of base()) {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const t = setTimeout(() => ctl && ctl.abort(), 8000);
      try {
        const r = await fetch(b + path + (bust ? '?t=' + bust : ''), { cache: 'no-store', signal: ctl && ctl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return { json: await r.json(), base: b };
      } catch (e) { last = e; } finally { clearTimeout(t); }
    }
    throw last || new Error('offline');
  }

  // Put downloaded episodes, art and teaser into the live game. Returns ids that weren't there before.
  // Books from the manifest: new ones join the library, existing ones get updated (e.g. live: true).
  function applyBooks(list) {
    const ok = (v) => v === undefined || RE_NAME.test(v);
    for (const b of list || []) {
      if (!b || !RE_NAME.test(b.id || '') || !ok(b.art) || !ok(b.after) || !ok(b.carry)) continue;
      const keep = {};
      ['title', 'genre', 'blurb'].forEach(k => { if (typeof b[k] === 'string') keep[k] = b[k]; });
      ['art', 'after', 'carry'].forEach(k => { if (b[k] !== undefined) keep[k] = b[k]; });
      if (typeof b.live === 'boolean') keep.live = b.live;
      if (b.teaser && typeof b.teaser === 'object' && ok(b.teaser.art)) keep.teaser = { no: b.teaser.no, title: String(b.teaser.title || ''), art: b.teaser.art, note: String(b.teaser.note || 'Coming soon') };
      if (b.rel && typeof b.rel === 'object') { keep.rel = {}; for (const k in b.rel) if (RE_NAME.test(k)) keep.rel[k] = String(b.rel[k]); }
      const have = BOOKS.find(x => x.id === b.id);
      if (have) Object.assign(have, keep); else if (keep.title) BOOKS.push(Object.assign({ id: b.id, live: true }, keep));
    }
  }
  // the relationship list an episode's `rel` should add to (a sequel shares its first book's list)
  function relMap(id, seen) {
    const b = BOOKS.find(x => x.id === id);
    if (!b || b.id === 'b1') return REL_KEYS;
    if (b.rel) return b.rel;
    if (b.carry && !(seen || []).includes(b.carry)) return relMap(b.carry, (seen || []).concat(id));
    return (b.rel = {});
  }

  function apply(d) {
    if (!d || !d.manifest) return [];
    if (!bundledIds) bundledIds = new Set(EPISODES.map(e => e.id));
    const m = d.manifest, added = [];
    applyBooks(m.books);
    for (let i = EPISODES.length - 1; i >= 0; i--) if (EPISODES[i]._remote && !(d.episodes || {})[EPISODES[i].id]) EPISODES.splice(i, 1);
    const list = (m.episodes || []).filter(x => x && d.episodes && d.episodes[x.id]).sort((a, b) => a.no - b.no);
    for (const entry of list) {
      const ep = d.episodes[entry.id];
      if (bundledIds.has(ep.id)) continue;
      Object.assign(CAST, ep.cast || {});
      if (ep.rel) { const R = relMap(ep.book || 'b1'); for (const k in ep.rel) if (CAST[k]) R[k] = ep.rel[k]; }
      const live = Object.assign({}, ep, { _remote: true, _rev: ep._rev || 0 });
      const idx = EPISODES.findIndex(e => e.id === ep.id);
      if (idx >= 0) EPISODES[idx] = live; else { EPISODES.push(live); added.push(ep.id); }
    }
    EPISODES.sort((a, b) => a.no - b.no);
    if (m.teaser && typeof NEXT_TEASER !== 'undefined') Object.assign(NEXT_TEASER, m.teaser);
    if (m.fallback) Object.assign(BG_FALLBACK, m.fallback);
    if (m.fx) Object.assign(FX_FOR_ART, m.fx);
    if (Array.isArray(m.day)) m.day.forEach(n => DAY_ART.add(n));
    if (m.amb) Object.assign(CONTENT_AMB, m.amb);
    Art.applyFallbacks();
    return added;
  }

  // Remote paintings load straight from the server; until they arrive (or when offline) the fallback art shows.
  function loadArt(m, b) {
    const jobs = [];
    const one = (key, path) => new Promise(res => {
      if (!RE_PATH.test(path) || path.includes('..')) return res();
      if (remoteArt.has(key + path)) return res();
      const im = new Image();
      im.onload = () => { Art.imgs[key] = im; remoteArt.add(key + path); res(); };
      im.onerror = () => res();
      im.src = b + path;
    });
    for (const k in m.art || {}) if (RE_NAME.test(k)) jobs.push(one(k, m.art[k]));
    for (const k in m.chars || {}) if (RE_NAME.test(k)) jobs.push(one('char_' + k, m.chars[k]));
    return Promise.all(jobs);
  }

  return {
    validate, clean,
    // Apply whatever was saved last time. Synchronous, so the episode list is right even offline.
    init() { const d = read(); if (d) { try { apply(d); } catch (e) { console.warn('content cache', e); } } },

    // Check the server for new or updated episodes. Safe to call often; it throttles itself.
    refresh(force) {
      if (busy) return busy;
      if (!force && Date.now() - lastCheck < CONTENT_REFRESH_MS) return Promise.resolve([]);
      lastCheck = Date.now();
      busy = (async () => {
        const old = read() || { episodes: {} };
        const { json: man, base: b } = await getJson('manifest.json', Date.now());
        if (!man || !Array.isArray(man.episodes)) throw new Error('bad manifest');
        const cleanMan = clean(man);
        const known = new Set(EPISODES.filter(e => !e._remote).map(e => e.id));
        const eps = {};
        for (const entry of cleanMan.episodes) {
          if (!entry || !RE_NAME.test(entry.id || '') || !/^[a-z0-9_\-/]+\.json$/i.test(entry.file || '') || entry.file.includes('..')) continue;
          if ((entry.engine || 1) > CONTENT_ENGINE) continue; // needs a newer app; wait for the update
          const have = old.episodes[entry.id];
          if (have && (have._rev || 0) === (entry.rev || 0)) { eps[entry.id] = have; continue; }
          try {
            const { json } = await getJson(entry.file, entry.rev || 1);
            const ep = clean(json);
            const errs = validate(ep, CAST, known);
            if (ep.id !== entry.id) errs.push('id does not match manifest');
            if (errs.length) { console.warn('episode rejected', entry.id, errs); if (have) eps[entry.id] = have; continue; }
            ep._rev = entry.rev || 0;
            eps[entry.id] = ep;
          } catch (e) { if (have) eps[entry.id] = have; }
        }
        const d = { manifest: cleanMan, episodes: eps, at: Date.now() };
        write(d);
        const added = apply(d);
        await Promise.race([loadArt(cleanMan, b), sleep(3000)]);
        return added;
      })().catch(e => { console.warn('content refresh', e); return []; }).finally(() => { busy = null; });
      return busy;
    },
    // re-draw the library or episode list if it's on screen
    redraw() {
      if (UI.sheet || !Story.st) return;
      if (document.querySelector('.library')) Story.library();
      else if (document.querySelector('.story-book .book-cover')) Story.bookScreen();
    },
    // after a refresh, update whatever screen is showing
    announce(added) {
      if (!added || !added.length) return;
      const eps = EPISODES.filter(e => added.includes(e.id));
      const bookOf = (e) => (BOOKS.find(b => b.id === (e.book || 'b1')) || {}).title || '';
      toast(eps.length === 1 ? `New episode: ${bookOf(eps[0])}, Ep ${eps[0].no}. ${eps[0].title}` : `${eps.length} new episodes are here`);
      Content.redraw();
    },
  };
})();

const CONTENT_AMB = {};

#!/usr/bin/env node
// Translation workflow for Gully to Glory.
//   node tools/i18n.js extract        -> i18n/en/*.json: every English string to translate (per episode, plus _common and ui)
//   node tools/i18n.js check [lang]   -> what is missing, and lines whose {first}, {n}, <b> etc. don't match
//   node tools/i18n.js build          -> js/lang/<lang>.js (UI + _common + bundled chapters, ships in the app)
//                                        content/i18n/<lang>/<ep>.json + manifest.i18n (server chapters, no app update)
// Sources: i18n/<lang>/<name>.json, each an object { "<English>": "<translation>" }.
// Lookups are by the English text, so editing an English line later just falls back to English for that line.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const G = path.join(ROOT, 'app/src/main/assets/game');
const LANGS = ['hi', 'bn', 'ml'];
const cmd = process.argv[2], only = process.argv[3];

function load() {
  const ctx = { console }; vm.createContext(ctx);
  for (const f of ['episodes.js', 'episodes2.js', 'episodes3.js']) vm.runInContext(fs.readFileSync(path.join(G, 'js', f), 'utf8').replace(/\bconst (\w+)\s*=/g, 'var $1 ='), ctx);
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/manifest.json'), 'utf8'));
  const server = [];
  for (const e of man.episodes) { try { server.push(JSON.parse(fs.readFileSync(path.join(ROOT, 'content', e.file), 'utf8'))); } catch (er) {} }
  return { ctx, man, bundled: ctx.EPISODES, server };
}

// every player-visible string of one episode
function epStrings(e) {
  const out = new Set(); const add = s => { if (typeof s === 'string' && s.trim()) out.add(s); };
  add(e.title);
  for (const n of e.nodes || []) {
    add(n.n); add(n.th); add(n.t); add(n.cliff);
    (n.choice || []).forEach(o => { add(o.t); add(o.d); });
    (n.msgs || []).forEach(m => add(m.t));
    if (n.moment) ['title', 'desc', 'winCall', 'winSub', 'loseCall', 'loseSub'].forEach(k => add(n.moment[k]));
  }
  return [...out];
}
// names, book titles, genres, blurbs, relationship labels, teasers, bowlers, phone contacts
function commonStrings(d) {
  const out = new Set(); const add = s => { if (typeof s === 'string' && s.trim()) out.add(s); };
  const books = [...d.ctx.BOOKS, ...(d.man.books || [])];
  for (const b of books) { add(b.title); add(b.blurb); add(b.genre); add((b.genre || '').split('·')[0].trim()); if (b.teaser) { add(b.teaser.title); add(b.teaser.note); } for (const k in b.rel || {}) add(b.rel[k]); }
  for (const k in d.ctx.CAST) add(d.ctx.CAST[k].name);
  for (const k in d.ctx.REL_KEYS) add(d.ctx.REL_KEYS[k]);
  if (d.ctx.NEXT_TEASER) { add(d.ctx.NEXT_TEASER.title); add(d.ctx.NEXT_TEASER.note); }
  if (d.man.teaser) { add(d.man.teaser.title); add(d.man.teaser.note); }
  for (const e of [...d.bundled, ...d.server]) {
    for (const k in e.cast || {}) add(e.cast[k].name);
    for (const k in e.rel || {}) add(e.rel[k]);
    for (const n of e.nodes || []) { if (n.phone) add(n.phone); if (n.moment) add(n.moment.bowler); }
  }
  add('the last book');
  return [...out];
}
const uiKeys = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/en/ui.json'), 'utf8'));

function sources(d) {
  const S = { ui: uiKeys(), _common: commonStrings(d) };
  for (const e of d.bundled) S[e.id] = epStrings(e);
  for (const e of d.server) S[e.id] = epStrings(e);
  return S;
}
const readLang = (l, name) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', l, name + '.json'), 'utf8')); } catch (e) { return null; } };
const tokens = s => (s.match(/\{\w+\}|<[^>]+>/g) || []).sort().join('|');

if (cmd === 'extract') {
  const d = load(), S = sources(d), dir = path.join(ROOT, 'i18n/en');
  fs.mkdirSync(dir, { recursive: true });
  for (const k in S) if (k !== 'ui') fs.writeFileSync(path.join(dir, k + '.json'), JSON.stringify(S[k], null, 1) + '\n');
  const book = {}; for (const e of [...d.bundled, ...d.server]) (book[e.book || 'b1'] = book[e.book || 'b1'] || []).push(e.id);
  fs.writeFileSync(path.join(dir, '_books.json'), JSON.stringify(book, null, 1) + '\n');
  console.log('extracted', Object.keys(S).length, 'files');
} else if (cmd === 'check') {
  const d = load(), S = sources(d); let bad = 0;
  for (const l of only ? [only] : LANGS) {
    const done = [], part = [], none = [];
    for (const k in S) {
      const T = readLang(l, k); if (!T) { none.push(k); continue; }
      const miss = S[k].filter(s => !T[s]);
      for (const s of S[k]) if (T[s] && tokens(s) !== tokens(T[s])) { bad++; console.log(`  ${l}/${k}: tokens differ\n    EN: ${s}\n    ${l.toUpperCase()}: ${T[s]}`); }
      (miss.length ? part : done).push(miss.length ? `${k} (${miss.length} missing)` : k);
      if (miss.length && process.env.SHOW) miss.forEach(m => console.log(`    missing ${l}/${k}: ${m}`));
    }
    console.log(`${l}: complete ${done.length} · partial ${part.length}${part.length ? ' [' + part.join(', ') + ']' : ''} · not started ${none.length}`);
  }
  process.exitCode = bad ? 1 : 0;
} else if (cmd === 'build') {
  const d = load(), S = sources(d);
  const bundledIds = new Set(d.bundled.map(e => e.id)), serverIds = d.server.map(e => e.id);
  d.man.i18n = {};
  for (const l of LANGS) {
    const pick = (k) => { const T = readLang(l, k); if (!T) return null; const o = {}; for (const s of S[k]) if (T[s]) o[s] = T[s]; return o; };
    const ui = pick('ui') || {}, story = {};
    const c = pick('_common'); if (c) story._common = c;
    for (const id of bundledIds) { const T = pick(id); if (T && Object.keys(T).length) story[id] = T; }
    fs.mkdirSync(path.join(G, 'js/lang'), { recursive: true });
    fs.writeFileSync(path.join(G, 'js/lang', l + '.js'), `// Generated by tools/i18n.js build from i18n/${l}/*.json. Do not edit by hand.\nI18N.add(${JSON.stringify(l)}, ${JSON.stringify({ ui, story })});\n`);
    const list = [];
    for (const id of serverIds) {
      const T = pick(id); if (!T || !Object.keys(T).length) continue;
      const rel = `i18n/${l}/${id}.json`, file = path.join(ROOT, 'content', rel), body = JSON.stringify(T);
      let rev = 1; const old = (d.man._i18nPrev || {})[rel];
      try { const prev = fs.readFileSync(file, 'utf8'); const pm = (JSON.parse(fs.readFileSync(path.join(ROOT, 'content/manifest.json'), 'utf8')).i18n || {})[l] || []; const p = pm.find(x => x.ep === id); rev = p ? (prev === body ? p.rev : p.rev + 1) : 1; } catch (e) {}
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body);
      list.push({ ep: id, file: rel, rev });
    }
    if (list.length) d.man.i18n[l] = list;
    console.log(`${l}: ui ${Object.keys(ui).length}, bundled chapters ${Object.keys(story).filter(k => k !== '_common').length}, server chapters ${list.length}`);
  }
  if (!Object.keys(d.man.i18n).length) delete d.man.i18n;
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/manifest.json'), 'utf8'));
  if (d.man.i18n) raw.i18n = d.man.i18n; else delete raw.i18n;
  fs.writeFileSync(path.join(ROOT, 'content/manifest.json'), JSON.stringify(raw, null, 2) + '\n');
} else {
  console.log('usage: node tools/i18n.js extract | check [lang] | build');
}

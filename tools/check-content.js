#!/usr/bin/env node
// Checks content/ before you publish it: the same rules the app uses to accept or reject an episode.
// Usage: node tools/check-content.js            (checks content/manifest.json and every listed episode)
//        node tools/check-content.js file.json  (checks one episode file, e.g. a draft)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), js = path.join(root, 'app/src/main/assets/game/js');
const ctx = { console, localStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout };
vm.createContext(ctx);
for (const f of ['episodes.js', 'episodes2.js', 'episodes3.js', 'content.js'])
  vm.runInContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
vm.runInContext('this.EPISODES=EPISODES;this.CAST=CAST;this.Content=Content;this.CONTENT_ENGINE=CONTENT_ENGINE;', ctx);
const { EPISODES, CAST, Content, CONTENT_ENGINE } = ctx;
const builtIn = new Set(EPISODES.map(e => e.id));
const imgs = new Set(fs.readdirSync(path.join(root, 'app/src/main/assets/game/img')).map(f => f.replace(/\.(jpg|webp)$/, '')));

let bad = 0;
const fail = (m) => { bad++; console.log('  ✗ ' + m); };
function checkEpisode(file, entry, man) {
  let ep;
  try { ep = Content.clean(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { return fail(`${file}: ${e.message}`); }
  const errs = Content.validate(ep, CAST, builtIn);
  if (entry && ep.id !== entry.id) errs.push(`id "${ep.id}" does not match manifest id "${entry.id}"`);
  errs.forEach(e => fail(`${ep.id}: ${e}`));
  // art that is neither bundled, nor on the server, nor given a fallback shows as a plain dark screen
  const art = new Set(Object.keys((man && man.art) || {})), fb = Object.assign({}, vm.runInContext('BG_FALLBACK', ctx), (man && man.fallback) || {});
  const names = [ep.art, ...(ep.nodes || []).map(n => n && n.bg)].filter(Boolean);
  for (const n of new Set(names)) if (!imgs.has(n) && !art.has(n) && !fb[n]) console.log(`  ! ${ep.id}: background "${n}" has no image or fallback`);
  if (!errs.length) console.log(`  ✓ ${ep.id} · Episode ${ep.no} "${ep.title}" · ${ep.nodes.length} nodes`);
}

const arg = process.argv[2];
if (arg) checkEpisode(path.resolve(arg));
else {
  const dir = path.join(root, 'content');
  let man;
  try { man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch (e) { fail('manifest.json: ' + e.message); process.exit(1); }
  console.log(`manifest: ${man.episodes.length} episode(s), app plays engine ${CONTENT_ENGINE}`);
  const nos = new Set();
  for (const entry of man.episodes) {
    if (!/^[a-z0-9_\-/]+\.json$/i.test(entry.file || '')) { fail(`${entry.id}: bad file path`); continue; }
    if (nos.has(entry.no)) fail(`${entry.id}: episode number ${entry.no} used twice`); nos.add(entry.no);
    if (typeof entry.rev !== 'number') fail(`${entry.id}: needs a numeric rev (bump it on every change)`);
    checkEpisode(path.join(dir, entry.file), entry, man);
  }
  for (const [k, p] of Object.entries(Object.assign({}, man.art, man.chars))) if (!fs.existsSync(path.join(dir, p))) fail(`image ${k}: ${p} missing`);
}
console.log(bad ? `\n${bad} problem(s). Players would not get the broken episode(s).` : '\nAll good.');
process.exit(bad ? 1 : 0);

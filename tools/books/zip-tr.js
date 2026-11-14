#!/usr/bin/env node
// node tools/books/zip-tr.js <lang> <ep> <file.json>
// Turns a translation written as a list (same order as i18n/en/<ep>.json) into i18n/<lang>/<ep>.json.
// Refuses if the counts differ, or a line's quotes / {tokens} don't line up with the English, so a shifted list can't slip through.
const fs = require('fs'), path = require('path');
const [lang, ep, file] = process.argv.slice(2);
const ROOT = path.join(__dirname, '../..');
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/en', ep + '.json'), 'utf8'));
const tr = JSON.parse(fs.readFileSync(file, 'utf8'));
if (en.length !== tr.length) { console.error(`${lang}/${ep}: ${tr.length} lines, English has ${en.length}`); process.exit(1); }
const tok = s => (s.match(/\{\w+\}/g) || []).sort().join('|');
const q = s => s.trim()[0] === '"';
let bad = 0;
en.forEach((e, i) => {
  if (tok(e) !== tok(tr[i]) || q(e) !== q(tr[i])) { bad++; console.error(`${lang}/${ep} line ${i + 1} looks misaligned:\n  EN: ${e}\n  TR: ${tr[i]}`); }
});
if (bad) process.exit(1);
const out = {}; en.forEach((e, i) => { out[e] = tr[i]; });
fs.writeFileSync(path.join(ROOT, 'i18n', lang, ep + '.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`${lang}/${ep}: ${en.length} lines`);

// Languages: English, Hinglish, Manglish, Banglish. English is built in; each other language is one file, js/lang/<id>.js, loaded only when chosen.
// Lookups are keyed by the English text itself, so a line that is later edited in English simply shows in
// English until it is translated again (never a wrong translation).
//   t('Chapter {n}', { n: 3 })   -> UI phrase
//   I18N.s(epId, englishLine)     -> story line of that episode ('_common' = book titles, names, labels)
const LANGS = [
  { id: 'en', native: 'English', name: 'English' },
  { id: 'hinglish', native: 'Hinglish', name: 'Hindi in English letters', locale: 'hi-Latn', latin: true },
  { id: 'manglish', native: 'Manglish', name: 'Malayalam in English letters', locale: 'ml-Latn', latin: true },
  { id: 'banglish', native: 'Banglish', name: 'Bengali in English letters', locale: 'bn-Latn', latin: true },
  // Hindi/Bengali/Malayalam in their own scripts are translated (i18n/archive/) but switched off: players
  // preferred the English-letter versions. To bring one back, add it here and to LANGS in tools/i18n.js.
];
const LANG_KEY = 'gg_lang';

const I18N = {
  lang: 'en', ui: {}, story: {}, loaded: { en: true }, waiting: {},
  chosen() { try { return !!localStorage.getItem(LANG_KEY); } catch (e) { return false; } },
  init() {
    let l = 'en';
    try { l = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) {}
    if (!LANGS.some(x => x.id === l)) l = 'en';
    this.lang = l; this.apply();
    return this.load(l);
  },
  set(l) {
    this.lang = l; try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    this.apply();
    return this.load(l);
  },
  apply() {
    const h = document.documentElement;
    const L = LANGS.find(x => x.id === this.lang) || LANGS[0];
    h.lang = L.locale || L.id;
    h.classList.toggle('indic', !L.latin && L.id !== 'en'); // Indian scripts need the font/spacing fixes; Hinglish is Latin
  },
  // loads js/lang/<l>.js once (a script tag works from file:// inside the app, fetch does not)
  load(l) {
    if (this.loaded[l]) return Promise.resolve();
    if (this.waiting[l]) return this.waiting[l];
    return (this.waiting[l] = new Promise(res => {
      const s = document.createElement('script');
      s.src = `js/lang/${l}.js`;
      s.onload = () => { this.loaded[l] = true; res(); };
      s.onerror = () => res(); // missing file: stay readable in English
      document.head.appendChild(s);
    }));
  },
  // called by each language file (and by content.js for chapters downloaded from the server)
  add(l, data) {
    this.ui[l] = Object.assign(this.ui[l] || {}, data.ui || {});
    const S = this.story[l] = this.story[l] || {};
    for (const ep in data.story || {}) S[ep] = Object.assign(S[ep] || {}, data.story[ep]);
  },
  t(s, vars) {
    let r = (this.lang !== 'en' && this.ui[this.lang] && this.ui[this.lang][s]) || s;
    if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return r;
  },
  s(ep, s) {
    if (this.lang === 'en' || !s || typeof s !== 'string') return s;
    const S = this.story[this.lang]; if (!S) return s;
    return (S[ep] && S[ep][s]) || (S._common && S._common[s]) || s;
  },
  // does this language have the story text for this episode? (otherwise the chapter plays in English)
  has(ep) { return this.lang === 'en' || !!(this.story[this.lang] && this.story[this.lang][ep]); },
};
const t = (s, vars) => I18N.t(s, vars);

// Languages. English is built in; each other language is one file, js/lang/<id>.js, loaded only when chosen.
// Lookups are keyed by the English text itself, so a line that is later edited in English simply shows in
// English until it is translated again (never a wrong translation).
//   t('Chapter {n}', { n: 3 })   -> UI phrase
//   I18N.s(epId, englishLine)     -> story line of that episode ('_common' = book titles, names, labels)
const LANGS = [
  { id: 'en', native: 'English', name: 'English' },
  { id: 'hi', native: 'हिन्दी', name: 'Hindi' },
  { id: 'bn', native: 'বাংলা', name: 'Bengali' },
  { id: 'ml', native: 'മലയാളം', name: 'Malayalam' },
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
    h.lang = this.lang;
    h.classList.toggle('indic', this.lang !== 'en');
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

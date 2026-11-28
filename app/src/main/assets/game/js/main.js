// UI shell: screen transitions, bottom sheets, Android hooks and boot.
// Career Mode was retired in 1.5.0. match.js / state.js / data.js stay loaded only because the
// story's playable cricket moments use their engine (genDelivery, Moments, Match helpers).
const app = document.getElementById('app');

const UI = {
  cur: null, backAt: 0,
  // mode: (none) = new screen slides in over the old one; 'fast' = instant switch (bottom tabs);
  // 'swap' = the same screen redrawn with new data: instant, and scroll positions are kept.
  // The old screen never fades out: it stays fully drawn underneath until the new one covers it, so
  // the page background can't show through mid-transition (that was the flicker on every tap).
  show(html, mode) {
    const old = this.cur;
    const wrap = document.createElement('div'); wrap.innerHTML = html.trim();
    const el = wrap.firstElementChild;
    const animate = mode !== 'fast' && mode !== 'swap';
    el.classList.add(animate ? 'enter' : 'still');
    app.appendChild(el);
    if (mode === 'swap' && old) this.keepScroll(old, el);
    // a screen still leaving from an earlier tap goes now, so only one ever sits underneath
    Array.from(app.querySelectorAll(':scope > .screen.exit')).forEach(n => n.remove());
    if (old) { old.classList.add('exit'); setTimeout(() => old.remove(), animate ? 320 : 60); }
    this.cur = el;
    try { SceneFX.scan(el); } catch (e) {}
    if (!el.classList.contains('story-scene')) { Sfx.ambience('off'); Sfx.music(el.classList.contains('match-screen') ? 'off' : 'calm'); }
    return el;
  },
  // copy scroll offsets from a screen to its redrawn copy (lists are matched in page order)
  keepScroll(from, to) {
    const sel = '.scroll, .h-row, .h-chips, [data-track]';
    const a = from.querySelectorAll(sel), b = to.querySelectorAll(sel);
    b.forEach((n, k) => {
      const o = a[k]; if (!o || o.className !== n.className) return;
      n.style.scrollBehavior = 'auto'; n.scrollTop = o.scrollTop; n.scrollLeft = o.scrollLeft; n.style.scrollBehavior = '';
    });
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

// There is no separate title screen any more: the app opens on the story home.
function titleScreen() { Story.open(); }

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

// ---------- Android lifecycle hooks ----------
window.GG = {
  onPause() { Sfx.suspend(); try { Story.scheduleReminders(); } catch (e) {} },
  onResume() { Sfx.resume(); Ads.collect(); setTimeout(() => Ads.collect(), 2000); try { Content.refresh().then(Content.announce); } catch (e) {} },
  onBack() {
    if (UI.sheet) { closeSheet(); return 'handled'; }
    // back walks up: chapter -> pause menu, book -> home, home -> press twice to exit
    try { if (Story.back()) return 'handled'; } catch (e) {}
    const now = Date.now();
    if (now - UI.backAt < 1800) return 'exit';
    UI.backAt = now; toast(t('Press back again to exit. Progress is saved.'));
    return 'handled';
  },
  adResult(placement, result) { Ads.result(placement, result); },
  adShown(placement) { Ads.shown(placement); },
  notifyResult(granted) { Notify.result(granted); },
  // test hook
  _dev: { Game, Match, Moments, Content },
};

// ---------- Boot ----------
(async function boot() {
  try { if (localStorage.getItem('gg_muted')) Sfx.setMuted(true); if (localStorage.getItem('gg_music') === 'off') Sfx.setMusic(false); } catch (e) {}
  Content.init(); // chapters downloaded on an earlier launch
  await I18N.init(); // saved language (its file loads before the first screen)
  Content.lang(I18N.lang);
  let fresh = null; const check = Content.refresh(true).then(a => { fresh = a; });
  try { await Promise.race([Promise.all([document.fonts.ready, Art.load(), Promise.race([check, sleep(2500)])]), sleep(4000)]); } catch (e) {}
  Art.applyFallbacks();
  titleScreen();
  check.then(() => Content.announce(fresh)); // slow network: new chapters appear once they arrive
})();

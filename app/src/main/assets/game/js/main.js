// UI shell: screen transitions, bottom sheets, Android hooks and boot.
// Career Mode was retired in 1.5.0. match.js / state.js / data.js stay loaded only because the
// story's playable cricket moments use their engine (genDelivery, Moments, Match helpers).
const app = document.getElementById('app');

const UI = {
  cur: null, backAt: 0,
  show(html, mode) {
    const old = this.cur;
    const wrap = document.createElement('div'); wrap.innerHTML = html.trim();
    const el = wrap.firstElementChild;
    if (mode !== 'fast') el.classList.add('enter');
    app.appendChild(el);
    if (old) { old.classList.add('exit'); setTimeout(() => old.remove(), 360); }
    this.cur = el;
    try { SceneFX.scan(el); } catch (e) {}
    if (!el.classList.contains('story-scene')) Sfx.ambience('off');
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
    UI.backAt = now; toast('Press back again to exit. Progress is saved.');
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
  try { if (localStorage.getItem('gg_muted')) Sfx.setMuted(true); } catch (e) {}
  Content.init(); // chapters downloaded on an earlier launch
  let fresh = null; const check = Content.refresh(true).then(a => { fresh = a; });
  try { await Promise.race([Promise.all([document.fonts.ready, Art.load(), Promise.race([check, sleep(2500)])]), sleep(4000)]); } catch (e) {}
  Art.applyFallbacks();
  titleScreen();
  check.then(() => Content.announce(fresh)); // slow network: new chapters appear once they arrive
})();

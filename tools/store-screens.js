// Renders the Play Store set: 8 screenshots (1080x1920) + feature graphic (1024x500).
// node tools/store-screens.js <outdir> <capturedir>. Captures are real game screens (Playwright, 390x844 at deviceScaleFactor 3).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const CAP = path.resolve(process.argv[3] || 'cap') + '/'; // folder of 390x844@3x game screenshots (see the names used below)
const G = 'file:///workspace/Cricket-Game/app/src/main/assets/game/';
const C = 'file:///workspace/Cricket-Game/content/img/';

const css = `
@font-face { font-family: 'Bebas'; src: url('${G}fonts/bebas.woff2'); }
@font-face { font-family: 'Barlow'; src: url('${G}fonts/barlow-800.woff2'); font-weight: 800; }
@font-face { font-family: 'Inter'; src: url('${G}fonts/inter-600.woff2'); font-weight: 600; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1920px; overflow: hidden; position: relative; font-family: 'Barlow'; }
.bg { position: absolute; inset: -60px; background-size: cover; background-position: center; filter: blur(38px) saturate(1.35) brightness(.9); }
.tint { position: absolute; inset: 0; }
.glow { position: absolute; width: 900px; height: 900px; border-radius: 50%; left: 90px; top: 420px; background: radial-gradient(circle, rgba(255,255,255,.55), rgba(255,255,255,0) 65%); }
.head { position: absolute; left: 0; right: 0; top: 92px; text-align: center; padding: 0 60px; }
h1 { font-family: 'Bebas'; font-weight: 400; font-size: 132px; line-height: .92; color: #fff; letter-spacing: 1px; text-shadow: 0 6px 28px rgba(40,0,40,.45); }
h1 em { font-style: normal; color: var(--acc); }
.sub { margin-top: 22px; display: inline-block; font-size: 42px; font-weight: 800; color: #2a0f2e; background: #fff; padding: 12px 30px; border-radius: 99px; box-shadow: 0 10px 30px rgba(60,0,60,.3); }
.tag { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); background: var(--acc); color: #fff; font-family: 'Barlow'; font-weight: 800; font-size: 30px; letter-spacing: 3px; padding: 8px 24px; border-radius: 99px; box-shadow: 0 6px 20px rgba(0,0,0,.25); }
.phone { position: absolute; left: 50%; transform: translateX(-50%) rotate(var(--rot, 0deg)); top: var(--top, 600px); width: 640px; height: 1343px; border-radius: 64px; background: #16101e; padding: 18px; box-shadow: 0 40px 90px rgba(40,0,50,.55), 0 0 0 4px rgba(255,255,255,.35); }
.phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 48px; display: block; }
.chips { position: absolute; left: 0; right: 0; top: 474px; display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; padding: 0 40px; }
.chip { font-weight: 800; font-size: 36px; color: #fff; background: rgba(30,10,40,.55); border: 3px solid rgba(255,255,255,.8); padding: 10px 26px; border-radius: 99px; }
.chip.on { background: #fff; color: #c2185b; }
.fan { position: absolute; left: 0; right: 0; top: 640px; height: 1000px; }
.fan img { position: absolute; width: 430px; height: 770px; object-fit: cover; border-radius: 34px; border: 8px solid #fff; box-shadow: 0 30px 70px rgba(40,0,50,.5); }
.stats { position: absolute; left: 0; right: 0; bottom: 120px; display: flex; justify-content: center; gap: 22px; }
.stat { background: #fff; border-radius: 30px; padding: 18px 30px; text-align: center; box-shadow: 0 12px 30px rgba(60,0,60,.3); }
.stat b { display: block; font-family: 'Bebas'; font-weight: 400; font-size: 76px; line-height: 1; color: #e91e63; }
.stat span { font-weight: 800; font-size: 28px; color: #3a1840; }
.logo { position: absolute; left: 0; right: 0; bottom: 34px; text-align: center; font-family: 'Bebas'; font-size: 54px; color: #fff; letter-spacing: 2px; text-shadow: 0 3px 14px rgba(0,0,0,.4); }
.logo i { font-style: normal; color: #ffd166; font-size: 38px; }
`;

function slide({ shot, bg, tint, acc, title, sub, tag, rot, top, extra = '' }) {
  return `<html><head><style>${css}</style></head><body style="--acc:${acc}">
  <div class="bg" style="background-image:url('${bg || shot}')"></div><div class="tint" style="background:${tint}"></div><div class="glow"></div>
  ${tag ? `<div class="tag">${tag}</div>` : ''}
  <div class="head"><h1>${title}</h1><div class="sub">${sub}</div></div>
  ${extra}
  ${shot ? `<div class="phone" style="--rot:${rot || 0}deg;--top:${top || 600}px"><img src="${shot}"></div>` : ''}
  </body></html>`;
}

const S = [
  // 1. the hook: every live story
  { name: '1-stories', html: slide({ bg: C + 'cover_owner.webp', tint: 'linear-gradient(170deg, rgba(233,30,99,.55), rgba(255,111,0,.45) 60%, rgba(103,58,183,.55))', acc: '#ffd166',
      title: 'Cricket. <em>Love.</em><br>Drama.', sub: 'Interactive stories. You choose.',
      extra: `<div class="fan">
        <img src="${G}img/title.webp" style="left:-10px;top:150px;transform:rotate(-12deg)">
        <img src="${C}cover_bluecap.webp" style="left:660px;top:150px;transform:rotate(12deg)">
        <img src="${C}cover_owner.webp" style="left:150px;top:40px;transform:rotate(-5deg)">
        <img src="${G}img/cover_bollywood.webp" style="left:500px;top:40px;transform:rotate(5deg);z-index:2">
      </div>
      <div class="stats"><div class="stat"><b>4</b><span>stories</span></div><div class="stat"><b>64</b><span>chapters</span></div><div class="stat"><b>FREE</b><span>to play</span></div></div>
      <div class="logo">GULLY <i>TO</i> GLORY</div>` }) },
  { name: '2-owners-daughter', html: slide({ shot: CAP + 'en_b2_c1_02_choice.png', tint: 'linear-gradient(180deg, rgba(123,31,162,.55), rgba(233,30,99,.35))', acc: '#ffd166',
      title: 'She ran from<br>her <em>engagement</em>', sub: 'Straight into your auto.', top: 535 }) },
  { name: '3-bollywood-wife', html: slide({ shot: CAP + 'en_b3_c1_03_choice.png', tint: 'linear-gradient(180deg, rgba(255,87,34,.55), rgba(233,30,99,.35))', acc: '#fff59d',
      title: 'Fake marriage.<br><em>Real feelings?</em>', sub: 'Marry a superstar. For the cameras.', top: 535 }) },
  { name: '4-hit', html: slide({ shot: CAP + 'act_bat_big.png', tint: 'linear-gradient(180deg, rgba(0,150,136,.6), rgba(46,125,50,.35))', acc: '#ffd166',
      title: 'Hit the <em>winning</em><br>shot yourself', sub: 'One tap. Real pressure.', top: 535 }) },
  { name: '5-choices', html: slide({ shot: CAP + 'en_b1_c3_00_choice.png', tint: 'linear-gradient(180deg, rgba(191,54,12,.6), rgba(255,143,0,.35))', acc: '#ffe082',
      title: 'Every choice<br>has a <em>price</em>', sub: 'Your family. Your dream. Your call.', top: 535 }) },
  { name: '6-bowl', html: slide({ shot: CAP + 'act_bowl_wk.png', tint: 'linear-gradient(180deg, rgba(103,58,183,.6), rgba(0,137,123,.35))', acc: '#ffd166', tag: 'NEW',
      title: 'Bowl the<br><em>last over</em>', sub: 'Yorker. Bouncer. Your pick.', top: 535 }) },
  { name: '7-languages', html: slide({ shot: CAP + 'hinglish_b3_c2_01_choice.png', tint: 'linear-gradient(180deg, rgba(255,111,0,.6), rgba(233,30,99,.4))', acc: '#fff59d',
      title: 'Play in <em>your</em><br>language', sub: 'Dadi approves. 👵',
      extra: `<div class="chips"><span class="chip">English</span><span class="chip on">Hinglish</span><span class="chip">Manglish</span><span class="chip">Banglish</span></div>`, top: 566 }) },
  { name: '8-new-chapters', html: slide({ shot: CAP + 'home_h_new.png', tint: 'linear-gradient(180deg, rgba(233,30,99,.55), rgba(255,152,0,.35))', acc: '#ffd166',
      title: 'New stories<br><em>you vote for</em>', sub: 'New chapters. No update needed.', top: 535 }) },
];

const feature = `<html><head><style>${css}
body { width: 1024px; height: 500px; }
.fbg { position: absolute; inset: 0; background: linear-gradient(110deg, #e91e63 0%, #ff6f00 55%, #7b1fa2 100%); }
.fbg2 { position: absolute; inset: -40px; background: url('${C}cover_owner.webp') center/cover; filter: blur(30px) saturate(1.3); opacity: .45; }
.ft { position: absolute; left: 48px; top: 64px; width: 470px; }
.ft .t { font-family: 'Bebas'; font-size: 104px; line-height: .86; color: #fff; text-shadow: 0 5px 24px rgba(60,0,40,.45); }
.ft .t i { font-style: normal; color: #ffd166; font-size: 64px; }
.ft .s { margin-top: 18px; font-weight: 800; font-size: 30px; color: #fff; line-height: 1.15; text-shadow: 0 2px 10px rgba(60,0,40,.4); }
.ft .p { display: inline-block; margin-top: 18px; background: #fff; color: #c2185b; font-weight: 800; font-size: 24px; padding: 8px 20px; border-radius: 99px; }
.fc img { position: absolute; width: 190px; height: 340px; object-fit: cover; border-radius: 20px; border: 5px solid #fff; box-shadow: 0 18px 40px rgba(40,0,50,.5); }
</style></head><body><div class="fbg"></div><div class="fbg2"></div>
<div class="ft"><div class="t">GULLY <i>TO</i><br>GLORY</div><div class="s">Cricket. Love. Drama.<br>Every choice is yours.</div><div class="p">4 stories · Hinglish · Manglish · Banglish</div></div>
<div class="fc">
  <img src="${G}img/title.webp" style="left:520px;top:110px;transform:rotate(-8deg)">
  <img src="${C}cover_owner.webp" style="left:650px;top:70px;transform:rotate(-2deg)">
  <img src="${G}img/cover_bollywood.webp" style="left:790px;top:95px;transform:rotate(6deg)">
</div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const s of S) { fs.writeFileSync(`${OUT}/_${s.name}.html`, s.html); await p.goto(`file://${OUT}/_${s.name}.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/screenshot-${s.name}.png` }); }
  await p.setViewportSize({ width: 1024, height: 500 }); fs.writeFileSync(`${OUT}/_feature.html`, feature); await p.goto(`file://${OUT}/_feature.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/feature-graphic-1024x500.png` });
  await b.close(); console.log('done');
})();

# Gully to Glory — Play Store launch kit

Everything to paste into Play Console. Files in this folder:
`icon-512.png`, `feature-graphic-1024x500.png`, `screenshot-1…7.png`, `privacy-policy.html`.

## 1. App details
- **App name** (30 max): `Gully to Glory: Cricket Story`
- **Category:** Game → **Simulation** (alternative: Role Playing)
- **Tags:** Cricket, Interactive story, Choices, Drama, Sports
- **Free / paid:** Free · **Contains ads:** Yes · **In-app purchases:** No (for now)

**Short description** (80 max)
```
Live a cricketer's life: from a chai stall to the national team. Your choices.
```

**Full description**
```
From a chai stall in a small town to the national team. Every choice is yours.

GULLY TO GLORY is a cricket story game where your life off the field decides how you play on it.

📖 STORY MODE — A CRICKET DRAMA YOU PLAY
• Episode-by-episode drama with cliffhangers: family debts, a rival with a rich father, a coach who believes in you, and a girl with a red pen.
• Make choices that people remember. Spend diamonds on special moments.
• Play the big moments yourself: six balls against your rival, eleven to win off the last over.

🏏 CAREER MODE — FROM GULLY TO GLORY
• Plan every week: nets, gym, rest, family, nights out, sponsor shoots.
• 20+ stats that really matter: form, confidence, fatigue, injury, money, family, reputation, integrity.
• Climb every level: club cricket, Under-19, first-class, one-day, T20, the franchise league auction, and finally your country's cap in T20Is, ODIs and Tests.
• Face bribes, bookies, agents, trolls and selectors. Some choices end careers.

⚡ KEY MOMENTS
Read the length, pick your shot, time it on the meter. As a bowler, choose your delivery and hit your spot. Pressure, form and focus change everything.

🎨 Hand-painted art, cinematic scenes, living backgrounds and sound.

Free to play. Optional ads give you extra keys and diamonds.
All characters, teams and leagues are fictional.
```

## 2. Store graphics
| Asset | File |
|---|---|
| App icon (512×512) | `icon-512.png` |
| Feature graphic (1024×500) | `feature-graphic-1024x500.png` |
| Phone screenshots (1080×1920) | `screenshot-1-title.png` … `screenshot-7-episodes.png` |

## 3. Privacy policy
Host `privacy-policy.html` at a public URL (Google Sites, GitHub Pages, or any website), replace
`[your support email]`, and paste the URL in **App content → Privacy policy**.

## 4. Data safety form (answers)
- **Does your app collect or share user data?** Yes (through the AdMob SDK).
- **Is all data encrypted in transit?** Yes.
- **Can users request deletion?** Data is on-device only; users delete it by uninstalling. (Answer: "No, but data is not linked to accounts" if asked about a deletion request mechanism.)
- **Data types:**
  - *Device or other IDs* (advertising ID) — Collected **and** shared · Purpose: **Advertising or marketing**, **Analytics** · Not optional? → *Collected automatically*.
  - *App activity → App interactions* — Collected and shared · Purpose: Advertising, Analytics.
  - *App info and performance → Crash logs / Diagnostics* — Collected and shared · Purpose: Analytics (AdMob SDK).
  - *Location → Approximate location* — Collected (from IP) · Purpose: Advertising.

## 5. Content rating questionnaire (IARC) — likely answers
- Violence: **mild / fantasy-free** (a shove, threats by goons) → "Some violence: yes, non-graphic".
- **Gambling themes:** references to betting and match-fixing → **yes, references** (no real-money gambling, no simulated casino).
- **Alcohol:** references (parties) → yes, references.
- Language: mild ("idiot") → mild.
- Users interact / share info: **No**. Purchases: **No**.
- Expected result: **Teen / PEGI 12–16**.

## 6. Target audience
- Target age groups: **13–15, 16–17, 18+** (do **not** select under-13; the game would fall under the Families policy).
- Appeals to children? **No.**

## 7. Ads
- **Contains ads:** Yes.
- Before release: replace the **test AdMob IDs** in `app/src/main/res/values/strings.xml` with your real App ID and Rewarded ad-unit ID.
- Add an `app-ads.txt` file to your developer website.

## 8. Release
- Upload `app-release.aab` to **Production** (2022 account: no 14-day closed-test requirement).
- Turn on **Play App Signing** (default). Keep the upload key file and its password safe.
- Release notes: `First release: Story Mode Episodes 1–3 and full Career Mode.`

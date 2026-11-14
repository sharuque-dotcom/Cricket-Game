# Gully to Glory — Play Store launch kit

Everything to paste into Play Console. Files in this folder:
`icon-512.png`, `feature-graphic-1024x500.png`, `screenshot-1…8.png (1080×1920, Blue Cap art)`, `privacy-policy.html`.

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

GULLY TO GLORY is an interactive story game about cricket, family, love and the price of a dream. You are the hero, and every choice is yours.

📖 STORIES YOU PLAY
• Chapter-by-chapter drama with cliffhangers: family debts, a rival with a rich father, a coach who believes in you, and a girl with a red pen.
• Make choices people remember. Spend diamonds on special moments, or take the free path.
• More books on the shelf: The Blue Cap, a crime thriller and a Bollywood romance. New chapters arrive without an app update.

🏏 PLAYABLE CRICKET MOMENTS
Six balls against your rival. Eleven to win off the last over. Tap HIT when it glows green. Easy to learn, hard to forget.

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

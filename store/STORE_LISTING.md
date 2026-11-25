# Gully to Glory — Play Store launch kit

Everything to paste into Play Console. Files in this folder:
`icon-512.png`, `feature-graphic-1024x500.png`, `screenshot-1…8.png (1080×1920, 1.5.6 bright UI)`, `privacy-policy.html`.

## 1. App details
- **App name** (30 max): `Gully to Glory: Cricket Story`
- **Category:** Game → **Simulation** (alternative: Role Playing)
- **Tags:** Cricket, Interactive story, Choices, Drama, Sports
- **Free / paid:** Free · **Contains ads:** Yes · **In-app purchases:** No (for now)

**Short description** (80 max)
```
Cricket love stories you control. Play in Hinglish, Manglish or Banglish.
```

**Full description**
```
Cricket. Love. Drama. And every choice is yours.

GULLY TO GLORY is an interactive story game made for cricket lovers. Read, choose and play your way through dramas full of romance, rivalry and family secrets.

💕 STORIES YOU CAN'T PUT DOWN
• The Owner's Daughter: she ran from her engagement to your captain. Straight into your auto.
• Bollywood Wife: a fake marriage with a superstar, for the cameras. Then the feelings get real.
• Gully to Glory: a chai-stall kid, a rival with a rich father, and a loan shark at the door.
• The Blue Cap: thirty probables, fifteen seats, one cap.

🏏 PLAY THE BIG MOMENTS
Hit the winning shot in the last over. Bowl the yorker that wins the match. One tap, real pressure.

🗣️ PLAY IN YOUR LANGUAGE
English, Hinglish, Manglish or Banglish. Switch any time.

🗳️ YOU DECIDE WHAT'S NEXT
New chapters arrive without an app update, and you vote for the next story in Coming soon.

✨ Hand-painted art, music and cliffhangers at the end of every chapter.

Free to play. Optional ads give extra keys and diamonds.
All characters, teams and leagues are fictional.
```

## 2. Store graphics
| Asset | File |
|---|---|
| App icon (512×512) | `icon-512.png` |
| Feature graphic (1024×500) | `feature-graphic-1024x500.png` |
| Phone screenshots (1080×1920), in this order | `screenshot-1-stories` · `2-owners-daughter` · `3-bollywood-wife` · `4-hit` · `5-choices` · `6-bowl` · `7-languages` · `8-new-chapters` |

The first three screenshots are the ones most people see in search, so they carry the hook: the stories, then the two romance books. Regenerate with `node tools/store-screens.js <outdir> <capturedir>`. The previous set is in `old/`.

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

# Gully to Glory — project notes

Android cricket career + interactive-story game ("Choices for cricket"). Live on Google Play (package `com.gullytoglory.game`).

## Layout
- `app/src/main/java/.../MainActivity.java` — WebView shell; JS bridge `AndroidBridge` (vibrate, AdMob rewarded ads, local notifications); `NotifyReceiver.java` posts reminders.
- `app/src/main/assets/game/` — the whole game (plain HTML/CSS/JS, no build step).
  - `js/story.js` Story Mode engine (keys, diamonds, choices, ads caps `AD_CAP`, notifications, end card).
  - `js/episodes.js` (Ep 1–3), `episodes2.js` (4–6), `episodes3.js` (7–12, `BG_FALLBACK`). Node format documented at top of `episodes.js`.
  - `js/moments.js` canvas cricket key moments (painted sprites `char_sp_*`); `js/match.js` career matches; `js/data.js` career content (all names fictional — keep it that way, no real players/teams/brands).
  - `js/fx.js` art loader (`ART_NAMES`, character list), particles, `Ads`, `Notify`.
  - `img/` backgrounds `.jpg`, characters/expressions/sprites `char_*.webp` (green-screen keyed).
- `docs/ART_PROMPTS*.md` image prompt packs; `store/` Play listing kit, screenshots, privacy policy.

## Build
- Android SDK at `~/android-sdk` (the "Cricket-Game" cloud environment installs it). `local.properties` → `sdk.dir`.
- `gradle assembleDebug bundleRelease --no-daemon -q --max-workers=1` (single worker avoids Maven 429s).
- Bump `versionCode`/`versionName` in `app/build.gradle.kts` every Play upload (last: 20 / 1.3.1).
- Release signing needs git-ignored `keystore.properties` + the upload `.jks` (owner keeps it; ask them to upload it). Never commit keys.
- AdMob IDs in `res/values/strings.xml` are Google TEST ids until the owner provides real ones.

## Testing
Playwright + Chromium are preinstalled: load `file://.../assets/game/index.html`, drive via `Story.*`, `GG._dev.{Game,Match,Moments}`. Check every episode's labels/backgrounds still resolve after story edits.

## Next ideas
Episode 13+ / Book 2 "The Blue Cap"; convert background JPGs to WebP (~2 MB saving); real gem packs via Play Billing (then lower `AD_CAP`); TV-style replays, swipe-to-aim, Hinglish commentary.

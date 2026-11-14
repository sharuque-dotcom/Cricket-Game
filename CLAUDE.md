# Gully to Glory — project notes

Android interactive-story cricket game ("Choices for cricket"). Career Mode was removed in 1.5.0; the app opens on the story home. Live on Google Play (package `com.gullytoglory.game`).

## Layout
- `app/src/main/java/.../MainActivity.java` — WebView shell; JS bridge `AndroidBridge` (vibrate, AdMob rewarded ads, local notifications); `NotifyReceiver.java` posts reminders.
- `app/src/main/assets/game/` — the whole game (plain HTML/CSS/JS, no build step).
  - `js/story.js` Story Mode engine (keys, diamonds, choices, ads caps `AD_CAP`, notifications, end card). Name → **library** of `BOOKS` (`episodes.js`) → book's episode list. Progress is per book in `st.books[id]`; `st.done/rel/flags/cur` are accessors for the current book (`st.book`). Sequels: `after` (locked until finished) + `carry` (copies flags/rel). Episodes join a book via `book` (default `b1`).
  - `js/episodes.js` (Ep 1–3), `episodes2.js` (4–6), `episodes3.js` (7–12, `BG_FALLBACK`). Node format documented at top of `episodes.js`.
  - `js/moments.js` canvas cricket key moments (painted sprites `char_sp_*`); `js/match.js` / `js/state.js` / `js/data.js` are the old career code, kept only because the moment engine uses them; `data.js` (all names fictional — keep it that way, no real players/teams/brands).
  - `js/content.js` live episodes: downloads `content/manifest.json` + episode JSON from the repo's default branch (raw.githubusercontent `HEAD`, jsDelivr fallback), validates, cleans `<>`, caches in localStorage. New episodes = no Play release (see `content/README.md`). Conditions in JSON use `storyCond` strings/objects, not functions.
  - Look: `css/bright.css` (light, vivid theme) loads after `css/style.css` and overrides it. Home = hero card + "All stories" shelf + short chapter list; book page = compact cover + chapter rows. UI says "Chapter", code/data still say episode. Story cricket moments use one-button `simple` batting (HIT glows green in the timing window). First chapter shows the How to play sheet once (`st.seenHowTo`).
  - `js/fx.js` art loader (`ART_NAMES`, character list), particles, `Ads`, `Notify`.
  - `img/` backgrounds `.webp` (converted in 1.5.0; add new ones as WebP too), characters/expressions/sprites `char_*.webp` (green-screen keyed).
- `docs/ART_PROMPTS*.md` image prompt packs; `store/` Play listing kit, screenshots, privacy policy.

## Build
- Android SDK at `~/android-sdk` (the "Cricket-Game" cloud environment installs it). `local.properties` → `sdk.dir`.
- `gradle assembleDebug bundleRelease --no-daemon -q --max-workers=1` (single worker avoids Maven 429s).
- Bump `versionCode`/`versionName` in `app/build.gradle.kts` every Play upload (last: 25 / 1.5.2).
- Release signing needs git-ignored `keystore.properties` + the upload `.jks` (owner keeps it; ask them to upload it). Never commit keys.
- AdMob IDs are `resValue`s in `app/build.gradle.kts`: release = real ids (app `~5540920416`, rewarded `/5327178322`), debug = Google test ids. Never ship test ids in release or real ids in debug.

## Testing
Playwright + Chromium are preinstalled: load `file://.../assets/game/index.html`, drive via `Story.*`, `GG._dev.{Game,Match,Moments}`. Check every episode's labels/backgrounds still resolve after story edits. For server episodes run `node tools/check-content.js`; test against a local server by setting `localStorage.gg_content_base` (needs `Access-Control-Allow-Origin: *`).

## Next ideas
Episode 13+ / Book 2 "The Blue Cap"; real gem packs via Play Billing (then lower `AD_CAP`); TV-style replays, swipe-to-aim, Hinglish commentary.

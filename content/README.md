# Live episodes (no Play Store release needed)

The app (v1.4.0+) checks this folder every time it starts or comes back to the foreground. It reads it from the repo's **default branch**:

- `https://raw.githubusercontent.com/sharuque-dotcom/Cricket-Game/HEAD/content/` (main)
- `https://cdn.jsdelivr.net/gh/sharuque-dotcom/Cricket-Game/content/` (backup, can lag up to 12 h)

So **an episode goes live as soon as it is merged into the default branch.** Downloaded episodes are saved on the phone and keep working offline.

The repo must stay **public** and the folder must stay at `content/`, or players stop getting new episodes (changing that would need a new app release).

## Publish a new episode

1. Write `content/episodes/ep13.json`. Copy `episodes/_example.json`. The node format is the same as `app/src/main/assets/game/js/episodes.js`, written as JSON.
2. Add it to `manifest.json`:
   ```json
   { "id": "ep13", "no": 13, "file": "episodes/ep13.json", "rev": 1 }
   ```
3. Run `node tools/check-content.js`. It must say **All good**.
4. Merge into the default branch. Players get it the next time they open the game.

## Fix a live episode

Edit the file and **bump `rev`**. Without a new `rev` phones keep the old copy. Only fix text or small details. Don't add or remove nodes, because players halfway through keep their place by node number.

To withdraw an episode, delete its line from `manifest.json`.

## What a JSON episode can do

- Everything bundled episodes do: `bg`, `n`, `enter`, `exit`, `s`/`t`, `th`, `phone`/`msgs`, `choice`, `label`, `go`, `if`, `fx`, `set`, `moment`/`win`/`lose`, `end`/`cliff`.
- **Conditions** (`if` and an option's `show`) are data, not code:
  - `"recorded"` means the flag is set; `"!silent"` means it isn't.
  - `{ "any": ["recorded", "photos"] }`, `{ "all": [...] }`, `{ "not": "x" }`
  - `{ "rel": "papa", "min": 2 }` checks a relationship score.
- **New characters**: `"cast": { "kabir": { "name": "Kabir Sir", "col": "#60a5fa" } }` in the episode. Add `"rel": { "kabir": "Kabir" }` to track hearts for them.
- **No HTML.** `<` and `>` are removed from all text.
- Every `choice` needs at least one free option that always shows.

## New pictures (manifest.json)

```json
"art":      { "bg_blue_cap": "img/bg_blue_cap.jpg" },
"chars":    { "kabir": "img/char_kabir.webp" },
"fallback": { "bg_blue_cap": "ch6" },
"fx":       { "bg_blue_cap": "dust" },
"day":      ["bg_blue_cap"],
"amb":      { "bg_blue_cap": "maidan" },
"teaser":   { "no": 14, "title": "Second Letter", "art": "ch6", "note": "Next Friday" }
```

- Always give new backgrounds a `fallback` to a bundled picture. It shows while the new one loads, and when the phone is offline.
- Keep backgrounds under about 300 KB (WebP/JPG, 1080 px wide).
- Character expressions work too: `"kabir_angry": "img/char_kabir_angry.webp"` under `chars`.
- `teaser` replaces the "coming soon" row at the bottom of the episode list.

## When you DO need a Play release

Only when the engine changes: a new node type, a new kind of cricket moment, new screens. Then bump `CONTENT_ENGINE` in `js/content.js` and set `"engine": 2` on the episodes that need it. Older apps skip those episodes until they update.

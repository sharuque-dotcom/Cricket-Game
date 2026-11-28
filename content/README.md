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

## Books (the library)

Players pick a story from the library after entering their name. Each book keeps its own progress, choices and relationship hearts. Diamonds and keys are shared across books.

Built-in books, in `js/episodes.js`:

| id | Book | State in the app |
|---|---|---|
| `b1` | Gully to Glory | live, 12 episodes |
| `bluecap` | The Blue Cap (Book 2) | sequel of `b1`; Episodes 1–4 on the server, `live: false` until the art is in |
| `b2` | The Fixer | coming soon |
| `b3` | Bollywood Wife | coming soon |

To launch a book, put its episodes on the server with `"book": "bluecap"` in each episode file, numbered from 1, and switch the book on in `manifest.json`:

```json
"books": [
  { "id": "bluecap", "live": true, "teaser": { "no": 4, "title": "Nets at Dawn", "art": "ch6", "note": "Next Friday" } }
]
```

- **`after`**: the book is a sequel. It stays locked until that book is finished. `bluecap` has `after: "b1"`.
- **`carry`**: the sequel starts with that book's choices (flags) and relationships. So `"if": "recorded"` in Blue Cap remembers what the player did in Book 1.
- **A brand-new book** also needs `title`, `genre`, `blurb` and `art` (cover). Add `rel` to list the characters whose hearts show, e.g. `{ "dev": "Dev" }`.
- **`teaser`**: the "coming soon" row at the end of that book's episode list. The top-level `teaser` is for Book 1.
- A book with no episodes on the server always shows as "Coming soon".

## New pictures (manifest.json)

```json
"art":      { "bg_blue_cap": "img/bg_blue_cap.webp" },
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

## Music, key rules and the shelf (app 1.5.5+; older apps ignore these)

```json
"music":   { "bg_marine_drive": "romance", "bg_owner_office": "tense" },
"economy": { "keyMax": 3, "keyMins": 90, "free": 3 },
"shelf":   { "variants": [ { "name": "A", "order": ["b2", "b1", "b3", "bluecap"], "hero": "b2" },
                           { "name": "B", "order": ["b1", "b2", "b3", "bluecap"], "hero": "b1" } ] }
```

- **music**: mood per background: `calm`, `romance`, `tense`, `festive`, `stadium` or `off`. Inside an episode, a node `{ "music": "tense" }` switches the mood until the next background change.
- **economy**: keys held, minutes per free key, free chapters at the start of every story.
- **shelf**: shelf order and the story brand-new players start on. With `variants`, each player is placed in one group for good, and `book_open` / `chapter_*` events carry `shelf` (the group name) so Firebase can compare them. Without `shelf`, in-progress books come first in the built-in order.

## "Please update" prompt (app 1.5.7+; older apps ignore it)
After a new version is live on Play (and has finished rolling out), add to `manifest.json`:
```json
"update": { "latest": 31 }
```
`latest` is the new `versionCode`. Players on an older version (1.5.7 or later) get a "A new version is ready" sheet on the home / My stories screen with **Update now** (opens the Play page) and **Later** (hides it for 3 days). Add `"min": 31` only when old versions must not keep playing (no **Later** button below that versionCode). Never set `latest` before the release is actually live, or players get sent to a Play page with nothing new on it. Events: `update_prompt {from, to, must}`, `update_tap {to}`.

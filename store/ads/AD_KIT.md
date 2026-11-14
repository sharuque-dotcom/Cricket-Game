# Gully to Glory: ad kit (Google Ads App campaign, Reels/Shorts)

Everything here is made from the real game: real screens, real art. Pick any 5 headlines and 5 descriptions in Google Ads; the extras are spares.

## Headlines (max 30 characters)
1. From chai stall to blue cap
2. Your choices. Your cricket.
3. Play the last over yourself
4. Papa found your cricket kit
5. A cricket story you play
6. 11 off 6. Can you win it?
7. Gully se Glory tak
8. Tumhari choice, tumhari kahani

## Descriptions (max 90 characters)
1. An interactive cricket story. Every choice changes how your story ends.
2. He sells chai at a bus stand. He dreams of the blue cap. You decide what he does next.
3. Choose your words, face your rival and play the big moments yourself with one tap.
4. New chapters arrive free. Read, choose and play. No cricket skills needed.
5. Rival, family, first love and the last over. Your cricket story starts here.
6. Chai stall se national team tak. Har choice tumhari. Free mein khelo.

## Images (in this folder)
| Idea | Landscape 1200×628 | Square 1200×1200 | Portrait 1200×1500 |
|---|---|---|---|
| Hero: "From a chai stall to the blue cap" | `ad-hero-landscape-1200x628.png` | `ad-hero-square-1200x1200.png` | `ad-hero-portrait-1200x1500.png` |
| Choice: "Papa found your cricket kit" | `ad-choice-landscape-1200x628.png` | `ad-choice-square-1200x1200.png` | `ad-choice-portrait-1200x1500.png` |
| Cricket: "The last over is yours" | `ad-cricket-landscape-1200x628.png` | `ad-cricket-square-1200x1200.png` | `ad-cricket-portrait-1200x1500.png` |

## Videos (vertical 1080×1920, about 23 s, silent)
- `video-story-choice-1080x1920.mp4`: hook "He sells chai. He dreams of the blue cap." → Papa scene → the player taps a choice → "Your choices. Your cricket story."
- `video-last-over-1080x1920.mp4`: hook "11 runs. 6 balls." → real gameplay: SIX, SIX, FOUR, WON IT! → "Play the big moments yourself."

The videos have no sound. Most viewers start videos muted, so the captions carry them. For Reels/Shorts, add a trending track in the Instagram or YouTube editor when you post.

**Google Ads only takes videos as YouTube links:** upload both to your YouTube channel as **Unlisted**, then paste the links into the campaign.

## Google Ads setup, in order
1. **Release 1.5.2 first.** It contains the analytics. Without it Google can only count installs.
2. **Link Firebase** (same Google account): Firebase console → Project settings → Integrations → Google Ads → Link. Also AdMob → Apps → Gully to Glory → App settings → Link to Firebase. That fills in "Ads ARPU" in AdMob.
3. After the release has been live a day or two, in Firebase → Analytics → Events, mark **first_chapter_complete** as a key event (conversion).
4. Google Ads → Tools → Conversions → Import → Google Analytics 4 / Firebase → pick **first_chapter_complete**.
5. New campaign → App promotion → App installs → Android → Gully to Glory.
   - Locations: India. Languages: English and Hindi.
   - Bidding: start with installs; after about 50 chapter completions a week, switch to "in-app actions" and optimise for first_chapter_complete.
   - Budget: a small daily amount you're comfortable losing, for 2–3 weeks. Judge it by **cost per first chapter completed**, not cost per install.
   - Assets: the headlines, descriptions, 9 images and 2 YouTube video links above.

## Events the game sends (Firebase)
`tutorial_complete`, `chapter_start`, `chapter_complete` (book, chapter, read), `first_chapter_complete`, `third_chapter_complete`, `moment_end` (win), `ad_reward` (kind). Debug builds send nothing.

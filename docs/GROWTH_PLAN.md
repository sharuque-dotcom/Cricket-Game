# The first 1,000 players: 8-week plan

**The goal:** 1,000 installs from people who don't know us, then a clear decision: scale it, fix one thing, or stop.
**Budget:** about AED 500 in total, and AED 0 until week 4.
**Roles:** you post, share and pay. I make every asset (videos, captions, store graphics, app changes) and read the numbers.

## The decision at week 8

| Number (Firebase) | Where to find it | Keep going if |
|---|---|---|
| Players back the next day (day-1 retention) | Analytics → Retention | **30% or more** |
| Players back after a week (day-7 retention) | Analytics → Retention | **10% or more** |
| Chapters read per player | events `chapter_complete` ÷ users | **3 or more** |
| Ads watched per daily player | AdMob impressions ÷ daily users | **2 or more** |

- All four met: scale up. Add gem packs (Play Billing), a bigger ad budget and a new book every two weeks.
- Two or three met: fix the weakest number once, then measure again for two weeks.
- One or none met: stop, or rework the idea. Either way you'll know exactly why.

---

## Week 1: foundations (no spending)

1. **Website live.** In Play Console:
   - Store settings → **Website:** `https://sharuque-dotcom.github.io`
   - App content → **Privacy policy:** `https://sharuque-dotcom.github.io/privacy.html`

   AdMob then finds `app-ads.txt` by itself.
2. **Store listing refresh. This is the biggest free win.** Today's screenshots show the old dark look and only The Blue Cap. I'll make:
   - 8 new screenshots from the bright game, led by The Owner's Daughter and Bollywood Wife (romance converts best)
   - a new feature graphic
   - the 30-second trailer as the store video
3. **Listings in Hindi, Malayalam and Bengali** (Play Console → Store listing → Manage translations). Indian players search in these. I'll write the title, short description and full description for each, in the native scripts, since that's what people search with.
4. **Tracking links**, one per channel, so Firebase shows where each player came from:
   `https://play.google.com/store/apps/details?id=com.gullytoglory.game&referrer=utm_source%3DSOURCE%26utm_medium%3DMEDIUM%26utm_campaign%3Dfirst1000`

   | Use | SOURCE | MEDIUM |
   |---|---|---|
   | Instagram Reels | instagram | reel |
   | YouTube Shorts | youtube | short |
   | WhatsApp shares | whatsapp | share |
   | Facebook groups | facebook | group |
   | Meme-page shoutouts | meme_PAGENAME | paid |
   | Website button | website | site |

   The website's Play buttons should use the `website` link; I'll update them.
5. **A "Share this chapter" button** on the end card (app update, version 27). It shares the cliffhanger line, the cover and your tracking link, and gives the player **+5 💎** for sharing. Rewarding a share is allowed. Rewarding reviews or ratings is not, and we won't do it.
6. **Write down today's baseline:** installs, daily users, day-1 retention, chapters per player.

## Weeks 2–3: free reach (goal: 150 installs)

- **Friends and family, done properly.** Send a WhatsApp message to 30–50 people, asking them to play Chapter 1 and **leave an honest review**. Reviews push the store ranking more than anything else at this size. I'll write the message in English, Hinglish, Manglish and Banglish.
- **Short videos: 3 a week on Instagram Reels and YouTube Shorts.** Same video on both; the caption carries the link (Instagram: bio link).
  - The "Chaiwala" drama as 3 cliffhanger parts ("Part 2 tomorrow…")
  - "Which would you choose?" clips: a real choice from the game, with a comment prompt ("A, B or C?")
  - "Last-over" clips: real cricket-moment gameplay with a scoreboard overlay
  - Owner's Daughter clips: "She jumped into my auto…" in the short-drama style
  - Captions in the language of the group you're aiming at (Manglish for Kerala, Banglish for Bengal)
- **Cricket fan groups,** at most 2 posts a week in total, and only where the group rules allow it:
  - Facebook groups and Telegram channels for Kerala and Bengal cricket fans
  - **Lead with the story, not "download my app".** For example: "I made a cricket drama game where you choose what happens. It's in Manglish. Would love honest feedback." People respond to a creator asking for feedback, not to ads.

## Weeks 4–5: small paid test (goal: +500 installs, about AED 400)

- **Google Ads App campaign, AED 300 over 10–14 days.**
  - India; English plus Hindi, Malayalam and Bengali.
  - Assets: the trailer, the drama clips, 5 screenshots, my ad copy (already in `store/ads/AD_KIT.md`).
  - Goal: **installs** for the first week. Then switch to **`first_chapter_complete`** once it has about 30 conversions, so Google looks for readers, not just installers.
- **One or two paid meme-page shoutouts (about AED 50 each).**
  - Mid-sized Malayalam or Bengali cricket meme pages on Instagram, one story or post each, with their own tracking link.
  - Pay only after seeing their recent view counts.
- **Check weekly:**
  - cost per install
  - cost per first-chapter-complete
  - day-1 retention by source

  Cut any channel whose players don't come back.

## Weeks 6–8: double down (goal: 1,000 total)

- Put the remaining time and money into **the one channel with the best day-1 retention**, not the cheapest installs.
- **Launch "Dropped" (the Kerala batter story) in week 6** as a hook for the Kerala audience: "New story: the batter they dropped nine times." It goes live from the server, no update needed, and is timed with Manglish reels.
- Answer every Play review within a day. It's visible, and it lifts ratings.
- Week 8: fill in the decision table above and decide.

---

## What I'll make (just ask for each)
- [ ] 8 store screenshots and a feature graphic (bright look)
- [ ] Store listing text in English, Hindi, Malayalam and Bengali
- [ ] Share-this-chapter button with the diamond reward (version 27)
- [ ] Website Play buttons using the tracking link
- [ ] WhatsApp review request in 4 languages
- [ ] 12 short-video edits with captions (from game footage and your Gemini drama clips)
- [ ] Google Ads assets and settings sheet
- [ ] Weekly numbers check: send me Firebase and AdMob screenshots every Monday

## Honest expectations
- Free channels for a brand-new game usually bring tens to low hundreds of installs, not thousands. The paid test is what tells us whether 1,000 is reachable at a price that makes sense.
- Cost per install for Indian games often runs well under a dirham, but story games can cost more. We'll see our real number in week 4.
- The money will stay small during the test. **We're buying information, not profit.**

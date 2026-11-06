# Gully to Glory

A gritty cricket **career** game for Android. You live the journey of a kid from a chai stall in Rajgarh, UP, all the way to the India cap.

## Install
Download `dist/GullyToGlory.apk` on your Android phone and open it (allow "install unknown apps" when asked).

## How it plays
- **Weekly life loop**: plan Morning / Afternoon / Evening (nets, gym, rest, work the stall, family, nights out, sponsors...). Every action moves your stats.
- **Stats that matter**: Skills (technique, power, vs pace/spin, pace, accuracy, variations, fitness, IQ), Condition (form, confidence, focus, fatigue, injury) and Life (money, family, mental health, reputation, coach trust, integrity, fans).
- **Match day = key moments**: the rest of the match is simulated; you play the moments that decide it.
  - *Batting*: read the length, pick a shot, time it on the timing bar. Your stats change how early you read the ball, how wide the timing window is, and how much slow-motion you get.
  - *Bowling*: pick a delivery, then release when the wobbling marker is on target. Accuracy and fatigue control the wobble.
- **Story**: six chapters (Maidan → U-19 Trials → Ranji → Auction → IPL → India) with choices: bribes, bookies, family crises, agents, and mentors.
- **Endings**: Glory, Capped, Banned, Broken, The Stall, Walked Away.

All players, teams and leagues are fictional.

## Release
See `store/STORE_LISTING.md` for the Play Store launch kit (listing text, graphics, privacy policy, data safety answers).
Release builds are signed via a git-ignored `keystore.properties` at the repo root:
```
storeFile=/path/to/upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```
Then `./gradlew bundleRelease` writes `app/build/outputs/bundle/release/app-release.aab`.

## Build
```
./gradlew assembleDebug    # needs Android SDK (compileSdk 35), JDK 17+
```
The game itself is plain HTML/CSS/JS in `app/src/main/assets/game/`. Open `index.html` in a desktop browser to iterate quickly.

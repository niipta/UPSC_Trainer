# Application architecture: Web + Native Android

This repository intentionally maintains two first-class applications over one geography dataset.

## Applications

| Application | Source of truth | Build output | Purpose |
|---|---|---|---|
| React web | `src/` | `dist/` | Full web learning experience: teaching mode, PYQ atlas, mains resources, focus timer and other web modules |
| Native Android | `app/` | `app/build/outputs/apk/` | Kotlin + Jetpack Compose offline-first map trainer |
| Capacitor Android | `android/` | Android APK/AAB | Android distribution of the React web experience |

The Capacitor wrapper is not the Kotlin application. Keep the two Android targets clearly labelled in CI and release notes.

## Shared data contract

The topic catalogue is currently duplicated for the consumers that need it:

- `src/data/topics.json`
- `assets/topics.json`
- `public/topics.json`
- `app/src/main/assets/topics.json`
- `android/app/src/main/assets/public/topics.json`

Run `python3 tools/validate_shared_data.py` after changing topic data. It checks JSON structure, required fields, coordinate ranges, duplicate IDs/names, category membership, and byte-for-byte parity across all copies.

This is a consistency guard, not a factual geography verifier. Coordinates, state assignments, facts and PYQ attributions still require editorial/source verification.

## CI responsibilities

- `.github/workflows/build-apk.yml`: tests and builds the Kotlin native APK with JDK 17 and Gradle 8.9.
- `.github/workflows/build-android.yml`: type-checks/builds the React web app, then syncs and builds the Capacitor Android APK/AAB with JDK 21.

Artifacts are uploaded separately so users can distinguish the Kotlin native app from the React/Capacitor Android package.

## Current limitations / next architecture work

1. Topic JSON is duplicated. CI detects drift, but a future single-source generator should replace manual copying.
2. User progress is local to each application (web local storage vs Android preferences). There is no shared account or cloud-sync contract yet.
3. The two applications do not currently share quiz-engine code or identical feature coverage.
4. The web leaderboard/ad simulations must not be presented as live users or real rewarded advertising.
5. Keep factual content and PYQ records source-attributed and independently reviewed before exam-facing release.

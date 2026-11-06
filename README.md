# UPSC Map Trainer 🗺️🇮🇳

> **A dual-platform India geography learning suite for UPSC Civil Services aspirants, with a Kotlin native Android app and a feature-rich React web app.**

Built with **Kotlin + Jetpack Compose (Material 3)** for Android (minSdk 26, targetSdk 35) and fully interactive in the web preview emulator. Zero map tiles, zero network calls, zero API keys.

---

## 🏛️ Core Features

1. **Custom Canvas-Based Equirectangular India Map**:
   - Projection: $x = (\text{lon} - 67.5) \times \cos(22^\circ)$, $y = 38 - \text{lat}$.
   - Simplified India state and UT boundaries (~109 KB GeoJSON with Douglas-Peucker $\approx 0.02^\circ$ tolerance).
   - Highlighting for state polygons, dynamic pulsing marker halos, touch pinch-zoom ($0.9\times$ to $16\times$), smooth pan, and automated camera gliding animations.
2. **16 High-Yield UPSC Map Topics (226 Catalogue Entries)**:
   - Coal & Lignite Fields
   - Oil & Gas Fields (Onshore & Offshore)
   - Oil Refineries (PSU, Private, JV)
   - Iron & Steel Plants
   - Mineral Belts & Mines (Bauxite, Copper, Gold, Iron Ore, Mica, Uranium, Zinc)
   - Major Ports of India (West Coast, East Coast, Greenfield Landlord Ports)
   - Nuclear Power Sites (Operational, Under Construction, Proposed)
   - Dams & Barrages
   - National Parks & Tiger Reserves
   - Biosphere Reserves (UNESCO WNBR & National)
   - Ramsar Wetlands (Montreux Record, coastal & high-altitude wetlands)
   - UNESCO World Heritage Sites (Cultural, Natural, Mixed)
   - Lakes & Lagoons of India
   - Mountain Passes (Himalayan, Karakoram & Western Ghats)
   - Mountain Peaks (Highest peaks across physiographic regions)
   - Ancient & Archaeological Sites (Harappan cities, Ashokan edicts & pillars)
3. **Comprehensive Pure-Kotlin Quiz Engine**:
   - 6 dynamic question types:
     - `TAP_MAP`: Tap map within 150 km of true coordinates (calculated via Haversine distance, revealing true location and distance line).
     - `IDENTIFY`: Identify the highlighted marker on the map (smart distractors from nearest places in the topic).
     - `STATE_MCQ`: State/UT identification with geographical centroid-proximity distractors.
     - `CATEGORY`: Classification (e.g., Coking vs Non-coking vs Lignite).
     - `CLUE`: Guess the place from an exam fact with the name safely masked (`________`).
     - `FACT`: Handwritten UPSC Prelims conceptual MCQs with detailed explanations.
   - Weighted adaptive sampling ($w = 6 - \text{mastery}$) so weaker places appear more frequently.
   - 0..5 Mastery score tracked per place.
4. **Editorial Aesthetic & Warm Paper Design**:
   - Palette: Warm paper background (`#F7F2EA`), Deep Ink Blue (`#1F3A4D`), Saffron Orange (`#E07A3F`).
   - Serif display typography, soft drop shadows, circular animated mastery rings, fire streaks, confetti celebrations, and complete question reviews.

---

## 🛠️ Build & Installation

This repository contains two separate app implementations. The Kotlin app under `app/` is not the same Android target as the React/Capacitor wrapper under `android/`.

### 1. React web application

Prerequisites: Node.js 22.

```bash
npm install
npm run lint
npm run build
```

The production web bundle is written to `dist/`.

### 2. Native Kotlin Android application

Prerequisites: JDK 17, Android SDK 35, and Gradle 8.9.

```bash
# Run the native Kotlin quiz-engine tests
gradle :app:testDebugUnitTest

# Build the native debug APK
gradle :app:assembleDebug
```

The native APK is written to `app/build/outputs/apk/debug/`.

Note: the root Gradle wrapper JAR is not currently committed, so use Android Studio's Gradle sync or an installed Gradle 8.9 command until the wrapper is regenerated.

### 3. React application packaged for Android (Capacitor)

Prerequisites: Node.js 22 and JDK 21.

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```

This package is a WebView wrapper around the React app; it is distinct from the Kotlin native app.

### Shared topic-data validation

The topic catalogue is copied into web, native and Capacitor asset directories. After editing topic data, run:

```bash
python3 tools/validate_shared_data.py
```

This checks JSON structure, required fields, duplicate IDs/names, coordinate ranges, category membership and exact parity across all five copies. It does not independently verify geographical facts or coordinate accuracy.

### Automated GitHub Actions

- `.github/workflows/build-apk.yml`: Kotlin unit tests + native Android debug APK.
- `.github/workflows/build-android.yml`: React type-check/build + Capacitor Android debug APK and release AAB.

Both workflows upload their artifacts separately. See [docs/APP_ARCHITECTURE.md](docs/APP_ARCHITECTURE.md) for the platform boundaries and current limitations.

---

## 📝 How to Add or Edit Topics

1. Open `tools/topics_data.py`.
2. Add or modify places in any topic tuple:
   ```python
   (name, lat, lon, state, category, fact)
   ```
   *Note*: For offshore or international boundary places, set `state = ""` to skip state-based questions.
3. Add handwritten questions in:
   ```python
   (question, correct_option, [wrong_1, wrong_2, wrong_3], explanation)
   ```
4. Run validation and asset generator:
   ```bash
   python3 tools/build_topics.py
   ```
   This performs:
   - Coordinate bounding checks ($6^\circ\text{N} - 38^\circ\text{N}$, $67^\circ\text{E} - 98^\circ\text{E}$).
   - Ray-casting point-in-polygon validation against India's state boundaries.
   - Category integrity and duplicate place detection.
   - Synchronizes `assets/topics.json`, `app/src/main/assets/topics.json`, and `public/topics.json`.

---

## 📌 Data Caveats & Map Projection Notes

- **Boundary Simplification**: State polygons use datameet & Survey of India boundaries simplified using iterative Ramer-Douglas-Peucker algorithm ($\approx 0.024^\circ$ tolerance) to maintain a lightweight bundle size (~109 KB) while preserving state contours.
- **UT Administration**: Ladakh places are rendered within the unified Jammu & Kashmir polygon from standard historical datasets; the engine highlights the parent boundary for Ladakh places seamlessly.
- **Accuracy Tolerance**: Coordinates are aligned to within ~10-25 km accuracy from authentic Survey of India benchmarks and official government gazettes.

---

## 🚀 Next-Step Ideas

- **Mnemonics & Memory Pegs**: Add curated Hindi/English memory tricks for passes from West to East (e.g., *KLZPB*).
- **River Basin Overlay**: Canvas vector paths for the 14 major river basins (Indus, Ganga, Brahmaputra, Godavari, Krishna, Mahanadi, Narmada, Tapi, Cauvery).
- **Prelims PYQ Filter**: Tag places with exact UPSC CSE Prelims years they appeared in (e.g., *UPSC 2023*, *UPSC 2022*).

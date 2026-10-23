# Animist 🎌

[![CI](https://github.com/Fnyz/Animist/actions/workflows/ci.yml/badge.svg)](https://github.com/Fnyz/Animist/actions/workflows/ci.yml)

> An anime discovery and community app for Android, built with React Native (Expo) and Firebase.

Browse trending and airing anime, watch official episodes and trailers, keep a watchlist, get notified when new episodes air, and talk about each episode with other fans.

> **Status: v1.1 rebuild in progress.** Version 1.0 streamed from the GogoAnime source through the Consumet API, which has since shut down. Version 1.1 moves the app to legal, stable data sources (AniList, Jikan and official YouTube channels), adds a new design, and ships through an automated CI/CD pipeline. See the [roadmap](#roadmap).

---

## Screenshots

Screenshots of the rebuilt app will be added here when v1.1 is released. They are captured from a real device with [`scripts/capture-screenshots.sh`](scripts/capture-screenshots.sh).

<!--
| Home | Details | Episodes | Search | My List |
|---|---|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Details](docs/screenshots/details.png) | ![Episodes](docs/screenshots/episodes.png) | ![Search](docs/screenshots/search.png) | ![My List](docs/screenshots/my-list.png) |
-->

---

## Features

**Available in v1.0**
- 🔐 **Accounts**: email and password sign-up with email verification, password reset and update
- 📋 **Watchlist and history** synced to Firestore
- ❤️ **Likes and comments** on each episode, updated in real time
- 👤 **Profile** with custom avatars

**Coming in v1.1**
- 🏠 **New home feed** with trending, airing this season, popular and top movies from AniList
- 🎬 **Episodes from three legal sources**: full episodes from official YouTube channels, episode lists that open Crunchyroll, and official trailers
- 🔍 **Search with filters** for genre, year, format and status
- 🔔 **New-episode notifications** for shows on your list
- 👀 **Browse without an account**. Sign-in is only needed to like, comment or save.
- 🔑 **Google Sign-In** and **AniList list import**
- 📶 **Offline cache** so the app opens instantly
- 🌙 **New dark design** with bottom tabs

---

## How episodes work

Animist does not host or scrape video. For each anime it picks the best legal source available:

| If the anime has… | Animist shows… |
|---|---|
| An official YouTube playlist (for example Muse Asia, Ani-One Asia) | Full episodes playing inside the app |
| Episode links on AniList | The episode list, with each episode opening on Crunchyroll |
| Neither | The official trailer and "Where to watch" links |

Official YouTube uploads can be region-locked. When an episode is blocked in your country, that episode falls back to its Crunchyroll link.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo |
| Navigation | React Navigation (native stack, bottom tabs) |
| Anime data | [AniList GraphQL API](https://docs.anilist.co), [Jikan API](https://jikan.moe) |
| Episodes | YouTube Data API v3, `react-native-youtube-iframe` |
| Data fetching | TanStack Query + Axios |
| Backend | Firebase Auth + Firestore |
| Notifications | `expo-notifications` |
| Builds and updates | EAS Build, EAS Update |
| CI/CD | GitHub Actions |
| Monitoring | Sentry |
| Testing | Jest |

---

## Install the app

**[Download page with QR code →](https://fnyz.github.io/Animist/)**

Android builds are published on the [Releases page](https://github.com/Fnyz/Animist/releases). Scan the QR code on the download page with your Android phone, or download `animist.apk` from the latest release and open it. Android asks you to allow installs from your browser the first time.

*The download works after the first tagged release (see [Releasing](#releasing)).*

---

## CI/CD

| Trigger | Workflow | What it does |
|---|---|---|
| Every push and pull request | `ci.yml` | **Lint** (ESLint, zero warnings) and **unit tests** (Jest) · **build check** (`expo-doctor`, Expo package versions, Android bundle) · **security** (dependency vulnerabilities with `audit-ci`, secret scanning with Gitleaks) |
| Push to `main`, pull requests, weekly | `codeql.yml` | GitHub CodeQL scans the code for security bugs |
| Weekly | `dependabot.yml` | Opens pull requests for dependency updates and security fixes |
| Push to `main` | `update.yml` | Publishes an over-the-air update to installed apps with EAS Update |
| Tag `v*` | `release.yml` | Builds a signed APK on the GitHub runner and attaches it to a GitHub Release |

The QR code points to `releases/latest/download/animist.apk`, so it always downloads the newest build.

### Releasing

One-time setup:
1. Create a free account at [expo.dev](https://expo.dev), then run `npx eas-cli login` and `npx eas-cli init` in the project. This links the project and adds its ID to `app.json`.
2. Run `npx eas-cli credentials -p android`, choose the **preview** profile, and let EAS generate the Android keystore. Every APK is signed with it.
3. Run `npx eas-cli update:configure` to turn on over-the-air updates.
4. Create an access token at expo.dev → Account settings → Access tokens, and add it on GitHub as the repository secret `EXPO_TOKEN` (Settings → Secrets and variables → Actions).
5. Turn on GitHub Pages: Settings → Pages → Deploy from a branch → `main` / `docs`.

Each release:
1. Update `version` in `app.json` and add a `## [x.y.z] - date` section to [CHANGELOG.md](CHANGELOG.md).
2. Commit, then tag and push:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
The `Release APK` workflow checks that the tag matches `app.json`, builds the APK, and publishes a GitHub Release with that version's notes from the changelog.

Run the same checks as CI locally with `npm run lint` and `npm test`.

---

## Roadmap

- [ ] **1. Clean up and upgrade Expo**: remove unused packages, move to the current Expo SDK, keep users signed in, tighten Firestore rules
- [ ] **2. New data layer**: one `api.js` on AniList and Jikan, TanStack Query caching, offline cache, Jest tests
- [ ] **3. Rewire the screens**: new design, AniList IDs for watchlist and history, cheaper like counting
- [ ] **4. Episodes**: YouTube playlists, Crunchyroll episode links and trailers
- [ ] **5. User experience**: browse without login, Google Sign-In, new-episode notifications, AniList import
- [ ] **6. CI/CD and distribution**: GitHub Actions, APK releases, QR download page, Sentry
- [ ] **7. Portfolio polish**: screenshots, demo video, architecture diagram
- [ ] **Later**: Google Play release, comment reporting and spoiler tags, in-app account deletion, web version

---

## Getting Started

### Prerequisites
- Node.js 20+
- An Android phone with Expo Go, or an Android emulator
- A Firebase project with Authentication and Firestore enabled

### Installation

```bash
git clone https://github.com/Fnyz/Animist.git
cd Animist
npm install
```

### Firebase setup

`firebase.js` initializes Firebase. To use your own project, replace the config values in it:

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const Auth = getAuth(app);
export const db = getFirestore(app);
```

### Run the app

```bash
npx expo start            # then scan the QR code with Expo Go
npx expo start --android  # open on a connected device or emulator
```

---

## Project Structure

```
Animist/
├── App.js              # Root navigator and entry point
├── context.js          # Global state (user, watchlist, history, likes)
├── firebase.js         # Firebase initialization
├── animeData.js        # Static avatar and theme data
├── genre.js            # Genre category definitions
├── scripts/
│   └── capture-screenshots.sh  # Captures README screenshots from a device
└── components/
    ├── HomePage.js     # Main feed screen
    ├── DetailsPage.js  # Anime details and episode list
    ├── WatchAnime.js   # Episode watch screen
    ├── SearchAnime.js  # Search screen
    ├── Profile.js      # User profile
    ├── LoginAndSignUp.js  # Sign-in and sign-up
    └── ...             # Other components
```

---

## Disclaimer

Animist does not host, store or scrape any video. Anime information comes from AniList and Jikan, and episodes play from official YouTube channels or open on licensed services. All anime titles and artwork belong to their respective owners.

## License

This project is for educational and personal use.

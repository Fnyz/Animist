# Animist 🎌

> A mobile anime streaming app built with React Native (Expo) and Firebase.

Browse anime, watch episodes with quality switching, track your watchlist and history, and interact with the community through likes and comments — all in one place.

---

## Features

- 🔐 **Authentication** — Email/password sign-up & sign-in with Firebase Auth and email verification
- 🏠 **Home Feed** — Browse new releases, top airing, popular anime, and movies
- 🎬 **Video Player** — Custom player with quality switching, fullscreen, seek controls, and resume playback
- 📋 **Watchlist & History** — Save anime to your list and track what you've watched
- ❤️ **Likes & Comments** — Engage with other users on each episode
- 🔍 **Search** — Find any anime with paginated results
- 👤 **Profile** — Customize your avatar and account details
- 🔑 **Password Recovery** — Reset or update your password via email

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 48 |
| Navigation | React Navigation (Native Stack) |
| Backend | Firebase Auth + Firestore |
| API | Consumet API (GogoAnime) |
| HTTP Client | Axios |
| Media Playback | expo-av |
| Local Storage | AsyncStorage |
| UI Components | react-native-paper, moti, lottie-react-native |

---

## Getting Started

### Prerequisites
- Node.js 16+
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with Auth and Firestore enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/Fnyz/Animist.git
cd Animist

# Install dependencies
npm install
```

### Firebase Setup

Create a `firebase.js` file in the root directory with your Firebase config:

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

### Running the App

```bash
# Start Expo development server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
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
└── components/
    ├── HomePage.js     # Main feed screen
    ├── DetailsPage.js  # Anime detail and episode list
    ├── WatchAnime.js   # Episode watch screen
    ├── CustomVideoPlayer.js  # Video player controls
    ├── SearchAnime.js  # Search screen
    ├── Profile.js      # User profile
    ├── LoginAndSignUp.js     # Auth screens
    └── ...             # Additional components
```

---

## License

This project is for educational and personal use.

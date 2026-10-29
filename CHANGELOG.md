# Changelog

What changed in each version of Animist. When you push a tag like `v1.1.0`, the matching
section below becomes the notes on the GitHub Release.

Add new versions at the top, using the same `## [x.y.z] - YYYY-MM-DD` heading.

## [Unreleased]

### New
- Ani-One Asia joins the official sources: its episodes play with their official English subtitles switched on (the app checks the English track is there, or uses a backup). The first run added 76 anime (including Bleach, Code Geass, Laid-Back Camp and To Your Eternity) and over 1,400 episodes.

### Changed
- The episode finder retries a request a few times when the connection drops, instead of stopping.
- The daily movie search only uses the official channels: the "Channels to review" list is gone (it was only re-uploads and reaction videos), and reaction, review and watch-along videos never count as a movie.

## [1.4.0] - 2026-10-28

### New
- Delete your account from Profile: everything you stored (My List, history, likes, comments, notifications) is removed, after confirming with your password or Google account.
- My List statuses: Watching, Plan to watch, Completed and Dropped, with filters. Starting an episode marks an anime Watching, and finishing the last episode of a finished show marks it Completed.
- A Schedule tab: what airs each day this week, in your time zone, with countdowns, and a filter for anime on your list.
- Seasons on anime pages: every season in release order, plus movies and specials (like Jujutsu Kaisen 0), with ▶ on the ones you can watch free. Refreshed daily.
- Trailer clips on Home: the top banners are now full width and play their trailer muted, one at a time. They fall back to the poster if a trailer won't load; turn them off in Profile to save data. The banner button is now "Watch now" (or your next episode) for anime with free episodes, and "Details" for the rest.
- Video player: ⟲10 / ⟳10 buttons beside play/pause to skip back or forward 10 seconds.
- Fullscreen: swipe up or down on the left side of the video to brighten or dim the picture (50–150%), and on the right side to turn the video's volume up or down. Both levels stay for the next episode.
- Trailer clips on Home play on Wi-Fi only by default, so they don't use mobile data (or a phone's hotspot). Profile now has Wi-Fi only, Always or Off. Needs the 1.4.0 APK.
- New episodes and fresh AniList data (Home lists, Schedule, genres) download by themselves from the daily update, saved on the phone, so they reach every app version from 1.4.0 on without an app update. A check costs no data when nothing changed.
- Search and genre pages look through all of AniList when you're online (not only the anime saved in the app), and fall back to the saved data offline.
- Anime pages show the saved data at once, then AniList's latest status and next episode.
- Import from AniList (Profile): enter a username and their public anime list comes into My List with its statuses (Watching, Plan to watch, Completed, Dropped). Anime already on My List stay as they are.
- Search filters: format, season, year and "Free to watch only", from the button next to the search box. Filters work without typing too (e.g. every movie from 2025).
- Your stats on Profile: episodes and hours watched, anime on My List, completed, and your favorite genres.
- Full movies: when an official channel uploads a whole anime movie for free, it plays in the app like an episode (the first run found 5, including That Time I Got Reincarnated as a Slime the Movie: Scarlet Bond). Movie pages say "Movie", and say so when there's no free official upload yet.
- Share links: Share on an anime page sends a link that opens the anime in Animist, or shows it with a download button when the app isn't installed. Needs the 1.4.0 APK to open links in the app.
- "New on Animist" on Home: what the daily update added this week, with NEW (just became free), MOVIE and +N EP badges, and a line like "Today: 2 new anime, 5 new movies, 7 new episodes".
- "Free movies" row on Home (and a See all list): every full anime movie that plays in the app.
- The daily update also searches all of YouTube for free full movies, 30 a day. Uploads from the official channels go into the app; full uploads from unknown channels are only listed for review in the update's pull request, never added.

### Changed
- Expo SDK 58 updated to the latest patch (58.0.20).
- Removed the unused comment code; old comments can no longer be added to (account deletion still removes them).

### Fixed
- "Change password" is no longer shown for Google accounts, which have no Animist password.
- Episodes that aren't free yet show buttons for the anime's official services (and "Check for new episodes"), instead of a dead end.
- Fullscreen video no longer cuts off the bottom and right edge of the picture on some phones, so subtitles near the bottom show in full.
- Fullscreen video now really hides the status bar (time, Wi-Fi, battery) and the bottom bar; they only show for a moment when you swipe from the edge.
- Brand-new anime without a description on AniList no longer break Home and their page.
- Descriptions show accented letters and dashes properly ("Éclair" instead of "&Eacute;clair").
- Seasons rows start at the left, even with a single card.

## [1.3.0] - 2026-10-27

Sign in with Google, get notified about new episodes, and use the app without an account.

### New
- Browse and watch without an account: the app opens straight to Home. Signing in is only needed to keep a list, history and progress, and it brings you back to where you were.
- Home stays current: trending, airing this season and new episodes are refreshed every day.
- A new look for the trending carousel: the poster art fills the card and fades into the page.
- Versions that must be installed (marked `[required]` in their notes) show an update prompt that can't be skipped.
- Continue with Google: sign in with your Google account in one tap.
- New-episode notifications: get notified when an anime on your list has a new free episode. Tapping it opens the anime with the episode ready.
- A new launch screen that fills the whole screen, with the app icon.

### Fixed
- YouTube's own title bar no longer flashes over the player while a video loads on a slow connection; the video's thumbnail shows until it plays.
- Fullscreen is truly fullscreen: the status bar (time, Wi-Fi) and Android's gesture bar are hidden until you swipe from an edge.
- A smaller download: the APK now only includes the code real phones use (no versions for computer emulators).

## [1.2.0] - 2026-10-26

Episodes inside the app: over 7,500 free episodes of 520+ anime from six official YouTube channels, with a player built for watching whole series.

### New
- Watch over 7,500 full episodes of 520+ anime inside the app, free from official YouTube channels (Muse Asia, Muse Philippines, Ani-One Philippines, GUNDAM CHANNEL INTL, BEYBLADE and Cardfight!! Vanguard), with English subtitles or dubs.
- A "Free to watch" row on Home, and a ▶ badge on every poster with episodes that play in the app.
- Fullscreen playback (landscape), a draggable progress bar, and a video quality picker.
- A Watch screen with previous/next, autoplay of the next episode, and the full episode list.
- Real episode titles and thumbnails, with official Crunchyroll links where YouTube doesn't have the episode.
- My List › History now shows what you watched and how much is left, and continues where you stopped.
- Episodes resume where you left off (with a "Start over" option), and episode lists show a progress bar for each episode you started.
- A "Continue watching" row on Home takes you straight back to the episode you were watching.
- When an episode ends, an "Up next" card counts down to the next one (with Cancel), and fullscreen carries on into it.
- Episodes can mix channels: if one channel is missing an episode, another official channel fills the gap.
- If YouTube blocks a video in your country, the player switches to a backup from another official channel.
- New episodes arrive automatically: a daily check of the official channels' RSS feeds refreshes the episode list.
- A "Check for new episodes" button on anime that are missing episodes loads the newest episode list right away (then rests for 5 minutes).
- The app tells you when a new version is out, with a button to download it.
- Tap the video to show a play/pause button in the middle; in fullscreen the controls now hide by themselves after a few seconds.
- An "offline" banner when the phone loses the internet, and the player starts again by itself when the connection is back. The player's error screen has a "Try again" button.
- A friendly "Something went wrong" screen instead of a blank screen if the app crashes, and crash reports with Sentry.

### Fixed
- Movies no longer list the TV series' episodes (for example Jujutsu Kaisen 0).
- "1 episode" and "1 result" instead of "1 episodes" and "1 results".
- YouTube's own buttons and title no longer show over the player (YouTube's mobile page placed them where the app didn't hide them).
- The "Resumed at" label keeps showing where the episode started, instead of changing while you watch.
- Overlays on the player and images (the "Up next" card, shades) cover what they should again; React Native 0.88 removed a style helper they used.

## [1.1.0] - 2026-10-23

The relaunch. Animist's old streaming source shut down, so the app now runs on legal,
stable sources and has a completely new look.

### New
- A new dark design with bottom tabs: Home, Search, My List and Profile.
- A new app icon with a coral frame to match the app.
- Home opens with a carousel of the top 5 trending anime, followed by rows for new episodes, trending, airing this season, all-time popular and top movies.
- Trailers play inside the app with simple play, pause, seek and mute controls.
- Every anime page shows where to watch it officially, such as Crunchyroll or Netflix.
- Search shows results as you type, and you can browse by genre.
- New Login and Create account screens, with an email verification step.
- You stay signed in after closing the app.
- Every account gets a cute avatar, and you can pick another in Edit profile.
- Redesigned Edit profile, Change password and Forgot password screens.

### Changed
- Anime information now comes from AniList.
- Episode playback is paused until the next update, which brings episodes from official YouTube channels.
- The admin approval step for new accounts was removed.

### Fixed
- The app crashed when opening popups on newer Android versions.
- Wrong-password and network errors on login didn't show any message.
- Avatars with broken image links were removed.

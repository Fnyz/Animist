# Changelog

What changed in each version of Animist. When you push a tag like `v1.1.0`, the matching
section below becomes the notes on the GitHub Release.

Add new versions at the top, using the same `## [x.y.z] - YYYY-MM-DD` heading.

## [1.1.0] - 2026-10-23

The relaunch. Animist's old streaming source shut down, so the app now runs on legal,
stable sources and has a completely new look.

### New
- A new dark design with bottom tabs: Home, Search, My List and Profile.
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

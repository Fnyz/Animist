// Share links for anime: https://fnyz.github.io/Animist/anime/?id=<AniList id>. The page there
// opens the anime in Animist when it's installed (animist://anime/<id>), and otherwise shows the
// anime with a download button (docs/anime/index.html).
import * as Linking from 'expo-linking';

export const SHARE_BASE = 'https://fnyz.github.io/Animist/anime/';
export const APP_SCHEME = 'animist';

export const shareUrl = (animeId) => `${SHARE_BASE}?id=${encodeURIComponent(String(animeId))}`;

// What the Share sheet sends: the title and the link.
export const shareMessage = (anime) => `${anime.title} — watch it on Animist: ${shareUrl(anime.id)}`;

// Which links open which screen: animist://anime/123 (from the share page), and the same path in
// Expo Go while developing.
export const linking = {
  prefixes: [Linking.createURL('/'), `${APP_SCHEME}://`],
  config: {
    screens: {
      AnimeDetail: 'anime/:animeId',
    },
  },
};

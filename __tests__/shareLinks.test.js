jest.mock('expo-linking', () => ({ createURL: (p) => `exp://127.0.0.1:8081/--${p}` }));

import { linking, shareMessage, shareUrl } from '../shareLinks';

describe('share links', () => {
  it('points to the share page with the AniList id', () => {
    expect(shareUrl(113415)).toBe('https://fnyz.github.io/Animist/anime/?id=113415');
  });

  it('shares the title with the link', () => {
    expect(shareMessage({ id: 113415, title: 'JUJUTSU KAISEN' })).toBe(
      'JUJUTSU KAISEN — watch it on Animist: https://fnyz.github.io/Animist/anime/?id=113415'
    );
  });

  it('opens animist://anime/<id> on the anime page', () => {
    expect(linking.prefixes).toContain('animist://');
    expect(linking.config.screens.AnimeDetail).toBe('anime/:animeId');
  });
});

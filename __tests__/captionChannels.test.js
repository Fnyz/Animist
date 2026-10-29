// The finder's rules for Ani-One Asia (English captions as a track, Chinese titles).
const { CHANNELS } = require('../scripts/channels');
const { episodeNumber, scorePlaylist } = require('../scripts/episodeMatching');

describe('Ani-One Asia as a provider', () => {
  const aniOneAsia = CHANNELS.find((c) => c.handle === '@AniOneAsia');

  it('is listed with English captions, after the channels with English in the picture', () => {
    expect(aniOneAsia).toMatchObject({ captions: 'en' });
    expect(CHANNELS.indexOf(aniOneAsia)).toBe(CHANNELS.length - 1);
    expect(aniOneAsia.skip.test('OVERLORD【Ani-One Asia ULTRA】')).toBe(true);
  });

  it('reads its episode numbers and matches its English playlist names', () => {
    expect(episodeNumber('《轉生就是劍 第二季》#5 (繁中字幕 | 日語原聲)【Ani-One Asia】')).toBe(5);
    const media = { title: { english: 'Tales of Wedding Rings', romaji: 'Kekkon Yubiwa Monogatari' }, synonyms: [] };
    expect(scorePlaylist('Tales of Wedding Rings｜婚戒物語【Ani-One Asia】', media)).toBeGreaterThan(0);
  });
});

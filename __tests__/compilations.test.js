jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const { compilationPart, compilationAnime, findCompilations } = require('../scripts/compilations');
import { lengthLabel, partTitle } from '../compilationTools';

const series = (id, english, extra = {}) => ({ id, format: 'TV', title: { english, romaji: english }, synonyms: [], popularity: 100, ...extra });
const CSM = 'Chainsaw Man The Compilation Part 2 (EN Sub / JP Dub)【Ani-One Philippines】';

describe('compilations', () => {
  it('are English uploads that call themselves a compilation, with their part number', () => {
    expect(compilationPart(CSM)).toBe(2);
    expect(compilationPart('Some Show The Compilation (English Sub)')).toBe(1);
    expect(compilationPart('《鏈鋸人 總集篇 前篇》(繁中字幕 | 日語配音)【Ani-One Asia】')).toBeNull(); // Chinese subtitles
    expect(compilationPart('Chainsaw Man Episode 4 (EN Sub / JP Dub)')).toBeNull();
    expect(compilationPart('Chainsaw Man The Compilation Trailer (EN Sub)')).toBeNull();
  });

  it('belong to the series of the same name, never a movie', () => {
    const tv = series(127230, 'Chainsaw Man');
    const movie = { ...series(171627, 'Chainsaw Man – The Movie: Reze Arc'), format: 'MOVIE' };
    expect(compilationAnime(CSM, [movie, tv])?.id).toBe(127230);
    expect(compilationAnime(CSM, [movie])).toBeNull();
    expect(compilationAnime('Other Show The Compilation (EN Sub)', [tv])).toBeNull();
  });

  it('keep full-length, embeddable, free parts in order', async () => {
    const item = (videoId, title) => ({ item: { contentDetails: { videoId }, snippet: { title } }, channel: { title: 'Ani-One Philippines' } });
    const uploads = [
      item('p2', CSM),
      item('p1', CSM.replace('Part 2', 'Part 1')),
      item('short', CSM.replace('Part 2', 'Part 3')),
      item('paid', CSM.replace('Part 2', 'Part 4')),
      item('ep', 'Chainsaw Man Episode 1 (EN Sub)'),
    ];
    const durations = { p1: 'PT2H', p2: 'PT1H35M33S', short: 'PT10M' };
    const yt = jest.fn(async (_, { id }) => ({
      items: id.split(',').map((v) => ({ id: v, status: { embeddable: true }, contentDetails: { duration: durations[v], regionRestriction: { allowed: ['PH'] } } })),
    }));
    const minutesOf = (iso) => {
      const m = String(iso ?? '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      return m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : 0;
    };
    const result = await findCompilations({ uploads, media: [series(127230, 'Chainsaw Man')], membersOnly: new Set(['paid']), yt, minutesOf });
    expect(result).toEqual({
      127230: [
        { part: 1, videoId: 'p1', channel: 'Ani-One Philippines', minutes: 120, allowedIn: ['PH'] },
        { part: 2, videoId: 'p2', channel: 'Ani-One Philippines', minutes: 95, allowedIn: ['PH'] },
      ],
    });
  });

  it('read well in the app', () => {
    expect(lengthLabel(95)).toBe('1 h 35 min');
    expect(lengthLabel(120)).toBe('2 h');
    expect(lengthLabel(40)).toBe('40 min');
    expect(partTitle([{ part: 1 }, { part: 2 }], { part: 2 })).toBe('Part 2');
    expect(partTitle([{ part: 1 }], { part: 1 })).toBe('Full compilation');
  });
});

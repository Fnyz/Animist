const { normalize, scorePlaylist, matchPlaylists, episodeNumber, isEnglishSub } = require('../scripts/episodeMatching');

const frieren = {
  id: 1,
  title: { english: "Frieren: Beyond Journey's End", romaji: 'Sousou no Frieren' },
  synonyms: ['Frieren at the Funeral'],
};
const frierenS2 = {
  id: 2,
  title: { english: "Frieren: Beyond Journey's End Season 2", romaji: 'Sousou no Frieren 2nd Season' },
  synonyms: [],
};

describe('normalize', () => {
  it('drops brackets, sub labels and punctuation', () => {
    expect(normalize("[Eng Sub] Frieren: Beyond Journey’s End (Muse Asia)")).toBe('frieren beyond journeys end');
  });
});

describe('season names', () => {
  const haikyu = { id: 30, title: { english: 'Haikyu!!', romaji: 'Haikyuu!!' }, synonyms: [] };
  const haikyu2 = { id: 31, title: { english: 'Haikyu!! 2nd Season', romaji: 'Haikyuu!! Second Season' }, synonyms: [] };

  it('treats "Season 1" as the base title', () => {
    expect(normalize('Haikyu!! Season 1')).toBe('haikyu');
    expect(scorePlaylist('Haikyu!! Season 1', haikyu)).toBe(100);
  });

  it('writes "2nd Season", "Second Season" and "Season2" the same way', () => {
    expect(normalize('Haikyu!! 2nd Season')).toBe('haikyu season 2');
    expect(normalize('Haikyuu!! Second Season')).toBe('haikyuu season 2');
    expect(normalize('AOASHI Season2')).toBe('aoashi season 2');
    expect(scorePlaylist('Haikyu!! Season 2', haikyu2)).toBe(100);
    expect(scorePlaylist('Haikyu!! Season 2', haikyu)).toBe(0);
  });

  it('ignores Muse Philippines and Ani-One Philippines labels', () => {
    expect(normalize('Lord of Mysteries 【Ani-One Philippines】')).toBe('lord of mysteries');
    expect(normalize('Lord of Mysteries Muse PH')).toBe('lord of mysteries');
  });
});

describe('missing titles', () => {
  it('handles anime with no English title', () => {
    const noEnglish = { id: 3, title: { english: null, romaji: 'Kusuriya no Hitorigoto' }, synonyms: null };
    expect(scorePlaylist('Kusuriya no Hitorigoto', noEnglish)).toBe(100);
    expect(normalize(null)).toBe('');
    expect(episodeNumber(null)).toBeNull();
  });
});

describe('scorePlaylist', () => {
  it('matches the exact title best', () => {
    expect(scorePlaylist("Frieren: Beyond Journey's End", frieren)).toBe(100);
  });

  it('matches the romaji title', () => {
    expect(scorePlaylist('Sousou no Frieren [Full Episodes]', frieren)).toBe(100);
  });

  it('accepts extra words around the title', () => {
    expect(scorePlaylist("Frieren: Beyond Journey's End | ENG SUB | All Episodes", frieren)).toBeGreaterThan(0);
  });

  it('skips other-language playlists', () => {
    expect(scorePlaylist("Frieren: Beyond Journey's End (Bahasa Indonesia)", frieren)).toBe(0);
    expect(scorePlaylist("Frieren: Beyond Journey's End [Thai Dub]", frieren)).toBe(0);
  });

  it('ignores unrelated playlists', () => {
    expect(scorePlaylist('Spy x Family', frieren)).toBe(0);
  });
});

describe('wrong matches found in the first real run', () => {
  const anime = (english, romaji = null, synonyms = []) => ({ id: english, title: { english, romaji }, synonyms });
  it.each([
    ['Re:ZERO -Starting Life in Another World-', anime('Another')],
    ['[English Dub] Re:Monster', anime('Monster')],
    ['《My Hero Academia FINAL SEASON》|《我的英雄學院 FINAL SEASON》', anime('Attack on Titan Final Season', null, ['Final Season'])],
    ['《Dr. STONE Season 4》|《Dr. STONE 新石紀（第四季）》【Ani-One Asia】', anime('Dr. STONE')],
    ['《My Hero Academia (Season 7)》|《我的英雄學院 (第七季)》【Ani-One Asia】', anime('My Hero Academia')],
    ['Date A Live V [English Sub]', anime('Date A Live')],
    ['ZOMBIE LAND SAGA REVENGE [English Sub]', anime('ZOMBIE LAND SAGA')],
    ['HUNTER×HUNTER 猎人 [中字]', anime('Hunter x Hunter (2011)', 'HUNTER×HUNTER')],
    ['《排球少年!!》第四季 |《Haikyu!!》S4【Ani-One Asia ULTRA】', anime('HAIKYU!!')],
  ])('does not match %s', (playlist, media) => {
    expect(scorePlaylist(playlist, media)).toBe(0);
  });

  it.each([
    ['《鏈鋸人》|《Chainsaw Man》【Ani-One Asia ULTRA】', anime('Chainsaw Man')],
    ['Bleach｜死神【Ani-One Asia ULTRA】', anime('Bleach')],
    ['Mob Psycho 100 (S1) [English Sub]', anime('Mob Psycho 100')],
    ['[2026 Oct] Firefly Wedding [English Sub]', anime('Firefly Wedding')],
    ['Re:ZERO -Starting Life in Another World- Season 2', anime('Re:ZERO -Starting Life in Another World- Season 2')],
    ['Mobile Suit Gundam SEED HD Remaster(w/subtiteles)', anime('Mobile Suit Gundam SEED')],
    ['Mobile Suit Gundam the Witch from Mercury(w/subtitles)', anime('Mobile Suit Gundam: The Witch from Mercury')],
  ])('still matches %s', (playlist, media) => {
    expect(scorePlaylist(playlist, media)).toBe(100);
  });
});

describe('isEnglishSub', () => {
  it.each([
    ['HUNTER×HUNTER - Episode 001 [English Sub]', true],
    ['Attack on Titan - Episode 01 (S1E01) [English Sub]', true],
    ['《鏈鋸人》#1 (繁中字幕 | 日語原聲)【Ani-One Asia ULTRA】', false],
    ['遊戲人生  第一話 | NO GAME NO LIFE EP01 |【Ani-One】(日語原聲 | 繁體中文字幕)', false],
    ['Some Anime - Episode 3', false],
    ['【EN Dub】Mobile Suit Gundam SEED - Episode1', true],
    ['Mobile Suit Gundam the Witch from Mercury #23 (w/subtitles)', true],
  ])('%s -> %s', (title, expected) => {
    expect(isEnglishSub(title)).toBe(expected);
  });

  it('treats Chinese recaps as not an episode', () => {
    expect(episodeNumber('【約定的夢幻島 THE PROMISED NEVERLAND】一分鐘回顧 #01')).toBeNull();
  });
});

describe('one playlist per anime', () => {
  it('gives a shared playlist to the main-title match, not an alternate name', () => {
    const base = { id: 10, title: { english: 'Tokyo Revengers', romaji: null }, synonyms: [] };
    const later = { id: 11, title: { english: 'Tokyo Revengers: War of the Three Titans', romaji: null }, synonyms: ['Tokyo Revengers'] };
    const matches = matchPlaylists([{ id: 'TR', title: 'Tokyo Revengers [English Sub]' }], [later, base]);
    expect(matches.get(10)[0].id).toBe('TR');
    expect(matches.has(11)).toBe(false);
  });
});

describe('same title, different shows', () => {
  it('gives the playlist to the more popular entry (TV series over a same-named OVA)', () => {
    const ova = { id: 20, title: { english: "JoJo's Bizarre Adventure", romaji: null }, synonyms: [], popularity: 9000 };
    const tv = { id: 21, title: { english: "JoJo's Bizarre Adventure", romaji: null }, synonyms: [], popularity: 450000 };
    const matches = matchPlaylists([{ id: 'JJ', title: "JoJo's Bizarre Adventure" }], [ova, tv]);
    expect(matches.get(21)[0].id).toBe('JJ');
    expect(matches.has(20)).toBe(false);
  });
});

describe('matchPlaylists', () => {
  it('gives each season its own playlist', () => {
    const playlists = [
      { id: 'PL1', title: "Frieren: Beyond Journey's End" },
      { id: 'PL2', title: "Frieren: Beyond Journey's End Season 2" },
    ];
    const matches = matchPlaylists(playlists, [frieren, frierenS2]);
    expect(matches.get(1).map((p) => p.id)).toEqual(['PL1']);
    expect(matches.get(2).map((p) => p.id)).toEqual(['PL2']);
  });

  it('keeps playlists from every channel, so they can fill each other\'s gaps', () => {
    const playlists = [
      { id: 'ASIA', title: "Frieren: Beyond Journey's End [English Sub]" },
      { id: 'PH', title: "Frieren: Beyond Journey's End - [English Sub]" },
    ];
    expect(matchPlaylists(playlists, [frieren, frierenS2]).get(1).map((p) => p.id)).toEqual(['ASIA', 'PH']);
  });

  it('puts exact-title playlists before alternate-name ones', () => {
    const playlists = [
      { id: 'ALT', title: 'Frieren at the Funeral' },
      { id: 'MAIN', title: "Frieren: Beyond Journey's End" },
    ];
    expect(matchPlaylists(playlists, [frieren]).get(1).map((p) => p.id)).toEqual(['MAIN', 'ALT']);
  });

  it('gives every same-titled playlist to the TV series, none to the OVA', () => {
    const ova = { id: 20, title: { english: "JoJo's Bizarre Adventure", romaji: null }, synonyms: [], popularity: 9000 };
    const tv = { id: 21, title: { english: "JoJo's Bizarre Adventure", romaji: null }, synonyms: [], popularity: 450000 };
    const playlists = [{ id: 'A', title: "JoJo's Bizarre Adventure" }, { id: 'B', title: "JoJo's Bizarre Adventure [English Sub]" }];
    const matches = matchPlaylists(playlists, [ova, tv]);
    expect(matches.get(21).map((p) => p.id)).toEqual(['A', 'B']);
    expect(matches.has(20)).toBe(false);
  });
});

describe('episodeNumber', () => {
  it.each([
    ["Frieren: Beyond Journey's End - Episode 5 [English Sub]", 5],
    ['Frieren EP05 | Muse Asia', 5],
    ['Sousou no Frieren #12', 12],
    ['葬送のフリーレン 第3話', 3],
    ['Frieren - 07 [ENG SUB]', 7],
  ])('reads %s', (title, n) => {
    expect(episodeNumber(title)).toBe(n);
  });

  it.each([
    'Frieren Official Trailer',
    'Frieren PV 2',
    'Frieren Episode 1-12 Full Compilation',
    'Frieren Recap Episode 10',
    'Private video',
    'Frieren Opening Theme',
  ])('skips %s', (title) => {
    expect(episodeNumber(title)).toBeNull();
  });
});

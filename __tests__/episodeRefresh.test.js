const { parseFeed, knownVideoIds, newEpisodeVideos, feedUrl } = require('../scripts/feeds');
const { sameContent, suspiciousDrop, summarizeChanges, episodeRanges, summaryMarkdown } = require('../scripts/episodeDiff');

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
  <title>Muse Asia</title>
  <entry>
    <yt:videoId>new1</yt:videoId>
    <title>Snowball Earth - Episode 13 [English Sub]</title>
    <published>2026-10-25T12:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>old1</yt:videoId>
    <title>Frieren - Episode 2 [English Sub]</title>
    <published>2026-10-20T12:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>pv1</yt:videoId>
    <title>Snowball Earth | Official Trailer [English Sub]</title>
  </entry>
  <entry>
    <yt:videoId>zh1</yt:videoId>
    <title>Snowball Earth - Episode 13 (Chinese Sub)</title>
  </entry>
  <entry>
    <yt:videoId>amp1</yt:videoId>
    <title>Tom &amp; Jerry &#39;Ep 4&#39; [English Sub]</title>
  </entry>
</feed>`;

const data = (anime) => ({ channels: [], media: {}, anime });
const show = (...numbers) => ({ episodes: Object.fromEntries(numbers.map((n) => [n, { videoId: `v${n}` }])) });

describe('YouTube feeds', () => {
  it('reads the videos in a feed', () => {
    const videos = parseFeed(FEED);
    expect(videos.map((v) => v.videoId)).toEqual(['new1', 'old1', 'pv1', 'zh1', 'amp1']);
    expect(videos[0]).toEqual({ videoId: 'new1', title: 'Snowball Earth - Episode 13 [English Sub]', published: '2026-10-25T12:00:00+00:00' });
    expect(videos[4].title).toBe("Tom & Jerry 'Ep 4' [English Sub]");
  });

  it('ignores broken feeds', () => {
    expect(parseFeed('')).toEqual([]);
    expect(parseFeed(null)).toEqual([]);
  });

  it('knows main and backup videos', () => {
    const ids = knownVideoIds({ anime: { 1: { episodes: { 1: { videoId: 'a', alts: [{ videoId: 'b' }] } } } } });
    expect([...ids]).toEqual(['a', 'b']);
  });

  it('finds only new English episodes', () => {
    const fresh = newEpisodeVideos(parseFeed(FEED), new Set(['old1']));
    expect(fresh.map((v) => v.videoId)).toEqual(['new1', 'amp1']);
  });

  it('accepts unlabeled videos on English-language channels', () => {
    const videos = [{ videoId: 'bb1', title: 'BEYBLADE X | Ep.53 Restart' }];
    expect(newEpisodeVideos(videos, new Set())).toEqual([]);
    expect(newEpisodeVideos(videos, new Set(), { english: true })).toHaveLength(1);
  });

  it('builds the feed address', () => {
    expect(feedUrl('UC123')).toBe('https://www.youtube.com/feeds/videos.xml?channel_id=UC123');
  });
});

describe('episode changes', () => {
  const before = data({ 1: show(1, 2), 2: show(1, 2, 3) });

  it('lists new episodes, new anime and removed episodes', () => {
    const after = data({ 1: show(1, 2, 3, 4), 2: show(1, 2), 3: show(1) });
    expect(summarizeChanges(before, after)).toEqual({
      newAnime: ['3'],
      updated: [{ id: '1', added: [3, 4] }],
      removedEpisodes: 1,
      before: 5,
      after: 7,
    });
  });

  it('treats everything as new on the first run', () => {
    expect(summarizeChanges(null, before)).toMatchObject({ newAnime: ['1', '2'], before: 0, after: 5 });
  });

  it('ignores the timestamp when checking for changes', () => {
    expect(sameContent({ ...before, generatedAt: 'a' }, { ...before, generatedAt: 'b' })).toBe(true);
    expect(sameContent(before, data({ 1: show(1, 2) }))).toBe(false);
  });

  it('flags a run that lost more than 10% of the episodes', () => {
    const big = data({ 1: show(...Array.from({ length: 100 }, (_, i) => i + 1)) });
    expect(suspiciousDrop(big, data({ 1: show(...Array.from({ length: 95 }, (_, i) => i + 1)) }))).toBe(false);
    expect(suspiciousDrop(big, data({ 1: show(...Array.from({ length: 80 }, (_, i) => i + 1)) }))).toBe(true);
    expect(suspiciousDrop(null, big)).toBe(false);
  });

  it('writes episode ranges', () => {
    expect(episodeRanges([3])).toBe('EP 3');
    expect(episodeRanges([3, 4, 5])).toBe('EP 3–5');
    expect(episodeRanges([1, 4, 5, 9])).toBe('EP 1, 4–5, 9');
  });

  it('writes a summary for the pull request', () => {
    const after = data({ 1: show(1, 2, 3), 2: show(1, 2, 3), 3: show(1) });
    const text = summaryMarkdown(summarizeChanges(before, after), (id) => `Anime ${id}`);
    expect(text).toContain('**7** episodes in the app (was 5).');
    expect(text).toContain('- Anime 1: EP 3');
    expect(text).toContain('### New anime');
    expect(text).toContain('- Anime 3');
  });
});

import { activeSkip, fitToVideo, parseSkipTimes } from '../skipTimes';

// AniSkip's real answer for JUJUTSU KAISEN episode 1.
const ANSWER = {
  found: true,
  results: [
    { interval: { startTime: 54.711, endTime: 145.111 }, skipType: 'op', episodeLength: 1435.122 },
    { interval: { startTime: 1338.255, endTime: 1428.255 }, skipType: 'ed', episodeLength: 1435.028 },
    { interval: { startTime: 5, endTime: 6 }, skipType: 'recap', episodeLength: 1435 },
  ],
};

describe('skip intro / outro', () => {
  it('reads openings and endings from AniSkip', () => {
    expect(parseSkipTimes(ANSWER).map((t) => t.type)).toEqual(['op', 'ed']);
    expect(parseSkipTimes({ found: false })).toEqual([]);
  });

  it('shifts the times when the upload is a little longer (a logo at the start)', () => {
    const [op] = fitToVideo(parseSkipTimes(ANSWER), 1441);
    expect(op.start).toBeCloseTo(60.6, 0);
    expect(op.end).toBeCloseTo(151, 0);
  });

  it('drops times for a very different version, and keeps them when the length is unknown', () => {
    expect(fitToVideo(parseSkipTimes(ANSWER), 1600)).toEqual([]);
    expect(fitToVideo(parseSkipTimes(ANSWER), 0).map((t) => t.start)).toEqual([54.711, 1338.255]);
  });

  it('shows the button during the part, until 2 s before its end', () => {
    const skips = [{ type: 'op', start: 55, end: 145 }];
    expect(activeSkip(skips, 30)).toBeNull();
    expect(activeSkip(skips, 60)?.type).toBe('op');
    expect(activeSkip(skips, 144)).toBeNull();
  });
});

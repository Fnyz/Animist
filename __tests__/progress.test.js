import { formatTime, isFinished, resumePoint, progressFraction, progressLabel, historyProgress, byLatest } from '../progress';

const p = (position, duration = 1440) => ({ position, duration }); // a 24-minute episode

describe('watch progress', () => {
  it('resumes where an unfinished episode was left', () => {
    expect(resumePoint(p(754))).toBe(754);
  });

  it('starts from the beginning when barely started or never watched', () => {
    expect(resumePoint(p(5))).toBe(0);
    expect(resumePoint(p(0, 0))).toBe(0);
  });

  it('starts finished episodes from the beginning (end credits count as finished)', () => {
    expect(isFinished(p(1400))).toBe(true);
    expect(resumePoint(p(1400))).toBe(0);
  });

  it('shows how much is left, or Watched', () => {
    expect(progressLabel(p(754))).toBe('11:26 left');
    expect(progressLabel(p(1430))).toBe('Watched');
    expect(progressLabel(p(0))).toBeNull();
  });

  it('fills the bar for finished episodes', () => {
    expect(progressFraction(p(720))).toBeCloseTo(0.5);
    expect(progressFraction(p(1400))).toBe(1);
    expect(progressFraction(p(0, 0))).toBe(0);
  });

  it('formats times', () => {
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3725)).toBe('1:02:05');
  });
});

describe('historyProgress', () => {
  it('continues an unfinished episode', () => {
    const data = { epiNumber: 3, positions: { 3: 300 }, durations: { 3: 1440 } };
    expect(historyProgress(data)).toEqual({ episode: 3, progress: { position: 300, duration: 1440 }, done: false, continueEp: 3 });
  });

  it('moves on to the next episode once one is finished', () => {
    const data = { epiNumber: 3, positions: { 3: 1420 }, durations: { 3: 1440 } };
    expect(historyProgress(data)).toMatchObject({ done: true, continueEp: 4 });
  });

  it('handles old entries without progress', () => {
    expect(historyProgress({ epiNumber: 2 })).toMatchObject({ episode: 2, done: false, continueEp: 2 });
    expect(historyProgress({})).toMatchObject({ episode: 1, continueEp: 1 });
  });
});

describe('byLatest', () => {
  const at = (ms) => ({ data: { updatedAt: { toMillis: () => ms } } });
  it('puts the newest first, and entries still saving before everything', () => {
    const saving = { data: {} };
    expect([at(1), at(3), saving, at(2)].sort(byLatest).map((h) => h.data.updatedAt?.toMillis() ?? 'saving'))
      .toEqual(['saving', 3, 2, 1]);
  });
});

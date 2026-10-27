import { dayKey, scheduleDays, groupByDay, countdown } from '../schedule';

// Local times, so the tests behave the same in any time zone.
const at = (y, m, d, h = 0, min = 0) => Math.floor(new Date(y, m - 1, d, h, min).getTime() / 1000);

describe('schedule helpers', () => {
  it('lists the next seven days from today', () => {
    const days = scheduleDays(new Date(2026, 9, 27, 15, 0));
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.key)).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(days[0].label).toBe('Today');
    expect(days[1].label).toBe('Tomorrow');
    expect(days[2].label).toBe('Thu 29');
  });

  it('groups episodes by their local day, soonest first', () => {
    const items = [
      { id: 'late', airingAt: at(2026, 10, 27, 23, 30) },
      { id: 'early', airingAt: at(2026, 10, 27, 8, 0) },
      { id: 'next', airingAt: at(2026, 10, 28, 0, 30) },
    ];
    const days = groupByDay(items);
    expect(days['2026-10-27'].map((i) => i.id)).toEqual(['early', 'late']);
    expect(days['2026-10-28'].map((i) => i.id)).toEqual(['next']);
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('counts down to each episode', () => {
    const now = new Date(2026, 9, 27, 12, 0).getTime();
    expect(countdown(at(2026, 10, 27, 12, 45), now)).toBe('in 45m');
    expect(countdown(at(2026, 10, 27, 15, 12), now)).toBe('in 3h 12m');
    expect(countdown(at(2026, 10, 29, 16, 0), now)).toBe('in 2d 4h');
    expect(countdown(at(2026, 10, 27, 12, 0) + 20, now)).toBe('in 1m');
    expect(countdown(at(2026, 10, 27, 11, 0), now)).toBe('Aired');
  });
});

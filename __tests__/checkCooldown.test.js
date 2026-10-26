import { COOLDOWN_MS, cooldownLeft } from '../checkCooldown';

describe('check for new episodes cooldown', () => {
  const at = 1_000_000;

  it('waits 5 minutes after a successful check', () => {
    expect(COOLDOWN_MS.latest).toBe(5 * 60 * 1000);
    expect(cooldownLeft({ at, result: 'latest' }, at + 60 * 1000)).toBe(4 * 60 * 1000);
    expect(cooldownLeft({ at, result: 'latest' }, at + 5 * 60 * 1000)).toBe(0);
  });

  it('waits only 30 seconds after a failed check', () => {
    expect(cooldownLeft({ at, result: 'error' }, at + 10 * 1000)).toBe(20 * 1000);
    expect(cooldownLeft({ at, result: 'error' }, at + 31 * 1000)).toBe(0);
  });

  it('allows a check when there was none, or for other results', () => {
    expect(cooldownLeft(null, at)).toBe(0);
    expect(cooldownLeft({ at, result: 'dev' }, at)).toBe(0);
  });
});

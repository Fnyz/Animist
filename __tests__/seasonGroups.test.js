const { buildGroups, isSeason } = require('../scripts/seasonGroups');

const entry = (id, year, relations = [], month = 1) => [id, { id, year, month, day: 1, relations }];

describe('season groups', () => {
  it('links seasons through prequels and sequels, oldest first', () => {
    const entries = new Map([
      entry(3, 2026, [{ id: 2, type: 'PREQUEL' }]),
      entry(1, 2020, [{ id: 2, type: 'SEQUEL' }]),
      entry(2, 2023, [{ id: 1, type: 'PREQUEL' }, { id: 3, type: 'SEQUEL' }]),
      entry(9, 2019), // stands alone
    ]);
    expect(buildGroups(entries)).toEqual([[1, 2, 3]]);
  });

  it('ignores side stories and links to anime it has no data for', () => {
    const entries = new Map([
      entry(1, 2020, [{ id: 5, type: 'SIDE_STORY' }, { id: 99, type: 'SEQUEL' }]),
      entry(5, 2021),
    ]);
    expect(buildGroups(entries)).toEqual([]);
  });

  it('orders same-year parts by month and puts unknown dates last', () => {
    const entries = new Map([
      entry(1, 2025, [{ id: 2, type: 'SEQUEL' }, { id: 3, type: 'SEQUEL' }], 10),
      entry(2, 2025, [], 3),
      [3, { id: 3, year: null, relations: [] }],
    ]);
    expect(buildGroups(entries)).toEqual([[2, 1, 3]]);
  });

  it('sorts formats into seasons and movies & specials', () => {
    expect(['TV', 'TV_SHORT', 'ONA', null].map(isSeason)).toEqual([true, true, true, true]);
    expect(['MOVIE', 'OVA', 'SPECIAL'].map(isSeason)).toEqual([false, false, false]);
  });
});

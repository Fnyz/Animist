// How long "Check for new episodes" rests after a check. New episodes are published a few times a
// day at most, so checking more often can't find anything; after a failure (usually no internet)
// the wait is short so people can try again once they're connected.
export const COOLDOWN_MS = { latest: 5 * 60 * 1000, error: 30 * 1000 };

// Milliseconds left before the next check is allowed, for the last check's { at, result }.
export const cooldownLeft = (last, now = Date.now()) => {
  if (!last) return 0;
  return Math.max(0, last.at + (COOLDOWN_MS[last.result] ?? 0) - now);
};

// Watch progress helpers shared by the Watch, Details, Home and My List screens.
// A progress is { position, duration } in seconds.

export const formatTime = (s) => {
  const total = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// An episode counts as watched in its last minute (end credits) or past 95%.
export const isFinished = ({ position, duration }) =>
  duration > 0 && (position >= duration - 60 || position / duration >= 0.95);

// Where to start an episode: where it was left, unless it was barely started or already finished.
export const resumePoint = (progress) => (progress.position > 10 && !isFinished(progress) ? progress.position : 0);

// 0..1 for a progress bar (finished episodes show full).
export const progressFraction = (progress) =>
  progress.duration > 0 ? (isFinished(progress) ? 1 : Math.min(progress.position / progress.duration, 1)) : 0;

// "Watched", "12:34 left", or null when not started.
export const progressLabel = (progress) => {
  if (isFinished(progress)) return 'Watched';
  if (progress.position > 10 && progress.duration > 0) return `${formatTime(progress.duration - progress.position)} left`;
  return null;
};

// For a History entry (one per anime): the episode last watched, its progress, and the episode
// to continue with: the same one unless it's finished, then the next.
export const historyProgress = (data) => {
  const episode = data.epiNumber ?? 1;
  const progress = { position: data.positions?.[episode] ?? 0, duration: data.durations?.[episode] ?? 0 };
  const done = isFinished(progress);
  return { episode, progress, done, continueEp: done ? episode + 1 : episode };
};

// History entries newest first; entries still being saved (no time yet) count as newest.
export const byLatest = (a, b) =>
  (b.data.updatedAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER) - (a.data.updatedAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER);

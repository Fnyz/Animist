// Helpers for the Schedule tab: days of the week ahead, local air times and countdowns.
// Times are the phone's own time zone (Date does that).

// "2026-10-28" for a date, in local time.
export const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// The next `count` days from today: [{ key, label, date }], labelled "Today", "Tomorrow", "Thu 30"…
export const scheduleDays = (now = new Date(), count = 7) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const label =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}`;
    return { key: dayKey(date), label, date };
  });

// Episodes by local day: { "2026-10-28": [...] }, each day soonest first.
export const groupByDay = (items) => {
  const days = {};
  for (const item of items) (days[dayKey(new Date(item.airingAt * 1000))] ??= []).push(item);
  for (const list of Object.values(days)) list.sort((a, b) => a.airingAt - b.airingAt);
  return days;
};

// "9:30 PM"
export const airTime = (airingAt) => new Date(airingAt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// "in 45m", "in 3h 12m", "in 2d 4h", or "Aired" once it's out.
export const countdown = (airingAt, nowMs = Date.now()) => {
  const minutes = Math.floor((airingAt * 1000 - nowMs) / 60000);
  if (minutes < 0) return 'Aired';
  if (minutes < 60) return `in ${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.floor(hours / 24)}d ${hours % 24}h`;
};

// Labels and saved positions for compilations (a season recut into a few long videos; see
// compilationParts in api.js). Positions are kept on the phone: { videoId: { position, duration } }.
import { useSetting } from './settings';

// "Part 2", or "Full compilation" when it's one video.
export const partTitle = (parts, part) => (parts.length > 1 ? `Part ${part.part}` : 'Full compilation');

// 95 -> "1 h 35 min", 120 -> "2 h", 40 -> "40 min".
export const lengthLabel = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
};

// [positions, save(videoId, { position, duration })] for one anime's compilation.
export const useCompilationProgress = (animeId) => {
  const [positions, setPositions] = useSetting(`compilation.${animeId}`, {});
  return [positions, (videoId, progress) => setPositions({ ...positions, [videoId]: progress })];
};

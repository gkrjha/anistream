// Watch history stored in localStorage
// Tracks: anime/movie/series with last watched episode + progress

export interface WatchEntry {
  id: string;              // unique key: "anime-{malId}" | "movie-{tmdbId}" | "series-{tmdbId}"
  type: 'anime' | 'movie' | 'series';
  title: string;
  image: string | null;
  watchUrl: string;        // base watch URL
  // Anime specific
  anilistId?: number | null;
  malId?: number | null;
  episode?: number;
  totalEpisodes?: number;
  // Series specific
  season?: number;
  // Shared
  lang?: 'sub' | 'dub';
  updatedAt: number;       // Date.now()
}

const KEY = 'anistream_history';
const MAX = 20;

function load(): WatchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch { return []; }
}

function save(entries: WatchEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function saveProgress(entry: Omit<WatchEntry, 'updatedAt'>) {
  const entries = load().filter((e) => e.id !== entry.id);
  entries.unshift({ ...entry, updatedAt: Date.now() });
  save(entries.slice(0, MAX));
}

export function getHistory(): WatchEntry[] {
  return load().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getEntry(id: string): WatchEntry | null {
  return load().find((e) => e.id === id) ?? null;
}

export function removeEntry(id: string) {
  save(load().filter((e) => e.id !== id));
}

export function clearHistory() {
  save([]);
}

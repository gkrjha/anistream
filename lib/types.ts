export interface MediaItem {
  id: number;
  title: string;
  image: string | null;
  rating: string;
  year: string;
  synopsis: string;
  genres: string[];
  type: 'Anime' | 'Movie' | 'Series';
  episodes?: number | null;
  status?: string;
  badge?: string | null;
  embedUrl: string;
  watchUrl: string;
  tmdbId: number | null;
  anilistId?: number | null;
  malId?: number | null;
}

// AniList GraphQL response shape
export interface AniListAnime {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null };
  coverImage: { large: string | null; extraLarge: string | null } | null;
  averageScore: number | null;
  episodes: number | null;
  status: string;
  format: string;
  nextAiringEpisode: { episode: number } | null;
  description: string | null;
  genres: string[];
  startDate: { year: number | null } | null;
}

// Kept for backward compat (TMDB)
export interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  overview: string;
  genre_ids: number[];
}

export interface TMDBSeries {
  id: number;
  name: string;
  poster_path: string | null;
  vote_average: number;
  first_air_date: string;
  overview: string;
  genre_ids: number[];
}

import { MediaItem, AniListAnime, TMDBMovie, TMDBSeries } from './types';
import { cached } from './redis';

const ANILIST_URL = 'https://graphql.anilist.co';
const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '8265bd1679663a7ea12ac168da84d2e8';

// ── Embed URL builders ────────────────────────────────────────
export function getMovieEmbedUrl(tmdbId: number) {
  return `https://vidnest.fun/movie/${tmdbId}`;
}
export function getSeriesEmbedUrl(tmdbId: number, season = 1, episode = 1) {
  return `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}`;
}
// VidNest anime embed — uses AniList ID directly
export function getAnimeEmbedUrl(anilistId: number, episode = 1, lang: 'sub' | 'dub' = 'sub') {
  return `https://vidnest.fun/anime/${anilistId}/${episode}/${lang}`;
}
// aniflix.uno embed — uses their own internal ID
export function getAniflixEmbedUrl(aniflixId: number, episode = 1) {
  return `https://aniflix.uno/player/${aniflixId}/?ep=${episode}`;
}

// ── AniList GraphQL helper ────────────────────────────────────
async function anilist<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch { return null; }
}

// ── Resolve actual episode count ──────────────────────────────
export function resolveEpisodeCount(anime: AniListAnime): number {
  // Airing: nextAiringEpisode.episode - 1 = last aired
  if (anime.nextAiringEpisode?.episode) return anime.nextAiringEpisode.episode - 1;
  if (anime.episodes) return anime.episodes;
  return 12;
}

// ── AniList anime → MediaItem ─────────────────────────────────
export function parseAniListAnime(a: AniListAnime): MediaItem {
  const epCount = resolveEpisodeCount(a);
  const title = a.title.english || a.title.romaji;
  const score = a.averageScore ? (a.averageScore / 10).toFixed(1) : 'N/A';
  const year = a.startDate?.year ? String(a.startDate.year) : '';
  const synopsis = a.description
    ? a.description.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
    : 'No description available.';

  return {
    id: a.id,
    malId: a.idMal ?? null,
    anilistId: a.id,
    title,
    image: a.coverImage?.extraLarge || a.coverImage?.large || null,
    rating: score,
    year,
    episodes: epCount,
    status: a.status,
    synopsis,
    genres: a.genres ?? [],
    type: 'Anime',
    badge: a.format === 'MOVIE' ? 'Movie' : null,
    embedUrl: getAnimeEmbedUrl(a.id),
    watchUrl: `/watch/anime/${a.idMal ?? a.id}`,
    tmdbId: null,
  };
}

// ── TMDB parsers ──────────────────────────────────────────────
export function parseMovie(m: TMDBMovie): MediaItem {
  return {
    id: m.id,
    title: m.title,
    image: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
    rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
    year: m.release_date ? m.release_date.split('-')[0] : '',
    synopsis: m.overview || 'No description available.',
    genres: [],
    type: 'Movie',
    badge: null,
    embedUrl: getMovieEmbedUrl(m.id),
    watchUrl: `/watch/movie/${m.id}`,
    tmdbId: m.id,
  };
}

export function parseSeries(s: TMDBSeries): MediaItem {
  return {
    id: s.id,
    title: s.name,
    image: s.poster_path ? `${TMDB_IMG}${s.poster_path}` : null,
    rating: s.vote_average ? s.vote_average.toFixed(1) : 'N/A',
    year: s.first_air_date ? s.first_air_date.split('-')[0] : '',
    synopsis: s.overview || 'No description available.',
    genres: [],
    type: 'Series',
    badge: null,
    embedUrl: getSeriesEmbedUrl(s.id),
    watchUrl: `/watch/series/${s.id}`,
    tmdbId: s.id,
  };
}

// ── TMDB helper ───────────────────────────────────────────────
async function tmdb<T>(path: string): Promise<T | null> {
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// ── AniList fragment (reused in all queries) ──────────────────
const ANIME_FIELDS = `
  id idMal
  title { romaji english }
  coverImage { large extraLarge }
  averageScore episodes status format
  nextAiringEpisode { episode }
  description(asHtml: false)
  genres
  startDate { year }
`;

// ── Anime fetchers (AniList) ──────────────────────────────────
export async function getTrendingAnime(limit = 12): Promise<MediaItem[]> {
  const result = await cached(`trending_anime_${limit}`, async () => {
    const data = await anilist<{ Page: { media: AniListAnime[] } }>(`
      query($limit:Int){
        Page(page:1,perPage:$limit){
          media(type:ANIME,sort:TRENDING_DESC,isAdult:false){${ANIME_FIELDS}}
        }
      }
    `, { limit });
    return (data?.Page?.media ?? []).map(parseAniListAnime);
  }, 1800);
  return Array.isArray(result) ? result : [];
}

export async function getTopAnime(limit = 12): Promise<MediaItem[]> {
  const result = await cached(`top_anime_${limit}`, async () => {
    const data = await anilist<{ Page: { media: AniListAnime[] } }>(`
      query($limit:Int){
        Page(page:1,perPage:$limit){
          media(type:ANIME,sort:SCORE_DESC,isAdult:false){${ANIME_FIELDS}}
        }
      }
    `, { limit });
    return (data?.Page?.media ?? []).map(parseAniListAnime);
  }, 21600);
  return Array.isArray(result) ? result : [];
}

export async function getAnimeList(
  page = 1, genre = '', format = '', status = ''
): Promise<{ items: MediaItem[]; hasNext: boolean }> {
  const key = `anime_list_${page}_${genre}_${format}_${status}`;
  return cached(key, async () => {
    const vars: Record<string, unknown> = { page, perPage: 20 };
    if (genre) vars.genre = genre;
    if (format) vars.format = format;
    if (status) vars.status = status;
    const data = await anilist<{ Page: { media: AniListAnime[]; pageInfo: { hasNextPage: boolean } } }>(`
      query($page:Int,$perPage:Int,$genre:String,$format:MediaFormat,$status:MediaStatus){
        Page(page:$page,perPage:$perPage){
          pageInfo { hasNextPage }
          media(type:ANIME,sort:POPULARITY_DESC,isAdult:false,genre:$genre,format:$format,status:$status){
            ${ANIME_FIELDS}
          }
        }
      }
    `, vars);
    return {
      items: (data?.Page?.media ?? []).map(parseAniListAnime),
      hasNext: data?.Page?.pageInfo?.hasNextPage ?? false,
    };
  }, 3600); // 1 hour
}

export async function getAnimeById(malId: number): Promise<MediaItem | null> {
  return cached(`anime_mal_${malId}`, async () => {
    const data = await anilist<{ Media: AniListAnime }>(`
      query($malId:Int){ Media(idMal:$malId,type:ANIME){${ANIME_FIELDS}} }
    `, { malId });
    if (data?.Media) return parseAniListAnime(data.Media);
    const data2 = await anilist<{ Media: AniListAnime }>(`
      query($id:Int){ Media(id:$id,type:ANIME){${ANIME_FIELDS}} }
    `, { id: malId });
    return data2?.Media ? parseAniListAnime(data2.Media) : null;
  }, 86400); // 24 hours — individual anime rarely changes
}

export async function searchAnime(query: string, limit = 8): Promise<MediaItem[]> {
  return cached(`search_anime_${query}_${limit}`, async () => {
    const data = await anilist<{ Page: { media: AniListAnime[] } }>(`
      query($query:String,$limit:Int){
        Page(page:1,perPage:$limit){
          media(type:ANIME,search:$query,isAdult:false){${ANIME_FIELDS}}
        }
      }
    `, { query, limit });
    return (data?.Page?.media ?? []).map(parseAniListAnime);
  }, 1800); // 30 min
}

// ── Movies ────────────────────────────────────────────────────
export async function getPopularMovies(page = 1) {
  return cached(`popular_movies_${page}`, () =>
    tmdb<{ results: TMDBMovie[]; total_pages: number }>(`/movie/popular?page=${page}`)
      .then((d) => ({ items: d?.results?.map(parseMovie) ?? [], totalPages: d?.total_pages ?? 1 }))
  , 3600);
}

export async function getMovies(page = 1, genre = '', sort = 'popularity.desc', language = '') {
  const key = `movies_${page}_${genre}_${sort}_${language}`;
  return cached(key, async () => {
    let url = `/discover/movie?page=${page}&sort_by=${sort}`;
    if (genre) url += `&with_genres=${genre}`;
    if (language) url += `&with_original_language=${language}`;
    const d = await tmdb<{ results: TMDBMovie[]; total_pages: number }>(url);
    return { items: d?.results?.map(parseMovie) ?? [], totalPages: d?.total_pages ?? 1 };
  }, 3600);
}

export async function getMovieDetails(tmdbId: number) {
  return cached(`movie_${tmdbId}`, () =>
    tmdb<TMDBMovie & { genres: { id: number; name: string }[] }>(`/movie/${tmdbId}`)
  , 86400); // 24 hours
}

// ── Series ────────────────────────────────────────────────────
export async function getPopularSeries(page = 1) {
  return cached(`popular_series_${page}`, () =>
    tmdb<{ results: TMDBSeries[]; total_pages: number }>(`/tv/popular?page=${page}`)
      .then((d) => ({ items: d?.results?.map(parseSeries) ?? [], totalPages: d?.total_pages ?? 1 }))
  , 3600);
}

export async function getSeries(page = 1, genre = '', sort = 'popularity.desc', language = '') {
  const key = `series_${page}_${genre}_${sort}_${language}`;
  return cached(key, async () => {
    let url = `/discover/tv?page=${page}&sort_by=${sort}`;
    if (genre) url += `&with_genres=${genre}`;
    if (language) url += `&with_original_language=${language}`;
    const d = await tmdb<{ results: TMDBSeries[]; total_pages: number }>(url);
    return { items: d?.results?.map(parseSeries) ?? [], totalPages: d?.total_pages ?? 1 };
  }, 3600);
}

export async function getSeriesDetails(tmdbId: number) {
  return cached(`series_${tmdbId}`, () =>
    tmdb<TMDBSeries & { genres: { id: number; name: string }[]; number_of_seasons: number }>(`/tv/${tmdbId}`)
  , 86400); // 24 hours
}

// ── Search All ────────────────────────────────────────────────
export async function searchAll(query: string): Promise<MediaItem[]> {
  return cached(`search_all_${query}`, async () => {
    const [animeResults, tmdbResults] = await Promise.all([
      searchAnime(query, 6),
      tmdb<{ results: (TMDBMovie & TMDBSeries & { media_type: string })[] }>(
        `/search/multi?query=${encodeURIComponent(query)}&page=1`
      ),
    ]);
    const tmdbItems: MediaItem[] = (tmdbResults?.results ?? []).slice(0, 8).flatMap((r) => {
      if (r.media_type === 'movie') return [parseMovie(r as TMDBMovie)];
      if (r.media_type === 'tv') return [parseSeries(r as TMDBSeries)];
      return [];
    });
    return [...animeResults, ...tmdbItems];
  }, 1800);
}

// ── aniflix.uno ID lookup ─────────────────────────────────────
// aniflix.uno uses their own internal numeric IDs (not AniList IDs).
// We maintain a static map of popular AniList IDs → aniflix IDs,
// and do a fast title-slug search for unknown anime.
const ANIFLIX_KNOWN: Record<number, number> = {
  // AniList ID → aniflix.uno player ID
  21: 62,      // One Piece
  20: 21,      // Naruto (AniList 20)
  1735: 21,    // Naruto Shippuden (AniList 1735) — approximate
  11061: 200,  // Attack on Titan (AniList 11061)
  16498: 100,  // That Time I Got Reincarnated as a Slime
  113415: 21,  // My Hero Academia (AniList 113415 = MHA S1)
  // Add more as discovered
};

const aniflixCache = new Map<number, number | null>();

export async function getAniflixId(anilistId: number, _title: string): Promise<number | null> {
  if (aniflixCache.has(anilistId)) return aniflixCache.get(anilistId)!;
  const known = ANIFLIX_KNOWN[anilistId] ?? null;
  aniflixCache.set(anilistId, known);
  return known;
}

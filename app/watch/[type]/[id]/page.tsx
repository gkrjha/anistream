import { getMovieDetails, getSeriesDetails, getSeriesEmbedUrl, getMovieEmbedUrl, TMDB_IMG } from '@/lib/api';
import WatchPlayer from '@/components/WatchPlayer';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

interface Props {
  params: Promise<{ type: string; id: string }>;
}

export default async function WatchPage({ params }: Props) {
  const { type, id } = await params;
  const tmdbId = Number(id);

  if (isNaN(tmdbId)) return notFound();

  if (type === 'movie') {
    const movie = await getMovieDetails(tmdbId);
    if (!movie) return notFound();
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#06060f]" />}>
        <WatchPlayer
          title={movie.title}
          image={movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null}
          embedUrl={getMovieEmbedUrl(tmdbId)}
          type="movie"
          tmdbId={tmdbId}
          synopsis={movie.overview}
          rating={movie.vote_average?.toFixed(1) ?? 'N/A'}
          year={movie.release_date?.split('-')[0] ?? ''}
          genres={(movie.genres || []).map((g) => g.name)}
        />
      </Suspense>
    );
  }

  if (type === 'series') {
    const series = await getSeriesDetails(tmdbId);
    if (!series) return notFound();
    const seasons = series.number_of_seasons ?? 1;
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#06060f]" />}>
        <WatchPlayer
          title={series.name}
          image={series.poster_path ? `${TMDB_IMG}${series.poster_path}` : null}
          embedUrl={getSeriesEmbedUrl(tmdbId, 1, 1)}
          type="series"
          tmdbId={tmdbId}
          synopsis={series.overview}
          rating={series.vote_average?.toFixed(1) ?? 'N/A'}
          year={series.first_air_date?.split('-')[0] ?? ''}
          genres={(series.genres || []).map((g: { name: string }) => g.name)}
          totalSeasons={seasons}
        />
      </Suspense>
    );
  }

  return notFound();
}

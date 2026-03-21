import { getMovieDetails, getSeriesDetails, getSeriesEmbedUrl, getMovieEmbedUrl, TMDB_IMG } from '@/lib/api';
import WatchPlayer from '@/components/WatchPlayer';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ type: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, id } = await params;
  const tmdbId = Number(id);
  if (isNaN(tmdbId)) return {};

  if (type === 'movie') {
    const movie = await getMovieDetails(tmdbId);
    if (!movie) return {};
    const image = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : undefined;
    return {
      title: `${movie.title} — Watch Free on AniStream`,
      description: movie.overview?.slice(0, 160) || `Watch ${movie.title} free in HD on AniStream.`,
      openGraph: { title: movie.title, description: movie.overview?.slice(0, 160), images: image ? [image] : [], type: 'video.movie' },
      twitter: { card: 'summary_large_image', title: movie.title, images: image ? [image] : [] },
    };
  }

  if (type === 'series') {
    const series = await getSeriesDetails(tmdbId);
    if (!series) return {};
    const image = series.poster_path ? `${TMDB_IMG}${series.poster_path}` : undefined;
    return {
      title: `${series.name} — Watch Free on AniStream`,
      description: series.overview?.slice(0, 160) || `Watch ${series.name} free in HD on AniStream.`,
      openGraph: { title: series.name, description: series.overview?.slice(0, 160), images: image ? [image] : [], type: 'video.tv_show' },
      twitter: { card: 'summary_large_image', title: series.name, images: image ? [image] : [] },
    };
  }

  return {};
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

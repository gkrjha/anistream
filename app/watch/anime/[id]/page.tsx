import { getAnimeById, getAniflixId } from '@/lib/api';
import AnimeWatchPlayer from '@/components/AnimeWatchPlayer';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnimeWatchPage({ params }: Props) {
  const { id } = await params;
  const malId = Number(id);
  if (isNaN(malId)) return notFound();

  const anime = await getAnimeById(malId);
  if (!anime) return notFound();

  const aniflixId = anime.anilistId
    ? await getAniflixId(anime.anilistId, anime.title)
    : null;

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06060f]" />}>
      <AnimeWatchPlayer
        title={anime.title}
        image={anime.image}
        anilistId={anime.anilistId ?? null}
        malId={malId}
        totalEpisodes={anime.episodes ?? 12}
        synopsis={anime.synopsis}
        rating={anime.rating}
        year={anime.year}
        genres={anime.genres}
        aniflixId={aniflixId}
      />
    </Suspense>
  );
}

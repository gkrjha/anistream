import { getAnimeById, getAniflixId } from '@/lib/api';
import AnimeWatchPlayer from '@/components/AnimeWatchPlayer';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const malId = Number(id);
  if (isNaN(malId)) return {};
  const anime = await getAnimeById(malId);
  if (!anime) return {};
  return {
    title: `${anime.title} — Watch Free on AniStream`,
    description: anime.synopsis?.slice(0, 160) || `Watch ${anime.title} free on AniStream.`,
    openGraph: { title: anime.title, description: anime.synopsis?.slice(0, 160), images: anime.image ? [anime.image] : [], type: 'video.tv_show' },
    twitter: { card: 'summary_large_image', title: anime.title, images: anime.image ? [anime.image] : [] },
  };
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

import { getTrendingAnime, getTopAnime, getPopularMovies, getPopularSeries } from '@/lib/api';
import HeroBanner from '@/components/HeroBanner';
import SectionRow from '@/components/SectionRow';
import ContinueWatching from '@/components/ContinueWatching';
import { Flame, Star, Clapperboard, Tv2 } from 'lucide-react';

export default async function HomePage() {
  const [trendingRaw, topAnimeRaw, movies, series] = await Promise.all([
    getTrendingAnime(16),
    getTopAnime(16),
    getPopularMovies(1),
    getPopularSeries(1),
  ]);

  const trending = Array.isArray(trendingRaw) ? trendingRaw : [];
  const topAnime = Array.isArray(topAnimeRaw) ? topAnimeRaw : [];

  return (
    <>
      <HeroBanner items={trending.slice(0, 6)} />

      <div className="space-y-8 pb-10 mt-2">
        <ContinueWatching />
        <SectionRow title="Trending Anime" icon={<Flame size={18} className="text-orange-400" />} items={trending} viewAllHref="/anime" />
        <SectionRow title="Top Rated Anime" icon={<Star size={18} className="text-yellow-400" />} items={topAnime} viewAllHref="/anime" />
        {movies.items.length > 0 && (
          <SectionRow title="Popular Movies" icon={<Clapperboard size={18} className="text-sky-400" />} items={movies.items.slice(0, 16)} viewAllHref="/movies" />
        )}
        {series.items.length > 0 && (
          <SectionRow title="Popular Web Series" icon={<Tv2 size={18} className="text-emerald-400" />} items={series.items.slice(0, 16)} viewAllHref="/webseries" />
        )}
      </div>
    </>
  );
}

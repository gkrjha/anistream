import { getTrendingAnime, getTopAnime, getPopularMovies, getPopularSeries } from '@/lib/api';
import HeroBanner from '@/components/HeroBanner';
import SectionRow from '@/components/SectionRow';
import ContinueWatching from '@/components/ContinueWatching';

export default async function HomePage() {
  const [trending, topAnime, movies, series] = await Promise.all([
    getTrendingAnime(16),
    getTopAnime(16),
    getPopularMovies(1),
    getPopularSeries(1),
  ]);

  return (
    <>
      <HeroBanner items={trending.slice(0, 6)} />

      <div className="space-y-8 pb-10 mt-2">
        <ContinueWatching />
        <SectionRow title="Trending Anime" icon="🔥" items={trending} viewAllHref="/anime" />
        <SectionRow title="Top Rated Anime" icon="⭐" items={topAnime} viewAllHref="/anime" />
        {movies.items.length > 0 && (
          <SectionRow title="Popular Movies" icon="🎬" items={movies.items.slice(0, 16)} viewAllHref="/movies" />
        )}
        {series.items.length > 0 && (
          <SectionRow title="Popular Web Series" icon="📺" items={series.items.slice(0, 16)} viewAllHref="/webseries" />
        )}
      </div>
    </>
  );
}

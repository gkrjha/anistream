'use client';
import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '@/lib/types';
import MediaGrid from '@/components/MediaGrid';

const GENRES = [
  { value: '', label: 'All Genres' }, { value: '28', label: 'Action' },
  { value: '12', label: 'Adventure' }, { value: '16', label: 'Animation' },
  { value: '35', label: 'Comedy' }, { value: '18', label: 'Drama' },
  { value: '14', label: 'Fantasy' }, { value: '27', label: 'Horror' },
  { value: '10749', label: 'Romance' }, { value: '878', label: 'Sci-Fi' },
  { value: '53', label: 'Thriller' },
];
const SORTS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'release_date.desc', label: 'Latest' },
  { value: 'revenue.desc', label: 'Box Office' },
];

const INDUSTRY_TABS = [
  { label: 'All', lang: '' },
  { label: '🎬 Hollywood', lang: 'en' },
  { label: '🇮🇳 Bollywood', lang: 'hi' },
  { label: '🎌 Anime Films', lang: 'ja' },
  { label: '🇰🇷 Korean', lang: 'ko' },
  { label: '🇮🇳 Tamil', lang: 'ta' },
  { label: '🇮🇳 Telugu', lang: 'te' },
];

export default function MoviesPageClient() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('popularity.desc');
  const [language, setLanguage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort });
    if (genre) params.set('genre', genre);
    if (language) params.set('language', language);
    const res = await fetch(`/api/movies?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, genre, sort, language]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(setter: (v: string) => void, val: string) {
    setter(val); setPage(1);
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-3xl font-black text-white">🎬 Movies</h1>
        <div className="flex gap-3 flex-wrap">
          <Select options={GENRES} value={genre} onChange={(v) => applyFilter(setGenre, v)} />
          <Select options={SORTS} value={sort} onChange={(v) => applyFilter(setSort, v)} />
        </div>
      </div>

      {/* Industry tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {INDUSTRY_TABS.map((tab) => (
          <button key={tab.lang} onClick={() => applyFilter(setLanguage, tab.lang)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border
              ${language === tab.lang
                ? 'bg-red-600 border-red-500 text-white shadow-[0_0_16px_rgba(229,9,20,0.35)]'
                : 'bg-white/[0.05] border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.1]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <GridSkeleton /> : <MediaGrid items={items} emptyMsg="Add TMDB API key in .env.local to load movies." />}

      <div className="flex items-center justify-center gap-4 py-8">
        <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</PageBtn>
        <span className="text-gray-400 font-semibold">Page {page} / {totalPages}</span>
        <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</PageBtn>
      </div>
    </div>
  );
}

function Select({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-[#12121a] border border-white/15 text-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-red-500 cursor-pointer">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="bg-[#12121a] border border-white/15 text-gray-200 px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 hover:border-red-600 transition-colors">
      {children}
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="bg-[#16213e] rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[2/3] bg-white/5" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 bg-white/5 rounded w-3/4" />
            <div className="h-2 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

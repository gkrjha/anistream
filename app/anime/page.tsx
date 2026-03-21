'use client';
import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '@/lib/types';
import MediaGrid from '@/components/MediaGrid';

const GENRES = [
  { value: '', label: 'All Genres' },
  { value: 'Action', label: 'Action' },
  { value: 'Adventure', label: 'Adventure' },
  { value: 'Comedy', label: 'Comedy' },
  { value: 'Drama', label: 'Drama' },
  { value: 'Fantasy', label: 'Fantasy' },
  { value: 'Horror', label: 'Horror' },
  { value: 'Romance', label: 'Romance' },
  { value: 'Sci-Fi', label: 'Sci-Fi' },
  { value: 'Slice of Life', label: 'Slice of Life' },
  { value: 'Supernatural', label: 'Supernatural' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Mystery', label: 'Mystery' },
  { value: 'Psychological', label: 'Psychological' },
  { value: 'Mecha', label: 'Mecha' },
];
const FORMATS = [
  { value: '', label: 'All Formats' },
  { value: 'TV', label: 'TV Series' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Special' },
];
const STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'RELEASING', label: 'Airing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
];

export default function AnimePage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [genre, setGenre] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (genre) params.set('genre', genre);
    if (format) params.set('format', format);
    if (status) params.set('status', status);
    const res = await fetch(`/api/anime?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setHasNext(data.hasNext ?? false);
    setLoading(false);
  }, [page, genre, format, status]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(setter: (v: string) => void, val: string) {
    setter(val);
    setPage(1);
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">🐉 Anime</h1>
        <div className="flex gap-3 flex-wrap">
          <FilterSelect options={GENRES} value={genre} onChange={(v) => applyFilter(setGenre, v)} />
          <FilterSelect options={FORMATS} value={format} onChange={(v) => applyFilter(setFormat, v)} />
          <FilterSelect options={STATUSES} value={status} onChange={(v) => applyFilter(setStatus, v)} />
        </div>
      </div>

      {loading ? <GridSkeleton /> : <MediaGrid items={items} />}

      <div className="flex items-center justify-center gap-4 py-8">
        <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</PageBtn>
        <span className="text-gray-400 font-semibold">Page {page}</span>
        <PageBtn disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next →</PageBtn>
      </div>
    </div>
  );
}

function FilterSelect({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#12121a] border border-white/15 text-gray-200 px-3 py-2
        rounded-lg text-sm outline-none focus:border-red-500 cursor-pointer"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function PageBtn({ children, disabled, onClick }: {
  children: React.ReactNode; disabled: boolean; onClick: () => void;
}) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="bg-[#12121a] border border-white/15 text-gray-200 px-5 py-2 rounded-lg
        text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed
        hover:bg-red-600 hover:border-red-600 transition-colors">
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

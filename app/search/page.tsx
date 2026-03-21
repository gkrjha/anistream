'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { MediaItem } from '@/lib/types';
import MediaGrid from '@/components/MediaGrid';

function SearchResults() {
  const params = useSearchParams();
  const query = params.get('q') || '';
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); });
  }, [query]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <h1 className="text-2xl font-black text-white mb-6">
        🔍 Results for &quot;{query}&quot;
      </h1>
      {loading ? (
        <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
          <div className="w-6 h-6 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
          Searching...
        </div>
      ) : (
        <MediaGrid items={items} emptyMsg={`No results found for "${query}"`} />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}

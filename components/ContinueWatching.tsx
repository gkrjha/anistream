'use client';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getHistory, removeEntry, WatchEntry } from '@/lib/history';

export default function ContinueWatching() {
  const [items, setItems] = useState<WatchEntry[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(getHistory());
    // Refresh when tab regains focus
    const onFocus = () => setItems(getHistory());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (items.length === 0) return null;

  function remove(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    removeEntry(id);
    setItems(getHistory());
  }

  function scroll(dir: 'left' | 'right') {
    rowRef.current?.scrollBy({ left: dir === 'right' ? 600 : -600, behavior: 'smooth' });
  }

  // Build resume URL
  function resumeUrl(item: WatchEntry): string {
    if (item.type === 'anime') {
      const base = item.watchUrl; // /watch/anime/{malId}
      const ep = item.episode ?? 1;
      const lang = item.lang ?? 'sub';
      return `${base}?ep=${ep}&lang=${lang}`;
    }
    if (item.type === 'series') {
      return `${item.watchUrl}?season=${item.season ?? 1}&ep=${item.episode ?? 1}`;
    }
    return item.watchUrl;
  }

  return (
    <section className="py-2 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="w-6 h-[3px] bg-red-500 rounded-full" />
            <div className="w-3 h-[3px] bg-red-500/40 rounded-full" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5">
            <span className="text-xl">🕐</span> Continue Watching
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll('left')}
            className="w-9 h-9 rounded-full bg-white/8 border border-white/12 text-white
              hover:bg-red-600 hover:border-red-500 flex items-center justify-center text-lg font-bold
              transition-all hover:shadow-[0_0_16px_rgba(229,9,20,0.3)]">‹</button>
          <button onClick={() => scroll('right')}
            className="w-9 h-9 rounded-full bg-white/8 border border-white/12 text-white
              hover:bg-red-600 hover:border-red-500 flex items-center justify-center text-lg font-bold
              transition-all hover:shadow-[0_0_16px_rgba(229,9,20,0.3)]">›</button>
        </div>
      </div>

      {/* Scroll row */}
      <div ref={rowRef} className="scroll-row px-6 sm:px-8 pb-4">
        {items.map((item) => (
          <div key={item.id} className="w-[160px] sm:w-[180px] shrink-0">
            <Link href={resumeUrl(item)} className="group block relative">
              {/* Card */}
              <div className="relative bg-[#0d0d1a] rounded-xl overflow-hidden border border-white/[0.06]
                hover:border-red-500/40 transition-all duration-300 hover:-translate-y-2
                hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(229,9,20,0.2)]">

                {/* Poster */}
                <div className="relative aspect-[2/3] bg-[#111120] overflow-hidden">
                  {item.image ? (
                    <Image src={item.image} alt={item.title} fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl text-gray-700">🎬</div>
                  )}

                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center
                      shadow-[0_0_30px_rgba(229,9,20,0.6)]">
                      <span className="text-white text-xl ml-1">▶</span>
                    </div>
                  </div>

                  {/* Episode badge */}
                  {item.type !== 'movie' && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1.5 text-center">
                        <p className="text-white text-[10px] font-black">
                          {item.type === 'series'
                            ? `S${item.season ?? 1} E${item.episode ?? 1}`
                            : `Ep ${item.episode ?? 1}${item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}`}
                        </p>
                        {item.lang && item.type === 'anime' && (
                          <p className="text-gray-400 text-[9px] uppercase font-bold mt-0.5">{item.lang}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  {item.type === 'anime' && item.totalEpisodes && item.episode && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.min((item.episode / item.totalEpisodes) * 100, 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => remove(item.id, e)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-red-600
                      text-white rounded-full flex items-center justify-center text-[10px]
                      opacity-0 group-hover:opacity-100 transition-all border border-white/10
                      hover:border-red-500 z-10">
                    ✕
                  </button>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-white text-[11px] font-bold truncate">{item.title}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 capitalize">{item.type}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

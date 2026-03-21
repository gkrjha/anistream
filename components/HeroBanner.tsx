'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MediaItem } from '@/lib/types';
import Modal from './Modal';

export default function HeroBanner({ items }: { items: MediaItem[] }) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const item = items[idx] ?? null;
  const prevItem = prev !== null ? items[prev] : null;

  const goTo = useCallback((i: number) => {
    if (i === idx || transitioning) return;
    setTransitioning(true);
    setPrev(idx);
    setTimeout(() => {
      setIdx(i);
      setTimeout(() => { setPrev(null); setTransitioning(false); }, 600);
    }, 50);
  }, [idx, transitioning]);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => goTo((idx + 1) % items.length), 8000);
    return () => clearInterval(t);
  }, [idx, items.length, goTo]);

  if (!item) return (
    <div className="relative h-[90vh] bg-[#06060f] overflow-hidden">
      <div className="absolute inset-0 skeleton" />
    </div>
  );

  return (
    <>
      <div className="relative h-[90vh] min-h-[600px] overflow-hidden bg-[#06060f]">

        {/* Previous slide (fading out) */}
        {prevItem?.image && (
          <div className="absolute inset-0 z-0 animate-hero-out">
            <Image src={prevItem.image} alt="" fill priority className="object-cover object-top" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06060f] via-[#06060f]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06060f] via-transparent to-[#06060f]/20" />
          </div>
        )}

        {/* Current slide */}
        <div className={`absolute inset-0 z-[1] ${transitioning ? 'animate-hero-in' : ''}`}>
          {item.image && (
            <Image src={item.image} alt={item.title} fill priority
              className="object-cover object-top" unoptimized />
          )}
          {/* Cinematic gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#06060f] via-[#06060f]/75 to-[#06060f]/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06060f] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06060f]/50 via-transparent to-transparent" />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,transparent_40%,rgba(6,6,15,0.6)_100%)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 pb-24">
            <div className={`max-w-2xl transition-all duration-700 ${transitioning ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'}`}>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-black
                  px-3 py-1.5 rounded-full tracking-wide uppercase
                  shadow-[0_0_20px_rgba(229,9,20,0.6),0_0_40px_rgba(229,9,20,0.2)]">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Trending
                </span>
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-wide
                  ${item.type === 'Anime' ? 'border-violet-500/60 text-violet-300 bg-violet-500/15'
                    : item.type === 'Movie' ? 'border-sky-500/60 text-sky-300 bg-sky-500/15'
                    : 'border-emerald-500/60 text-emerald-300 bg-emerald-500/15'}`}>
                  {item.type}
                </span>
                {item.year && (
                  <span className="text-[11px] text-gray-400 font-semibold bg-white/8 px-3 py-1.5 rounded-full border border-white/10">
                    {item.year}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.0]
                mb-5 tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
                {item.title}
              </h1>

              {/* Meta row */}
              <div className="flex items-center gap-4 mb-5 text-sm">
                <div className="flex items-center gap-1.5 text-yellow-400 font-black text-base">
                  <span>★</span>
                  <span>{item.rating}</span>
                </div>
                {item.episodes && (
                  <span className="text-gray-400 font-medium">{item.episodes} Episodes</span>
                )}
                <div className="flex items-center gap-2">
                  {item.genres.slice(0, 3).map((g, i) => (
                    <span key={g} className="text-gray-400 text-sm">
                      {i > 0 && <span className="mr-2 text-gray-700">·</span>}{g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Synopsis */}
              <p className="text-gray-300/90 text-base leading-relaxed mb-8 line-clamp-3 max-w-xl
                drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {item.synopsis}
              </p>

              {/* CTA */}
              <div className="flex gap-3 flex-wrap">
                <Link href={item.watchUrl}
                  className="group flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white
                    font-black px-8 py-4 rounded-2xl transition-all duration-200 text-sm
                    shadow-[0_0_30px_rgba(229,9,20,0.4)] hover:shadow-[0_0_50px_rgba(229,9,20,0.6)]
                    hover:-translate-y-0.5 active:translate-y-0">
                  <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center
                    group-hover:bg-white/30 transition-colors">
                    <span className="text-sm ml-0.5">▶</span>
                  </span>
                  Watch Now
                </Link>
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 text-white
                    font-bold px-8 py-4 rounded-2xl border border-white/20 hover:border-white/35
                    transition-all duration-200 hover:-translate-y-0.5 text-sm backdrop-blur-sm">
                  <span className="text-base">⊕</span> More Info
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Slide indicators — right side vertical */}
        {items.length > 1 && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
            {items.slice(0, 6).map((it, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`transition-all duration-400 rounded-full overflow-hidden
                  ${i === idx
                    ? 'w-1.5 h-10 bg-red-500 shadow-[0_0_12px_rgba(229,9,20,0.6)]'
                    : 'w-1.5 h-4 bg-white/25 hover:bg-white/50'}`} />
            ))}
          </div>
        )}

        {/* Thumbnail strip — bottom right */}
        {items.length > 1 && (
          <div className="absolute bottom-8 right-16 z-20 hidden lg:flex items-center gap-2">
            {items.slice(0, 5).map((it, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`relative w-16 h-10 rounded-lg overflow-hidden transition-all duration-300
                  ${i === idx
                    ? 'ring-2 ring-red-500 scale-110 shadow-[0_0_16px_rgba(229,9,20,0.5)]'
                    : 'opacity-50 hover:opacity-80 hover:scale-105'}`}>
                {it.image && (
                  <Image src={it.image} alt={it.title} fill className="object-cover" unoptimized />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40
          bg-gradient-to-t from-[#06060f] to-transparent pointer-events-none z-[2]" />
      </div>

      <Modal item={showModal ? item : null} onClose={() => setShowModal(false)} />
    </>
  );
}

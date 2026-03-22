'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MediaItem } from '@/lib/types';

interface Props {
  item: MediaItem | null;
  onClose: () => void;
}

const TYPE_COLOR: Record<string, string> = {
  Anime: 'bg-violet-600',
  Movie: 'bg-sky-600',
  Series: 'bg-emerald-600',
};

const TYPE_GLOW: Record<string, string> = {
  Anime: 'shadow-[0_0_40px_rgba(124,58,237,0.3)]',
  Movie: 'shadow-[0_0_40px_rgba(14,165,233,0.3)]',
  Series: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
};

export default function Modal({ item, onClose }: Props) {
  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} />

      {/* Modal */}
      <div className={`relative bg-[#0d0d1a] border border-white/[0.08] rounded-3xl w-full max-w-md
        max-h-[92vh] overflow-hidden fade-up
        shadow-[0_60px_120px_rgba(0,0,0,0.9)] ${TYPE_GLOW[item.type] ?? ''}`}>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 bg-black/70 hover:bg-red-600
            text-white rounded-full flex items-center justify-center transition-all duration-200
            border border-white/10 hover:border-red-500 backdrop-blur-sm text-sm
            hover:shadow-[0_0_16px_rgba(229,9,20,0.4)]">
          ✕
        </button>

        {/* Hero image */}
        <div className="relative w-full h-56 overflow-hidden">
          {item.image ? (
            <Image src={item.image} alt={item.title} fill
              className="object-cover object-top scale-105" unoptimized />
          ) : (
            <div className="w-full h-full bg-[#111120] flex items-center justify-center text-6xl">🎬</div>
          )}
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d1a]/30 to-transparent" />

          {/* Type badge */}
          <div className="absolute bottom-4 left-5 flex items-center gap-2">
            <span className={`text-[11px] font-black px-3 py-1.5 rounded-full text-white uppercase tracking-wide
              ${TYPE_COLOR[item.type] ?? 'bg-gray-600'}`}>
              {item.type}
            </span>
            {item.status === 'RELEASING' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400
                bg-emerald-400/15 border border-emerald-400/30 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Airing
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(92vh-224px)]">
          <h2 className="text-xl font-black text-white mb-3 leading-tight">{item.title}</h2>

          {/* Stats */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/25
              text-yellow-400 text-xs font-black px-3 py-1.5 rounded-xl">
              ★ {item.rating}
            </div>
            {item.year && (
              <div className="text-xs text-gray-400 bg-white/[0.06] border border-white/10
                px-3 py-1.5 rounded-xl font-medium">{item.year}</div>
            )}
            {item.episodes && (
              <div className="text-xs text-gray-400 bg-white/[0.06] border border-white/10
                px-3 py-1.5 rounded-xl font-medium">{item.episodes} eps</div>
            )}
            {item.status && item.status !== 'RELEASING' && (
              <div className="text-xs text-gray-500 bg-white/[0.04] border border-white/8
                px-3 py-1.5 rounded-xl">
                {item.status === 'FINISHED' ? 'Completed' : item.status}
              </div>
            )}
          </div>

          {/* Genres */}
          {item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.genres.map((g) => (
                <span key={g} className="text-[11px] text-red-300/90 bg-red-500/10 border border-red-500/20
                  px-2.5 py-1 rounded-lg font-medium">{g}</span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <p className="text-gray-400 text-sm leading-relaxed mb-5 line-clamp-4">{item.synopsis}</p>

          {/* CTA */}
          <Link href={item.watchUrl} onClick={onClose}
            className="group relative flex items-center justify-center gap-3 w-full
              bg-gradient-to-r from-red-600 to-red-500
              text-white font-black py-3.5 rounded-2xl transition-all duration-300 text-sm
              hover:from-red-500 hover:to-red-400
              hover:shadow-[0_8px_32px_rgba(229,9,20,0.5)] hover:-translate-y-0.5 active:translate-y-0
              overflow-hidden">
            {/* shimmer */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full
              bg-gradient-to-r from-transparent via-white/10 to-transparent
              transition-transform duration-700 ease-in-out" />
            <span className="relative flex items-center gap-2.5">
              <span className="w-6 h-6 bg-white/25 rounded-full flex items-center justify-center shrink-0">
                <svg width="10" height="11" viewBox="0 0 10 11" fill="white">
                  <path d="M1 1.5L9 5.5L1 9.5V1.5Z"/>
                </svg>
              </span>
              Watch Now
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

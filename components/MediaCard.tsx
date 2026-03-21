'use client';
import Image from 'next/image';
import { MediaItem } from '@/lib/types';
import { Play, Star } from 'lucide-react';

interface Props {
  item: MediaItem;
  onClick?: (item: MediaItem) => void;
}

const TYPE_STYLE: Record<string, string> = {
  Anime: 'bg-violet-600',
  Movie: 'bg-sky-600',
  Series: 'bg-emerald-600',
};

export default function MediaCard({ item, onClick }: Props) {
  return (
    <div
      onClick={() => onClick?.(item)}
      className="group relative bg-[#0d0d1a] rounded-xl overflow-hidden cursor-pointer
        transition-all duration-300 hover:-translate-y-2.5
        border border-white/[0.06] hover:border-red-500/40
        hover:shadow-[0_24px_64px_rgba(0,0,0,0.7),0_0_0_1px_rgba(229,9,20,0.25),0_0_30px_rgba(229,9,20,0.1)]"
    >
      <div className="relative aspect-[2/3] w-full bg-[#111120] overflow-hidden">
        {item.image ? (
          <Image src={item.image} alt={item.title} fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            unoptimized />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-700 bg-[#111120]">
            <Play size={32} className="text-gray-700" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center
            shadow-[0_0_40px_rgba(229,9,20,0.7)] scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={22} className="text-white fill-white ml-0.5" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-2.5
          opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
          <div className="flex flex-wrap gap-1">
            {item.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-[9px] text-white/80 bg-black/60 backdrop-blur-sm
                px-1.5 py-0.5 rounded-full border border-white/10">{g}</span>
            ))}
          </div>
        </div>

        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/75 backdrop-blur-md
          text-yellow-400 text-[10px] font-black px-2 py-1 rounded-lg border border-yellow-400/15">
          <Star size={9} className="fill-yellow-400" /> {item.rating}
        </div>

        <span className={`absolute top-2 right-2 text-[9px] font-black px-2 py-1 rounded-lg
          text-white uppercase tracking-wide ${TYPE_STYLE[item.type] ?? 'bg-gray-600'}`}>
          {item.type}
        </span>

        {item.episodes && item.type === 'Anime' && (
          <span className="absolute bottom-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-lg
            bg-black/70 text-gray-300 border border-white/10 backdrop-blur-sm
            opacity-100 group-hover:opacity-0 transition-opacity">
            {item.episodes} eps
          </span>
        )}
      </div>

      <div className="p-3 pb-3.5">
        <p className="text-white text-[11px] font-bold truncate leading-snug mb-1">{item.title}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
          {item.year && <span>{item.year}</span>}
          {item.year && item.status && <span className="w-0.5 h-0.5 bg-gray-700 rounded-full" />}
          {item.status === 'RELEASING' && (
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              Airing
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}



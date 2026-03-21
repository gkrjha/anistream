'use client';
import { useState, useRef } from 'react';
import { MediaItem } from '@/lib/types';
import MediaCard from './MediaCard';
import Modal from './Modal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  icon: React.ReactNode;
  items: MediaItem[];
  viewAllHref?: string;
}

export default function SectionRow({ title, icon, items, viewAllHref }: Props) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  function scroll(dir: 'left' | 'right') {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === 'right' ? 700 : -700, behavior: 'smooth' });
  }

  function onScroll() {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanLeft(scrollLeft > 10);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 10);
  }

  return (
    <section className="py-2 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-5 px-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="w-6 h-[3px] bg-red-500 rounded-full" />
            <div className="w-3 h-[3px] bg-red-500/40 rounded-full" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5">
            {icon}
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <a href={viewAllHref}
              className="text-xs text-gray-500 hover:text-red-400 font-bold transition-colors
                mr-1 flex items-center gap-1 group">
              View All
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}
          <button onClick={() => scroll('left')} disabled={!canLeft}
            className={`w-9 h-9 rounded-full border flex items-center justify-center
              transition-all duration-200
              ${canLeft
                ? 'bg-white/8 border-white/12 text-white hover:bg-red-600 hover:border-red-500 hover:shadow-[0_0_16px_rgba(229,9,20,0.3)]'
                : 'bg-white/3 border-white/5 text-gray-700 cursor-not-allowed'}`}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll('right')} disabled={!canRight}
            className={`w-9 h-9 rounded-full border flex items-center justify-center
              transition-all duration-200
              ${canRight
                ? 'bg-white/8 border-white/12 text-white hover:bg-red-600 hover:border-red-500 hover:shadow-[0_0_16px_rgba(229,9,20,0.3)]'
                : 'bg-white/3 border-white/5 text-gray-700 cursor-not-allowed'}`}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={rowRef} onScroll={onScroll} className="scroll-row px-6 sm:px-8 pb-4">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="w-[150px] sm:w-[170px] md:w-[185px] shrink-0">
            <MediaCard item={item} onClick={setSelected} />
          </div>
        ))}
      </div>

      <Modal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

'use client';
import { useState } from 'react';
import { MediaItem } from '@/lib/types';
import MediaCard from './MediaCard';
import Modal from './Modal';

interface Props {
  items: MediaItem[];
  emptyMsg?: string;
}

export default function MediaGrid({ items, emptyMsg = 'No results found.' }: Props) {
  const [selected, setSelected] = useState<MediaItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-700">
        <span className="text-6xl opacity-40">🔍</span>
        <p className="text-base font-medium">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
        {items.map((item) => (
          <MediaCard key={`${item.type}-${item.id}`} item={item} onClick={setSelected} />
        ))}
      </div>
      <Modal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}

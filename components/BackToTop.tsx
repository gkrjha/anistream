'use client';
import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full
        bg-red-600 hover:bg-red-500 text-white
        flex items-center justify-center
        shadow-[0_4px_24px_rgba(229,9,20,0.5)]
        hover:shadow-[0_4px_32px_rgba(229,9,20,0.7)]
        hover:-translate-y-1 transition-all duration-200
        border border-red-500/50">
      <ChevronUp size={18} />
    </button>
  );
}

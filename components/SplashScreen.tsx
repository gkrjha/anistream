'use client';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [started, setStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Show only once per browser session
    if (sessionStorage.getItem('splashShown')) return;
    sessionStorage.setItem('splashShown', '1');
    setVisible(true);

    const audio = new Audio('/wake_up_to_reality.mp3');
    audio.volume = 0.8;
    audioRef.current = audio;

    audio.play().then(() => setStarted(true)).catch(() => {
      // autoplay blocked — user must tap
    });

    const t1 = setTimeout(() => setFading(true), 4500);
    const t2 = setTimeout(() => {
      setVisible(false);
      audio.pause();
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      audio.pause();
    };
  }, []);

  function handleClick() {
    if (started) return;
    setStarted(true);
    audioRef.current?.play().catch(() => {});
  }

  if (!visible) return null;

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center
        cursor-pointer select-none transition-opacity duration-500
        ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <Image
        src="/saringan.gif"
        alt="AniStream"
        width={360}
        height={360}
        className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] object-contain
          drop-shadow-[0_0_60px_rgba(229,9,20,0.8)]"
        unoptimized
        priority
      />
      {!started && (
        <p className="mt-8 text-gray-500 text-sm animate-pulse tracking-widest uppercase">
          Tap to enter
        </p>
      )}
    </div>
  );
}

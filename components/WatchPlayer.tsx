'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { saveProgress } from '@/lib/history';

interface Props {
  title: string;
  image: string | null;
  embedUrl: string;
  type: 'movie' | 'series';
  tmdbId: number;
  synopsis: string;
  rating: string;
  year: string;
  genres: string[];
  totalSeasons?: number;
}

type ServerKey = 'vidnest' | 'vidsrc_en' | 'vidsrc_hi' | 'multiembed' | 'vidlink';

interface ServerOption {
  key: ServerKey;
  label: string;
  flag: string;
  lang: string;
  movieUrl: (id: number) => string;
  tvUrl: (id: number, s: number, e: number) => string;
}

const SERVERS: ServerOption[] = [
  {
    key: 'vidnest',
    label: 'Auto',
    flag: '🌐',
    lang: 'Original',
    movieUrl: (id) => `https://vidnest.fun/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidnest.fun/tv/${id}/${s}/${e}`,
  },
  {
    key: 'vidsrc_en',
    label: 'English',
    flag: '🇺🇸',
    lang: 'English',
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    key: 'vidsrc_hi',
    label: 'Hindi',
    flag: '🇮🇳',
    lang: 'Hindi',
    movieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}?lang=hi`,
    tvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?lang=hi`,
  },
  {
    key: 'multiembed',
    label: 'Multi',
    flag: '🎵',
    lang: 'Multi-audio',
    movieUrl: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    tvUrl: (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    key: 'vidlink',
    label: 'VidLink',
    flag: '🔊',
    lang: 'Alt audio',
    movieUrl: (id) => `https://vidlink.pro/movie/${id}?multiLang=true`,
    tvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?multiLang=true`,
  },
];

const SERIES_EP_DURATION = 2700;
const NEXT_TRIGGER_AT = SERIES_EP_DURATION - 90;
const NEXT_COUNTDOWN = 10;

export default function WatchPlayer({
  title, image, embedUrl: _embedUrl, type, tmdbId, synopsis, rating, year, genres, totalSeasons = 1,
}: Props) {
  const searchParams = useSearchParams();
  const resumeSeason = Number(searchParams.get('season') ?? 1) || 1;
  const resumeEp = Number(searchParams.get('ep') ?? 1) || 1;

  const [season, setSeason] = useState(resumeSeason);
  const [episode, setEpisode] = useState(resumeEp);
  const [server, setServer] = useState<ServerKey>('vidnest');
  const [autoNext, setAutoNext] = useState(true);
  const [showNextCard, setShowNextCard] = useState(false);
  const [countdown, setCountdown] = useState(NEXT_COUNTDOWN);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wallRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wallTime = useRef(0);

  const activeServer = SERVERS.find((s) => s.key === server) ?? SERVERS[0];
  const currentEmbed = type === 'series'
    ? activeServer.tvUrl(tmdbId, season, episode)
    : activeServer.movieUrl(tmdbId);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const stopWall = useCallback(() => {
    if (wallRef.current) { clearInterval(wallRef.current); wallRef.current = null; }
    wallTime.current = 0;
  }, []);

  const triggerNextCard = useCallback(() => {
    if (!autoNext || type !== 'series') return;
    stopWall();
    setShowNextCard(true);
    setCountdown(NEXT_COUNTDOWN);
  }, [autoNext, type, stopWall]);

  function goToEpisode(s: number, e: number) {
    setSeason(s); setEpisode(e);
    setShowNextCard(false); setCountdown(NEXT_COUNTDOWN);
    stopCountdown(); stopWall();
  }

  function onIframeLoad() {
    stopWall();
    wallTime.current = 0;
    if (type === 'series' && autoNext) {
      wallRef.current = setInterval(() => {
        wallTime.current += 1;
        if (wallTime.current >= NEXT_TRIGGER_AT) triggerNextCard();
      }, 1000);
    }
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d?.event === 'ended' || d?.type === 'ended' || d?.action === 'ended') triggerNextCard();
        if (d?.currentTime && d?.duration && d.duration > 0 && (d.duration - d.currentTime) <= 90) triggerNextCard();
      } catch { /* ignore */ }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [triggerNextCard]);

  useEffect(() => {
    if (!showNextCard) { stopCountdown(); return; }
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { stopCountdown(); goToEpisode(season, episode + 1); return 0; }
        return c - 1;
      });
    }, 1000);
    return stopCountdown;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNextCard]);

  useEffect(() => { if (!autoNext) { stopWall(); setShowNextCard(false); stopCountdown(); } }, [autoNext, stopWall, stopCountdown]);
  useEffect(() => () => { stopCountdown(); stopWall(); }, [stopCountdown, stopWall]);

  useEffect(() => {
    saveProgress({
      id: `${type}-${tmdbId}`,
      type: type === 'movie' ? 'movie' : 'series',
      title,
      image,
      watchUrl: type === 'movie' ? `/watch/movie/${tmdbId}` : `/watch/series/${tmdbId}`,
      season,
      episode,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, episode]);

  return (
    <div className="min-h-screen bg-[#070710] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3
        border-b border-white/5 bg-[#0e0e1a]/80 backdrop-blur-sm flex-wrap gap-2">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors group">
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-bold truncate max-w-[180px] sm:max-w-xs">{title}</span>
          {type === 'series' && <span className="text-gray-600 text-xs">· S{season} E{episode}</span>}
        </div>
        {type === 'series' && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => setAutoNext((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-all duration-300
                ${autoNext ? 'bg-red-600 shadow-[0_0_10px_rgba(229,9,20,0.4)]' : 'bg-white/15'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300
                ${autoNext ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-gray-400 text-xs font-medium">Auto Next</span>
          </label>
        )}
      </div>

      {/* Audio / Language selector */}
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-1 flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 text-xs font-medium flex items-center gap-1">🔊 Audio:</span>
        {SERVERS.map((s) => (
          <button key={s.key} onClick={() => setServer(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
              ${server === s.key
                ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(229,9,20,0.3)]'
                : 'bg-white/5 border-white/8 text-gray-400 hover:text-white hover:bg-white/10'}`}>
            <span>{s.flag}</span>
            <span>{s.label}</span>
            <span className={`text-[10px] font-normal ${server === s.key ? 'text-red-200' : 'text-gray-600'}`}>
              {s.lang}
            </span>
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="w-full bg-black mt-2">
        <div className="relative w-full max-w-6xl mx-auto" style={{ aspectRatio: '16/9' }}>
          <iframe key={currentEmbed} src={currentEmbed}
            className="absolute inset-0 w-full h-full"
            allowFullScreen allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="origin" onLoad={onIframeLoad} />

          {/* Auto Next card */}
          {showNextCard && type === 'series' && (
            <div className="absolute bottom-20 right-4 z-30 fade-up">
              <div className="bg-[#0e0e1a]/98 border border-white/12 rounded-2xl p-4 w-56
                shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Up Next</p>
                <p className="text-white font-bold text-sm mb-3">S{season} Episode {episode + 1}</p>
                <button onClick={() => goToEpisode(season, episode + 1)}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl
                    text-sm transition-all hover:shadow-[0_0_16px_rgba(229,9,20,0.4)]
                    flex items-center justify-center gap-2">
                  ▶ Play Now
                </button>
                <div className="mt-3 h-0.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((NEXT_COUNTDOWN - countdown) / NEXT_COUNTDOWN) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-gray-600">Auto in {countdown}s</span>
                  <button onClick={() => { setShowNextCard(false); stopCountdown(); }}
                    className="text-[11px] text-gray-600 hover:text-white transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Series controls */}
      {type === 'series' && (
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3
          border-b border-white/5 bg-[#0a0a14]">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => goToEpisode(season, episode - 1)} disabled={episode <= 1}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/6 hover:bg-white/12
                border border-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              ← Prev
            </button>
            <span className="text-gray-600 text-xs px-1">S{season} · Ep {episode}</span>
            <button onClick={() => goToEpisode(season, episode + 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/6 hover:bg-white/12
                border border-white/8 transition-all">
              Next →
            </button>
            {autoNext && !showNextCard && (
              <button onClick={triggerNextCard}
                className="px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-white
                  bg-white/4 hover:bg-white/8 border border-white/6 transition-all">
                Episode ended?
              </button>
            )}
          </div>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/6 flex-wrap">
            {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
              <button key={s} onClick={() => goToEpisode(s, 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${season === s ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'text-gray-500 hover:text-white'}`}>
                S{s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">{title}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/20
              text-yellow-400 font-bold px-3 py-1 rounded-full text-xs">★ {rating}</span>
            {year && <span className="text-gray-500 text-xs bg-white/5 border border-white/8 px-3 py-1 rounded-full">{year}</span>}
            <span className={`px-3 py-1 rounded-full text-xs font-bold border
              ${type === 'movie' ? 'bg-blue-600/20 border-blue-500/30 text-blue-300' : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300'}`}>
              {type === 'movie' ? 'Movie' : 'Series'}
            </span>
            {genres.map((g) => (
              <span key={g} className="bg-white/5 border border-white/8 text-gray-400 px-2.5 py-1 rounded-full text-xs">{g}</span>
            ))}
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{synopsis}</p>
        </div>

        {type === 'series' && (
          <div className="bg-[#0e0e1a] border border-white/6 rounded-2xl p-4">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-red-500">▶</span> Episodes
            </h3>
            <div className="grid grid-cols-5 gap-1.5 max-h-60 overflow-y-auto pr-1">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((e) => (
                <button key={e} onClick={() => goToEpisode(season, e)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all duration-200
                    ${episode === e
                      ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(229,9,20,0.4)] scale-105'
                      : 'bg-white/5 text-gray-500 hover:bg-white/12 hover:text-white border border-white/5'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { saveProgress } from '@/lib/history';

// Fetch episode titles from Jikan (MAL) — free, no key needed
async function fetchEpisodeTitles(malId: number): Promise<Record<number, string>> {
  const map: Record<number, string> = {};
  try {
    // Jikan paginates at 100 per page
    let page = 1;
    while (true) {
      const res = await fetch(
        `https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) break;
      const json = await res.json();
      const eps: { mal_id: number; title: string | null }[] = json?.data ?? [];
      if (!eps.length) break;
      for (const ep of eps) {
        if (ep.mal_id && ep.title) map[ep.mal_id] = ep.title;
      }
      if (!json?.pagination?.has_next_page) break;
      page++;
      if (page > 12) break; // max 1200 eps safety
    }
  } catch { /* ignore */ }
  return map;
}

interface Props {
  title: string;
  image: string | null;
  anilistId: number | null;
  malId: number;
  totalEpisodes: number;
  synopsis: string;
  rating: string;
  year: string;
  genres: string[];
  aniflixId?: number | null;
}

// Anime episode avg = 24 min. Trigger next card 90s before expected end.
const EP_DURATION_S = 1440; // 24 min
const NEXT_TRIGGER_AT = EP_DURATION_S - 90; // 22:30 mark
const NEXT_COUNTDOWN = 10;

type Server = 'vidnest' | 'aniflix';

export default function AnimeWatchPlayer({
  title, image, anilistId, malId, totalEpisodes, synopsis, rating, year, genres, aniflixId,
}: Props) {
  const epCount = Math.max(totalEpisodes || 1, 1);
  const searchParams = useSearchParams();

  // Resume from URL params (?ep=5&lang=dub)
  const resumeEp = Number(searchParams.get('ep') ?? 1) || 1;
  const resumeLang = (searchParams.get('lang') === 'dub' ? 'dub' : 'sub') as 'sub' | 'dub';

  const [visibleEps, setVisibleEps] = useState(Math.min(Math.max(resumeEp + 20, 100), epCount));
  const [episode, setEpisode] = useState(Math.min(resumeEp, epCount));
  const [lang, setLang] = useState<'sub' | 'dub'>(resumeLang);
  const [autoNext, setAutoNext] = useState(true);
  const [server, setServer] = useState<Server>('vidnest');
  const [showNextCard, setShowNextCard] = useState(false);
  const [countdown, setCountdown] = useState(NEXT_COUNTDOWN);
  const [epTitles, setEpTitles] = useState<Record<number, string>>({});
  const [titlesLoading, setTitlesLoading] = useState(false);

  // Fetch episode titles from Jikan using MAL ID
  useEffect(() => {
    if (!malId) return;
    setTitlesLoading(true);
    fetchEpisodeTitles(malId).then((map) => {
      setEpTitles(map);
      setTitlesLoading(false);
    });
  }, [malId]);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wallRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wallTime = useRef(0);

  const embedUrl = (() => {
    if (server === 'aniflix' && aniflixId) return `https://aniflix.uno/player/${aniflixId}/?ep=${episode}`;
    if (anilistId) return `https://vidnest.fun/anime/${anilistId}/${episode}/${lang}`;
    return null;
  })();

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const stopWall = useCallback(() => {
    if (wallRef.current) { clearInterval(wallRef.current); wallRef.current = null; }
    wallTime.current = 0;
  }, []);

  const triggerNextCard = useCallback(() => {
    if (!autoNext || episode >= epCount) return;
    stopWall();
    setShowNextCard(true);
    setCountdown(NEXT_COUNTDOWN);
  }, [autoNext, episode, epCount, stopWall]);

  function goToEpisode(ep: number) {
    if (ep < 1 || ep > epCount) return;
    setEpisode(ep);
    setShowNextCard(false);
    setCountdown(NEXT_COUNTDOWN);
    stopCountdown();
    stopWall();
    if (ep > visibleEps) setVisibleEps(Math.min(ep + 50, epCount));
  }

  // Called when iframe finishes loading
  function onIframeLoad() {
    stopWall();
    wallTime.current = 0;
    if (!autoNext || episode >= epCount) return;
    wallRef.current = setInterval(() => {
      wallTime.current += 1;
      if (wallTime.current >= NEXT_TRIGGER_AT) triggerNextCard();
    }, 1000);
  }

  // postMessage listener — catches real ended/timeupdate events if VidNest emits them
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // Ended event
        if (d?.event === 'ended' || d?.type === 'ended' || d?.action === 'ended') {
          triggerNextCard();
        }
        // Near-end via currentTime/duration
        if (d?.currentTime && d?.duration && d.duration > 0) {
          const remaining = d.duration - d.currentTime;
          if (remaining <= 90 && remaining > 0) triggerNextCard();
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [triggerNextCard]);

  // Countdown tick when next card shown
  useEffect(() => {
    if (!showNextCard) { stopCountdown(); return; }
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { stopCountdown(); goToEpisode(episode + 1); return 0; }
        return c - 1;
      });
    }, 1000);
    return stopCountdown;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNextCard]);

  useEffect(() => {
    if (!autoNext) { stopWall(); setShowNextCard(false); stopCountdown(); }
  }, [autoNext, stopWall, stopCountdown]);

  // Save watch progress to localStorage whenever episode/lang changes
  useEffect(() => {
    if (!malId) return;
    saveProgress({
      id: `anime-${malId}`,
      type: 'anime',
      title,
      image,
      watchUrl: `/watch/anime/${malId}`,
      anilistId,
      malId,
      episode,
      totalEpisodes: epCount,
      lang,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, lang]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopCountdown(); stopWall();
  }, [stopCountdown, stopWall]);

  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3
        border-b border-white/5 bg-[#0e0e1a]/80 backdrop-blur-sm flex-wrap gap-2">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors group">
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-bold truncate max-w-[180px] sm:max-w-xs">{title}</span>
          <span className="text-gray-600 text-xs">· Ep {episode}/{epCount}</span>
          {epTitles[episode] && (
            <span className="text-gray-400 text-xs truncate max-w-[160px] hidden sm:block">
              — {epTitles[episode]}
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div onClick={() => setAutoNext((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-all duration-300
              ${autoNext ? 'bg-red-600 shadow-[0_0_10px_rgba(229,9,20,0.4)]' : 'bg-white/15'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300
              ${autoNext ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-gray-400 text-xs font-medium">Auto Next</span>
        </label>
      </div>

      {/* ── Main layout: Player + Episodes side by side ── */}
      <div className="flex flex-col xl:flex-row xl:items-start gap-0 xl:gap-3 xl:p-4 xl:max-w-[1600px] xl:mx-auto">

        {/* Left — Player + controls + title */}
        <div className="flex-1 min-w-0">

          {/* Player */}
          <div className="w-full bg-black xl:rounded-xl overflow-hidden">
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              {embedUrl ? (
                <iframe
                  key={`${server}-${anilistId}-${episode}-${lang}`}
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                  referrerPolicy="origin"
                  onLoad={onIframeLoad}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0e1a] gap-4">
                  <span className="text-5xl">😔</span>
                  <p className="text-gray-500">Player unavailable for this anime</p>
                </div>
              )}

              {/* Auto Next card */}
              {showNextCard && episode < epCount && (
                <div className="absolute bottom-16 right-4 z-30 fade-up">
                  <div className="bg-[#0e0e1a]/98 border border-white/12 rounded-2xl p-4 w-52
                    shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Up Next</p>
                    <p className="text-white font-bold text-sm mb-3">Episode {episode + 1}</p>
                    <button onClick={() => goToEpisode(episode + 1)}
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
                      <button onClick={() => { setShowNextCard(false); stopCountdown(); stopWall(); }}
                        className="text-[11px] text-gray-600 hover:text-white transition-colors">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3
            bg-[#0a0a14] border-b border-white/5
            xl:border xl:border-t-0 xl:border-white/[0.06] xl:rounded-b-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => goToEpisode(episode - 1)} disabled={episode <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                  bg-white/6 hover:bg-white/12 border border-white/8
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                ← Prev
              </button>
              <span className="text-gray-600 text-xs px-1">Ep {episode} / {epCount}</span>
              <button onClick={() => goToEpisode(episode + 1)} disabled={episode >= epCount}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                  bg-white/6 hover:bg-white/12 border border-white/8
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                Next →
              </button>
              {autoNext && episode < epCount && !showNextCard && (
                <button onClick={() => triggerNextCard()}
                  className="px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-white
                    bg-white/4 hover:bg-white/8 border border-white/6 transition-all">
                  Episode ended?
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {server === 'vidnest' && (
                <div className="flex items-center gap-0.5 bg-white/5 rounded-xl p-1 border border-white/6">
                  {(['sub', 'dub'] as const).map((l) => (
                    <button key={l} onClick={() => setLang(l)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all
                        ${lang === l ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'text-gray-500 hover:text-white'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-0.5 bg-white/5 rounded-xl p-1 border border-white/6">
                <button onClick={() => setServer('vidnest')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${server === 'vidnest' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                  VidNest
                </button>
                {aniflixId && (
                  <button onClick={() => setServer('aniflix')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                      ${server === 'aniflix' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                    Aniflix
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Title + badges — no synopsis */}
          <div className="px-4 sm:px-5 py-5 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">{title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 bg-yellow-400/12 border border-yellow-400/25
                text-yellow-400 font-black px-3 py-1.5 rounded-xl text-xs">★ {rating}</span>
              {year && <span className="text-xs text-gray-400 bg-white/[0.06] border border-white/10 px-3 py-1.5 rounded-xl">{year}</span>}
              <span className="text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wide
                bg-violet-600/20 border border-violet-500/30 text-violet-300">Anime</span>
              {genres.slice(0, 5).map((g) => (
                <span key={g} className="text-xs text-gray-400 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-xl">{g}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Episodes Panel (sticky on xl) */}
        <div className="xl:w-[340px] xl:shrink-0 xl:sticky xl:top-[72px]
          bg-[#0d0d1a] border-t border-white/[0.06] xl:border xl:rounded-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-[#111120]">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 bg-red-500 rounded-full" />
              <h3 className="text-white font-black text-sm">Episodes</h3>
            </div>
            <div className="flex items-center gap-2">
              {titlesLoading && <div className="w-3 h-3 border border-white/20 border-t-red-500 rounded-full animate-spin" />}
              <span className="text-[11px] text-gray-600 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                {epCount} total
              </span>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px] xl:max-h-[calc(100vh-200px)]
            [scrollbar-width:thin] [scrollbar-color:rgba(229,9,20,0.4)_transparent]">
            {Array.from({ length: visibleEps }, (_, i) => i + 1).map((e) => {
              const epTitle = epTitles[e];
              const isActive = episode === e;
              return (
                <button key={e} onClick={() => goToEpisode(e)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left
                    transition-all duration-150 border-b border-white/[0.03] last:border-0
                    border-l-2 ${isActive ? 'bg-red-600/15 border-l-red-500' : 'hover:bg-white/[0.04] border-l-transparent'}`}>
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black
                    ${isActive ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(229,9,20,0.5)]' : 'bg-white/[0.07] text-gray-500'}`}>
                    {e}
                  </span>
                  <div className="min-w-0 flex-1">
                    {epTitle ? (
                      <>
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>{epTitle}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">Episode {e}</p>
                      </>
                    ) : (
                      <p className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-500'}`}>Episode {e}</p>
                    )}
                  </div>
                  {isActive && (
                    <div className="shrink-0 flex items-center gap-0.5">
                      {[1,2,3].map((b) => (
                        <div key={b} className="w-0.5 bg-red-400 rounded-full animate-pulse"
                          style={{ height: `${8 + b * 3}px`, animationDelay: `${b * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {visibleEps < epCount && (
            <div className="px-3 py-3 border-t border-white/[0.05]">
              <button onClick={() => setVisibleEps((v) => Math.min(v + 100, epCount))}
                className="w-full text-xs text-gray-500 hover:text-white py-2.5
                  bg-white/[0.03] hover:bg-white/[0.07] rounded-xl transition-all
                  border border-white/[0.06] hover:border-white/[0.12] font-medium">
                Show more ({epCount - visibleEps} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

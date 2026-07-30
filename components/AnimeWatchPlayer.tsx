'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter as useNextRouter, usePathname } from 'next/navigation';
import { saveProgress, getEntry } from '@/lib/history';
import HLSPlayer from '@/components/HLSPlayer';
import { Play, ChevronLeft, ChevronRight, Star, ArrowLeft, Tv2, Search } from 'lucide-react';

async function fetchEpisodeTitles(malId: number): Promise<Record<number, string>> {
  const map: Record<number, string> = {};
  try {
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
      if (page > 12) break;
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
  synopsis?: string;
  rating: string;
  year: string;
  genres: string[];
  initialEp?: number;
  initialLang?: 'sub' | 'dub';
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

export default function AnimeWatchPlayer({
  title, image, anilistId, malId, totalEpisodes, rating, year, genres,
  initialEp = 1, initialLang = 'sub',
}: Props) {
  const epCount = Math.max(totalEpisodes || 1, 1);
  const nextRouter = useNextRouter();
  const pathname = usePathname();

  const [playerKey, setPlayerKey] = useState(0);
  const [visibleEps, setVisibleEps] = useState(Math.min(Math.max(initialEp + 20, 100), epCount));
  const [episode, setEpisode] = useState(Math.min(initialEp, epCount));
  const [lang, setLang] = useState<'sub' | 'dub'>(initialLang);
  const [autoNext, setAutoNext] = useState(true);
  const [showNextCard, setShowNextCard] = useState(false);
  const [epTitles, setEpTitles] = useState<Record<number, string>>({});
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [epQuery, setEpQuery] = useState('');
  const [langFallback, setLangFallback] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState<number | undefined>(undefined);
  const [resumePrompt, setResumePrompt] = useState<{ ep: number; time: number } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const activeEpRef = useRef<HTMLButtonElement>(null);
  const lastSavedTime = useRef(0);
  const urlSynced = useRef(false);

  // One-time resume prompt from history
  useEffect(() => {
    if (!malId) return;
    const entry = getEntry(`anime-${malId}`);
    if (entry?.episode && entry.currentTime && entry.currentTime > 30) {
      const sameEp = entry.episode === initialEp;
      if (sameEp || !initialEp || initialEp === 1) {
        setResumePrompt({ ep: entry.episode, time: entry.currentTime });
        if (entry.lang) setLang(entry.lang);
        if (entry.episode !== episode) {
          setEpisode(Math.min(entry.episode, epCount));
          if (entry.episode > visibleEps) setVisibleEps(Math.min(entry.episode + 50, epCount));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [malId]);

  // Sync episode + lang into URL (skip first paint to avoid RSC round-trip on mount)
  useEffect(() => {
    if (!urlSynced.current) { urlSynced.current = true; return; }
    const params = new URLSearchParams();
    params.set('ep', String(episode));
    params.set('lang', lang);
    nextRouter.replace(`${pathname}?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, lang]);

  useEffect(() => {
    if (!malId) return;
    setTitlesLoading(true);
    fetchEpisodeTitles(malId).then((map) => {
      setEpTitles(map);
      setTitlesLoading(false);
    });
  }, [malId]);

  // Auto-scroll active episode into view
  useEffect(() => {
    activeEpRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [episode, visibleEps]);

  function goToEpisode(ep: number, opts?: { resume?: number }) {
    if (ep < 1 || ep > epCount) return;
    setEpisode(ep);
    setShowNextCard(false);
    setLangFallback(null);
    setResumeAt(opts?.resume);
    setResumePrompt(null);
    if (ep > visibleEps) setVisibleEps(Math.min(ep + 50, epCount));
  }

  // Episode ended (or outro reached): jump straight into the next one
  function handleEnded() {
    if (episode >= epCount) return;
    if (autoNext) goToEpisode(episode + 1);
    else setShowNextCard(true);
  }

  function switchLang(next: 'sub' | 'dub') {
    if (next === lang) return;
    setLang(next);
    setLangFallback(null);
    setResumeAt(undefined);
    setPlayerKey((k) => k + 1);
  }

  // Turning Auto Next on while the manual card is up should advance immediately
  useEffect(() => {
    if (autoNext && showNextCard) goToEpisode(episode + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNext]);

  // Persist episode + optional timestamp (throttled via onProgress)
  const persist = useCallback((time?: number) => {
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
      currentTime: time !== undefined ? Math.floor(time) : lastSavedTime.current || undefined,
    });
  }, [malId, title, image, anilistId, episode, epCount, lang]);

  useEffect(() => {
    lastSavedTime.current = 0;
    persist(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, lang]);

  const onProgress = useCallback((time: number) => {
    if (Math.abs(time - lastSavedTime.current) < 15) return;
    lastSavedTime.current = time;
    persist(time);
  }, [persist]);

  const filteredEps = useMemo(() => {
    const q = epQuery.trim().toLowerCase();
    const all = Array.from({ length: visibleEps }, (_, i) => i + 1);
    if (!q) return all;
    return all.filter((e) => {
      if (String(e) === q || String(e).startsWith(q)) return true;
      const t = epTitles[e];
      return t ? t.toLowerCase().includes(q) : false;
    });
  }, [visibleEps, epQuery, epTitles]);

  const canPlay = Boolean(anilistId || malId);

  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3
        border-b border-white/5 bg-[#0e0e1a]/80 backdrop-blur-sm flex-wrap gap-2">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Back
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

      <div className="flex flex-col xl:flex-row xl:items-start gap-0 xl:gap-3 xl:p-4 xl:max-w-[1600px] xl:mx-auto">
        <div className="flex-1 min-w-0">
          <div className="w-full bg-black xl:rounded-xl overflow-hidden">
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              {canPlay ? (
                <>
                  <HLSPlayer
                    key={`${playerKey}-${anilistId}-${malId}-${episode}-${lang}-${resumeAt ?? 0}`}
                    anilistId={anilistId}
                    malId={malId}
                    episode={episode}
                    lang={lang}
                    poster={image}
                    resumeAt={resumeAt}
                    onEnded={handleEnded}
                    onProgress={onProgress}
                    onLangFallback={(used) => {
                      if (used === 'sub' && lang === 'dub') {
                        setLangFallback('DUB unavailable — playing SUB (Japanese + English subs)');
                      }
                    }}
                  />
                  <button
                    onClick={() => { setResumeAt(undefined); setPlayerKey((k) => k + 1); }}
                    className="absolute top-3 right-3 z-20 flex items-center gap-1.5
                      bg-black/70 hover:bg-red-600 border border-white/10 hover:border-red-500
                      text-white text-xs font-bold px-3 py-1.5 rounded-lg
                      transition-all backdrop-blur-sm opacity-40 hover:opacity-100">
                    ↺ Retry
                  </button>

                  {resumePrompt && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                      <div className="bg-[#0e0e1a] border border-white/12 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Continue watching</p>
                        <p className="text-white font-bold text-sm mb-1">
                          Episode {resumePrompt.ep} · {fmtTime(resumePrompt.time)}
                        </p>
                        <p className="text-xs text-gray-500 mb-4">Resume where you left off?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              goToEpisode(resumePrompt.ep, { resume: resumePrompt.time });
                              setPlayerKey((k) => k + 1);
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm">
                            Resume
                          </button>
                          <button
                            onClick={() => {
                              setResumePrompt(null);
                              setResumeAt(0);
                            }}
                            className="flex-1 bg-white/8 hover:bg-white/12 text-white font-bold py-2.5 rounded-xl text-sm border border-white/10">
                            Start over
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0e1a] gap-4">
                  <Play size={40} className="text-gray-600" />
                  <p className="text-gray-500">Player unavailable for this anime</p>
                </div>
              )}

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
                      <Play size={13} className="fill-white" /> Play Now
                    </button>
                    <div className="flex items-center justify-end mt-2">
                      <button onClick={() => setShowNextCard(false)}
                        className="text-[11px] text-gray-600 hover:text-white transition-colors">Dismiss</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0a0a16] border-b border-white/[0.05]
            xl:border xl:border-t-0 xl:border-white/[0.06] xl:rounded-b-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={() => goToEpisode(episode - 1)} disabled={episode <= 1}
                  className="group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
                    bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/20
                    disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200">
                  <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  Prev
                </button>

                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                  bg-white/[0.04] border border-white/[0.06]">
                  <span className="text-white font-black text-xs">{episode}</span>
                  <span className="text-white/20 text-xs">/</span>
                  <span className="text-gray-500 text-xs">{epCount}</span>
                </div>

                <button onClick={() => goToEpisode(episode + 1)} disabled={episode >= epCount}
                  className="group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
                    bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/20
                    disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200">
                  Next
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center bg-white/[0.05] rounded-xl p-1 border border-white/[0.07]">
                  {([
                    { key: 'sub' as const, label: 'SUB', hint: 'JP + Eng subs' },
                    { key: 'dub' as const, label: 'DUB', hint: 'English audio' },
                  ]).map((l) => (
                    <button key={l.key} onClick={() => switchLang(l.key)} title={l.hint}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200
                        ${lang === l.key
                          ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_2px_12px_rgba(229,9,20,0.4)]'
                          : 'text-gray-500 hover:text-gray-300'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
                {langFallback && (
                  <p className="text-[10px] text-amber-400/90 max-w-[220px] text-right">{langFallback}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-5 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">{title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 bg-yellow-400/12 border border-yellow-400/25
                text-yellow-400 font-black px-3 py-1.5 rounded-xl text-xs">
                <Star size={10} className="fill-yellow-400" /> {rating}
              </span>
              {year && <span className="text-xs text-gray-400 bg-white/[0.06] border border-white/10 px-3 py-1.5 rounded-xl">{year}</span>}
              <span className="text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wide
                bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center gap-1.5">
                <Tv2 size={11} /> Anime
              </span>
              {genres.slice(0, 5).map((g) => (
                <span key={g} className="text-xs text-gray-400 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-xl">{g}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:w-[340px] xl:shrink-0 xl:sticky xl:top-[72px]
          bg-[#0d0d1a] border-t border-white/[0.06] xl:border xl:rounded-xl overflow-hidden">
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

          <div className="px-3 py-2.5 border-b border-white/[0.05]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={epQuery}
                onChange={(e) => setEpQuery(e.target.value)}
                placeholder="Search episode # or title…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2
                  text-xs text-white placeholder:text-gray-600 outline-none focus:border-red-500/40"
              />
            </div>
          </div>

          <div ref={listRef} className="overflow-y-auto max-h-[400px] xl:max-h-[calc(100vh-250px)]
            [scrollbar-width:thin] [scrollbar-color:rgba(229,9,20,0.4)_transparent]">
            {filteredEps.map((e) => {
              const epTitle = epTitles[e];
              const isActive = episode === e;
              return (
                <button key={e} ref={isActive ? activeEpRef : undefined} onClick={() => goToEpisode(e)}
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
                      {[1, 2, 3].map((b) => (
                        <div key={b} className="w-0.5 bg-red-400 rounded-full animate-pulse"
                          style={{ height: `${8 + b * 3}px`, animationDelay: `${b * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
            {filteredEps.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-gray-600">No episodes match “{epQuery}”</p>
            )}
          </div>

          {visibleEps < epCount && !epQuery && (
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

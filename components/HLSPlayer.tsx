'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture2,
  RotateCcw, Loader, SkipForward, Subtitles, Settings, CaptionsOff,
} from 'lucide-react';

interface Track { src: string; label: string; default?: boolean; }
interface Marker { start: number; end: number; }

interface Sources {
  src: string;
  tracks: Track[];
  intro: Marker | null;
  outro: Marker | null;
  usedLang?: 'sub' | 'dub';
  requestedLang?: 'sub' | 'dub';
}

interface Props {
  anilistId: number | null;
  malId: number;
  episode: number;
  lang: 'sub' | 'dub';
  poster?: string | null;
  resumeAt?: number;
  onEnded?: () => void;
  onProgress?: (time: number, duration: number) => void;
  onLangFallback?: (used: 'sub' | 'dub') => void;
}

const VOLUME_KEY = 'anistream_volume';

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function clearTracks(video: HTMLVideoElement) {
  while (video.firstChild) video.removeChild(video.firstChild);
  // Detach Text tracks that browsers may keep around
  Array.from(video.textTracks).forEach((t) => { t.mode = 'disabled'; });
}

async function tryPlay(video: HTMLVideoElement) {
  try {
    await video.play();
  } catch {
    video.muted = true;
    try { await video.play(); } catch { /* user gesture required */ }
  }
}

export default function HLSPlayer({
  anilistId, malId, episode, lang, poster, resumeAt, onEnded, onProgress, onLangFallback,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intro, setIntro] = useState<Marker | null>(null);
  const [outro, setOutro] = useState<Marker | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([]);
  const [level, setLevel] = useState(-1); // -1 = auto
  const [tracks, setTracks] = useState<Track[]>([]);
  const [subIdx, setSubIdx] = useState(0); // -1 = off
  const [subsOn, setSubsOn] = useState(true);
  const [menu, setMenu] = useState<'none' | 'cc' | 'quality'>('none');
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [langNotice, setLangNotice] = useState<string | null>(null);

  // Restore volume
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {
        setVolume(saved);
        setMuted(saved === 0);
        if (videoRef.current) {
          videoRef.current.volume = saved;
          videoRef.current.muted = saved === 0;
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setIntro(null);
    setOutro(null);
    setLevels([]);
    setLevel(-1);
    setTracks([]);
    setSubIdx(0);
    setSubsOn(true);
    setMenu('none');
    setLangNotice(null);
    progressRef.current = 0;
    setProgress(0);
    setBuffered(0);

    const controller = new AbortController();
    let cancelled = false;
    const videoEl = videoRef.current;

    async function load() {
      const params = new URLSearchParams({
        ep: String(episode),
        lang,
        malId: String(malId),
      });
      if (anilistId) params.set('anilistId', String(anilistId));

      const res = await fetch(`/api/anime/sources?${params}`, { signal: controller.signal });
      const data = (await res.json()) as Sources & { error?: string };
      if (!res.ok || !data.src) throw new Error(data.error || 'Stream not available');
      if (cancelled || controller.signal.aborted) return;

      const video = videoRef.current;
      if (!video) return;

      clearTracks(video);
      hlsRef.current?.destroy();
      hlsRef.current = null;

      const list = data.tracks ?? [];
      setTracks(list);
      const defaultIdx = Math.max(0, list.findIndex((t) => t.default));
      setSubIdx(list.length ? (defaultIdx >= 0 ? defaultIdx : 0) : -1);

      list.forEach((t, i) => {
        const el = document.createElement('track');
        el.kind = 'subtitles';
        el.label = t.label;
        el.src = t.src;
        el.srclang = t.label.slice(0, 2).toLowerCase();
        if (i === (defaultIdx >= 0 ? defaultIdx : 0)) el.default = true;
        video.appendChild(el);
      });

      // Force the default track visible after cues load
      const enableDefault = () => {
        const tt = video.textTracks;
        for (let i = 0; i < tt.length; i++) {
          tt[i].mode = i === (defaultIdx >= 0 ? defaultIdx : 0) ? 'showing' : 'hidden';
        }
      };
      video.addEventListener('loadedmetadata', enableDefault, { once: true });
      setTimeout(enableDefault, 500);

      setIntro(data.intro);
      setOutro(data.outro);

      if (data.usedLang && data.requestedLang && data.usedLang !== data.requestedLang) {
        setLangNotice(`DUB unavailable — playing SUB (Japanese + English subs)`);
        onLangFallback?.(data.usedLang);
      }

      const startAt = resumeAt && resumeAt > 15 ? resumeAt : 0;

      if (Hls.isSupported()) {
        if (cancelled || controller.signal.aborted) return;
        const hls = new Hls({
          enableWorker: true,
          // Start at the lighter 720p rendition; ABR can upgrade after playback starts.
          startLevel: 0,
          // Proxy hop adds latency — keep a deeper buffer and prefetch
          maxBufferLength: 45,
          maxMaxBufferLength: 90,
          maxBufferHole: 0.5,
          startFragPrefetch: true,
          fragLoadingTimeOut: 15000,
          manifestLoadingTimeOut: 12000,
          levelLoadingTimeOut: 12000,
          fragLoadingMaxRetry: 3,
          manifestLoadingMaxRetry: 2,
        });
        hlsRef.current = hls;
        hls.loadSource(data.src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          const lvls = hls.levels
            .map((l, index) => ({ height: l.height || 0, index }))
            .filter((l) => l.height > 0)
            .sort((a, b) => b.height - a.height);
          setLevels(lvls);
          setLoading(false);
          if (startAt) video.currentTime = startAt;
          tryPlay(video);
        });

        hls.on(Hls.Events.ERROR, (_, detail) => {
          if (!detail.fatal || cancelled) return;
          if (detail.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          if (detail.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          setLoading(false);
          setError('Playback failed for this episode.');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = data.src;
        setLoading(false);
        if (startAt) video.currentTime = startAt;
        tryPlay(video);
      } else {
        throw new Error('Your browser cannot play HLS streams.');
      }
    }

    load().catch((e: Error) => {
      if (controller.signal.aborted || cancelled) return;
      setLoading(false);
      setError(e.message);
    });

    return () => {
      cancelled = true;
      controller.abort();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      if (videoEl) clearTracks(videoEl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anilistId, malId, episode, lang]);

  // Apply subtitle selection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tt = video.textTracks;
    for (let i = 0; i < tt.length; i++) {
      if (!subsOn || subIdx < 0) tt[i].mode = 'disabled';
      else tt[i].mode = i === subIdx ? 'showing' : 'hidden';
    }
  }, [subIdx, subsOn, tracks]);

  // Apply quality
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = level;
  }, [level]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) tryPlay(v);
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFs = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  const togglePip = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement) document.exitPictureInPicture?.();
    else v.requestPictureInPicture?.().catch(() => {});
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case 'arrowright':
          e.preventDefault();
          v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
          break;
        case 'arrowup':
          e.preventDefault();
          {
            const next = Math.min(1, (v.volume || 0) + 0.05);
            v.volume = next; setVolume(next); setMuted(false); v.muted = false;
            try { localStorage.setItem(VOLUME_KEY, String(next)); } catch { /* */ }
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          {
            const next = Math.max(0, (v.volume || 0) - 0.05);
            v.volume = next; setVolume(next); setMuted(next === 0); v.muted = next === 0;
            try { localStorage.setItem(VOLUME_KEY, String(next)); } catch { /* */ }
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFs();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'c':
          e.preventDefault();
          setSubsOn((s) => !s);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleFs, toggleMute]);

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  function showCtrl() {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
      setMenu('none');
    }, 3000);
  }

  const inIntro = Boolean(intro && progress >= intro.start && progress < intro.end);
  const inOutro = Boolean(outro && progress >= outro.start && progress < outro.end);
  const controlsVisible = showControls || !playing || menu !== 'none';

  if (error) return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0e0e1a] text-center px-6">
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
      )}
      <p className="relative text-red-400 font-bold">Stream unavailable</p>
      <p className="relative text-xs text-gray-500">{error}</p>
      <p className="relative text-xs text-gray-600">Try another episode or switch between SUB and DUB.</p>
    </div>
  );

  return (
    <div ref={containerRef} className="absolute inset-0 bg-black select-none"
      onMouseMove={showCtrl}
      onMouseLeave={() => { if (playing) setShowControls(false); setMenu('none'); }}
      onClick={togglePlay}>

      {loading && poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md pointer-events-none" />
      )}

      <video ref={videoRef} className="w-full h-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(v.duration || 0);
        }}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          progressRef.current = v.currentTime;
          setProgress(v.currentTime);
          if (v.buffered.length) {
            setBuffered(v.buffered.end(v.buffered.length - 1));
          }
          onProgress?.(v.currentTime, v.duration || 0);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onEnded={onEnded}
        playsInline
        crossOrigin="anonymous"
      />

      {(loading || buffering) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader size={40} className="animate-spin text-red-500 opacity-80" />
        </div>
      )}

      {langNotice && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-black/75 border border-white/10
          text-[11px] text-amber-300 font-medium backdrop-blur-sm pointer-events-none">
          {langNotice}
        </div>
      )}

      {(inIntro || inOutro) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const v = videoRef.current;
            if (!v) return;
            if (inIntro && intro) v.currentTime = intro.end;
            else if (inOutro) onEnded?.();
          }}
          className="absolute bottom-24 right-4 z-20 flex items-center gap-1.5 px-4 py-2
            rounded-xl bg-black/80 hover:bg-red-600 border border-white/15 hover:border-red-500
            text-white text-xs font-bold backdrop-blur-sm transition-all">
          <SkipForward size={13} /> {inIntro ? 'Skip Intro' : 'Next Episode'}
        </button>
      )}

      {/* Controls overlay — pointer-events only when visible so click-to-play works */}
      <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300
        ${controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}>

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

        <div className="relative px-4 pb-4 space-y-2">
          {/* Progress */}
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="tabular-nums w-10 text-right">{fmt(progress)}</span>
            <div className="flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer group relative"
              onClick={seek}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverPct(((e.clientX - rect.left) / rect.width) * 100);
              }}
              onMouseLeave={() => setHoverPct(null)}>
              {/* Buffered */}
              <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full"
                style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
              {/* Played */}
              <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full"
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
              <div className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 -translate-y-1/2 -translate-x-1/2 transition-opacity"
                style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }} />
              {hoverPct !== null && duration > 0 && (
                <div className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 text-[10px] text-white pointer-events-none"
                  style={{ left: `${hoverPct}%` }}>
                  {fmt((hoverPct / 100) * duration)}
                </div>
              )}
            </div>
            <span className="tabular-nums w-10">{fmt(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors" aria-label="Play/Pause">
                {playing ? <Pause size={20} /> : <Play size={20} className="fill-white" />}
              </button>
              <button onClick={toggleMute} className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors" aria-label="Mute">
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = videoRef.current;
                  const val = Number(e.target.value);
                  setVolume(val); setMuted(val === 0);
                  if (v) { v.volume = val; v.muted = val === 0; }
                  try { localStorage.setItem(VOLUME_KEY, String(val)); } catch { /* */ }
                }}
                className="w-16 sm:w-20 accent-red-500 cursor-pointer" />
              <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors" aria-label="Back 10s">
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 relative">
              {/* CC menu */}
              <div className="relative">
                <button onClick={() => setMenu((m) => m === 'cc' ? 'none' : 'cc')}
                  className={`w-9 h-9 flex items-center justify-center transition-colors
                    ${subsOn && subIdx >= 0 ? 'text-red-400' : 'text-white hover:text-red-400'}`}
                  aria-label="Subtitles">
                  {subsOn && subIdx >= 0 ? <Subtitles size={18} /> : <CaptionsOff size={18} />}
                </button>
                {menu === 'cc' && (
                  <div className="absolute bottom-11 right-0 w-44 bg-[#0e0e1a]/98 border border-white/12 rounded-xl
                    shadow-2xl backdrop-blur-xl py-1.5 z-30 max-h-56 overflow-y-auto">
                    <button onClick={() => { setSubsOn(false); setMenu('none'); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/8
                        ${!subsOn || subIdx < 0 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                      Off
                    </button>
                    {tracks.map((t, i) => (
                      <button key={`${t.label}-${i}`}
                        onClick={() => { setSubsOn(true); setSubIdx(i); setMenu('none'); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/8 truncate
                          ${subsOn && subIdx === i ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                        {t.label}
                      </button>
                    ))}
                    {!tracks.length && (
                      <p className="px-3 py-1.5 text-[11px] text-gray-600">No subtitles</p>
                    )}
                  </div>
                )}
              </div>

              {/* Quality menu */}
              {levels.length > 0 && (
                <div className="relative">
                  <button onClick={() => setMenu((m) => m === 'quality' ? 'none' : 'quality')}
                    className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors"
                    aria-label="Quality">
                    <Settings size={17} />
                  </button>
                  {menu === 'quality' && (
                    <div className="absolute bottom-11 right-0 w-32 bg-[#0e0e1a]/98 border border-white/12 rounded-xl
                      shadow-2xl backdrop-blur-xl py-1.5 z-30">
                      <button onClick={() => { setLevel(-1); setMenu('none'); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/8
                          ${level === -1 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                        Auto
                      </button>
                      {levels.map((l) => (
                        <button key={l.index} onClick={() => { setLevel(l.index); setMenu('none'); }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/8
                            ${level === l.index ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                          {l.height}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={togglePip}
                className="hidden sm:flex w-9 h-9 items-center justify-center text-white hover:text-red-400 transition-colors"
                aria-label="Picture in Picture">
                <PictureInPicture2 size={17} />
              </button>
              <button onClick={toggleFs}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors"
                aria-label="Fullscreen">
                {isFs ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

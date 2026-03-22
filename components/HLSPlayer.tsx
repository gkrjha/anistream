'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader } from 'lucide-react';

interface Track { url: string; lang: string; default?: boolean; }

interface Props {
  episode: number;
  lang: 'sub' | 'dub';
  title: string;
  onEnded?: () => void;
}

export default function HLSPlayer({ episode, lang, title, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/stream?ep=${episode}&lang=${lang}&title=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then(({ sources, subtitles, error: err }) => {
        if (err) throw new Error(err);
        if (!sources?.length) throw new Error('No sources found');

        const video = videoRef.current;
        if (!video) return;

        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

        const url = sources[0].url;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); setLoading(false); });
          hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) setError('Stream error — try another server'); });
          hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.play().catch(() => {});
          setLoading(false);
        } else {
          throw new Error('HLS not supported');
        }

        // Subtitles
        while (video.firstChild) video.removeChild(video.firstChild);
        (subtitles as Track[] ?? []).forEach((t) => {
          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = t.lang;
          track.srclang = t.lang.substring(0, 2).toLowerCase();
          track.src = t.url;
          if (t.default) track.default = true;
          video.appendChild(track);
        });
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });

    return () => { hlsRef.current?.destroy(); };
  }, [title, episode, lang]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  function showCtrl() {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  if (loading) return (
    <div className="w-full bg-black flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <div className="flex flex-col items-center gap-3">
        <Loader size={32} className="animate-spin text-red-500" />
        <p className="text-sm text-gray-400">Loading stream...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="w-full bg-black flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <p className="text-red-400 font-bold">Stream unavailable</p>
        <p className="text-xs text-gray-500">{error}</p>
        <p className="text-xs text-gray-600">Switch to VidNest server below</p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full bg-black select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={showCtrl}
      onMouseLeave={() => setShowControls(false)}
      onClick={togglePlay}>

      <video ref={videoRef} className="w-full h-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setProgress(v.currentTime);
          setDuration(v.duration || 0);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onEnded={onEnded}
        playsInline
      />

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader size={40} className="animate-spin text-red-500 opacity-80" />
        </div>
      )}

      {/* Controls */}
      <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300
        ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        <div className="relative px-4 pb-4 space-y-2">
          {/* Progress */}
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span>{fmt(progress)}</span>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group relative" onClick={seek}>
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
              <div className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 -translate-y-1/2 -translate-x-1/2 transition-opacity"
                style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }} />
            </div>
            <span>{fmt(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors">
                {playing ? <Pause size={20} /> : <Play size={20} className="fill-white" />}
              </button>
              <button onClick={toggleMute} className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors">
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = videoRef.current;
                  const val = Number(e.target.value);
                  setVolume(val); setMuted(val === 0);
                  if (v) { v.volume = val; v.muted = val === 0; }
                }}
                className="w-20 accent-red-500 cursor-pointer" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => containerRef.current?.requestFullscreen?.()}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors">
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

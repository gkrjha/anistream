'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader } from 'lucide-react';

interface Source {
  url: string;
  quality?: string;
  isM3U8?: boolean;
}

interface Props {
  anilistId: number;
  episode: number;
  lang: 'sub' | 'dub';
  onEnded?: () => void;
}

export default function HLSPlayer({ anilistId, episode, lang, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch sources from our API
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSources([]);

    fetch(`/api/stream?id=${anilistId}&ep=${episode}&lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const srcs: Source[] = data.sources ?? [];
        if (!srcs.length) throw new Error('No sources found');
        setSources(srcs);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [anilistId, episode, lang]);

  // Load HLS when sources ready
  useEffect(() => {
    if (!sources.length || !videoRef.current) return;

    const video = videoRef.current;
    const src = sources.find((s) => s.isM3U8) ?? sources[0];

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (src.isM3U8 && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src.url;
      video.play().catch(() => {});
    } else {
      video.src = src.url;
      video.play().catch(() => {});
    }

    return () => { hlsRef.current?.destroy(); };
  }, [sources]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
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
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  }

  function fullscreen() {
    containerRef.current?.requestFullscreen?.();
  }

  function showCtrl() {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  if (loading) return (
    <div className="w-full bg-black flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader size={32} className="animate-spin text-red-500" />
        <p className="text-sm">Loading stream...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="w-full bg-black flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <div className="flex flex-col items-center gap-3 text-gray-400 text-center px-6">
        <p className="text-red-400 font-bold">Stream unavailable</p>
        <p className="text-xs text-gray-600">{error}</p>
        <p className="text-xs text-gray-600">Try a different server below</p>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={showCtrl}
      onMouseLeave={() => setShowControls(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
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

      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader size={40} className="animate-spin text-red-500 opacity-80" />
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300
        ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}>

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        <div className="relative px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span>{formatTime(progress)}</span>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative group"
              onClick={seek}>
              <div className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow
                opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${duration ? (progress / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }} />
            </div>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors">
                {playing ? <Pause size={20} /> : <Play size={20} className="fill-white" />}
              </button>
              <button onClick={toggleMute}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors">
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = videoRef.current;
                  const val = Number(e.target.value);
                  setVolume(val);
                  if (v) { v.volume = val; v.muted = val === 0; }
                  setMuted(val === 0);
                }}
                className="w-20 accent-red-500 cursor-pointer" />
            </div>

            <div className="flex items-center gap-2">
              {/* Quality selector */}
              {sources.length > 1 && (
                <select
                  value={selectedQuality}
                  onChange={(e) => {
                    setSelectedQuality(e.target.value);
                    const src = e.target.value === 'auto'
                      ? sources.find((s) => s.isM3U8) ?? sources[0]
                      : sources.find((s) => s.quality === e.target.value) ?? sources[0];
                    const v = videoRef.current;
                    if (!v) return;
                    const t = v.currentTime;
                    if (src.isM3U8 && Hls.isSupported() && hlsRef.current) {
                      hlsRef.current.loadSource(src.url);
                      v.currentTime = t;
                    } else {
                      v.src = src.url;
                      v.currentTime = t;
                      v.play().catch(() => {});
                    }
                  }}
                  className="bg-black/70 text-white text-xs border border-white/20 rounded-lg px-2 py-1 outline-none cursor-pointer"
                  onClick={(e) => e.stopPropagation()}>
                  <option value="auto">Auto</option>
                  {sources.filter((s) => s.quality).map((s) => (
                    <option key={s.quality} value={s.quality!}>{s.quality}</option>
                  ))}
                </select>
              )}
              <button onClick={() => { const v = videoRef.current; if (v) { v.currentTime = Math.max(0, v.currentTime - 10); } }}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 transition-colors">
                <RotateCcw size={16} />
              </button>
              <button onClick={fullscreen}
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

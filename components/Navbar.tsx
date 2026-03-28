'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Tv2, Clapperboard, MonitorPlay, Search, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Logo from './Logo';

interface SuggestItem {
  id: number | string;
  title: string;
  image: string | null;
  type: string;
  watchUrl: string;
  year?: string;
  rating?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const TYPE_STYLE: Record<string, { dot: string; label: string; bg: string }> = {
  Anime:  { dot: 'bg-violet-400', label: 'Anime',  bg: 'bg-violet-500/15 text-violet-300' },
  Movie:  { dot: 'bg-sky-400',    label: 'Movie',  bg: 'bg-sky-500/15 text-sky-300' },
  Series: { dot: 'bg-emerald-400',label: 'Series', bg: 'bg-emerald-500/15 text-emerald-300' },
};

function SuggestionsDropdown({
  suggestions, query, onSelect, onSeeAll,
}: {
  suggestions: SuggestItem[];
  query: string;
  onSelect: (url: string) => void;
  onSeeAll: () => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="w-full bg-[#0c0c1a]/98 backdrop-blur-2xl border border-white/[0.1]
      rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.9)]">

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Results</span>
        <span className="text-[10px] text-gray-600">{suggestions.length} found</span>
      </div>

      {suggestions.map((s) => {
        const ts = TYPE_STYLE[s.type] ?? { dot: 'bg-gray-500', label: s.type, bg: 'bg-gray-500/15 text-gray-300' };
        return (
          <button key={s.watchUrl} type="button"
            onMouseDown={() => onSelect(s.watchUrl)}
            className="w-full flex items-center gap-3 px-4 py-3
              hover:bg-white/[0.05] active:bg-white/[0.08]
              transition-colors border-b border-white/[0.04] last:border-0 group">

            {/* Poster */}
            <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-white/[0.06] border border-white/[0.08]">
              {s.image
                ? <Image src={s.image} alt={s.title} width={40} height={56}
                    className="object-cover w-full h-full" unoptimized />
                : <div className="w-full h-full flex items-center justify-center text-gray-700">
                    <Search size={14} />
                  </div>}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-white text-sm font-bold truncate group-hover:text-red-300 transition-colors">
                {s.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ts.bg}`}>
                  {ts.label}
                </span>
                {s.year && <span className="text-[10px] text-gray-600">{s.year}</span>}
                {s.rating && s.rating !== 'N/A' && (
                  <span className="text-[10px] text-yellow-500 font-bold">★ {s.rating}</span>
                )}
              </div>
            </div>

            <ArrowRight size={14} className="text-gray-700 group-hover:text-red-400 shrink-0 transition-colors" />
          </button>
        );
      })}

      {/* Footer */}
      <button type="button" onMouseDown={onSeeAll}
        className="w-full px-4 py-3 flex items-center justify-center gap-2
          text-xs text-red-400 hover:text-white font-bold
          bg-red-600/0 hover:bg-red-600/10 transition-all border-t border-white/[0.06]">
        <Search size={12} />
        See all results for &quot;{query}&quot;
      </button>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setSuggestLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSuggestions((data.items ?? []).slice(0, 6));
    } catch { setSuggestions([]); }
    setSuggestLoading(false);
  }, []);

  useEffect(() => { fetchSuggestions(debouncedQuery); }, [debouncedQuery, fetchSuggestions]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/anime', label: 'Anime', icon: Tv2 },
    { href: '/movies', label: 'Movies', icon: Clapperboard },
    { href: '/webseries', label: 'Series', icon: MonitorPlay },
  ];

  function submitSearch() {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setMobileOpen(false); setSearchOpen(false);
    setShowSuggestions(false); setSuggestions([]); setQuery('');
  }

  function handleSearch(e: React.FormEvent) { e.preventDefault(); submitSearch(); }

  function goToSuggestion(url: string) {
    router.push(url);
    setShowSuggestions(false); setSuggestions([]); setQuery(''); setSearchOpen(false);
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500
      ${scrolled
        ? 'bg-[#06060f]/96 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
        : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-[68px] flex items-center gap-6">

        <Logo />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 ml-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                  ${active ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                {active && <span className="absolute inset-0 bg-white/8 rounded-lg" />}
                <Icon size={15} className="relative" />
                <span className="relative">{label}</span>
                {active && <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-red-500 rounded-full" />}
              </Link>
            );
          })}
        </div>

        {/* Desktop search */}
        <form onSubmit={handleSearch} className="ml-auto hidden md:flex items-center">
          <div ref={searchRef} className="relative">
            <div className={`flex items-center bg-white/[0.07] border rounded-xl overflow-hidden
              transition-all duration-300
              ${searchOpen ? 'border-red-500/50 w-72 bg-white/[0.09]' : 'border-white/10 w-10 hover:w-52 hover:border-white/20'}`}
              onClick={() => setSearchOpen(true)}>
              <Search size={14} className="ml-3 mr-2 text-gray-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { setSearchOpen(true); setShowSuggestions(true); }}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder="Search anime, movies..."
                className="bg-transparent text-white placeholder-gray-600 py-2.5 pr-3 text-sm outline-none w-full min-w-0"
              />
              {suggestLoading && (
                <div className="mr-3 w-3.5 h-3.5 border-2 border-white/10 border-t-red-500 rounded-full animate-spin shrink-0" />
              )}
            </div>

            {searchOpen && query && (
              <button type="submit"
                className="absolute right-0 top-1/2 -translate-y-1/2 -mr-[72px]
                  bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl
                  text-sm font-bold transition-all hover:shadow-[0_0_20px_rgba(229,9,20,0.4)]">
                Go
              </button>
            )}

            {/* Desktop dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-80 z-50">
                <SuggestionsDropdown
                  suggestions={suggestions} query={query}
                  onSelect={goToSuggestion} onSeeAll={submitSearch}
                />
              </div>
            )}
          </div>
        </form>

        {/* Mobile search icon */}
        <button onClick={() => { setSearchOpen((v) => !v); setMobileOpen(false); }}
          className="md:hidden ml-auto w-10 h-10 flex items-center justify-center
            text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <Search size={18} />
        </button>

        {/* Mobile hamburger */}
        <button onClick={() => { setMobileOpen((v) => !v); setSearchOpen(false); }}
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5
            text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile search panel */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden
        ${searchOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#080814]/98 backdrop-blur-2xl border-t border-white/[0.06] px-4 pt-3 pb-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2 items-center">
            <div className="flex-1 flex items-center bg-white/[0.07] border border-white/[0.1]
              focus-within:border-red-500/50 rounded-xl overflow-hidden transition-colors">
              <Search size={15} className="ml-3 text-gray-500 shrink-0" />
              <input value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                placeholder="Search anime, movies, series..."
                autoFocus={searchOpen}
                className="flex-1 bg-transparent text-white placeholder-gray-600
                  px-3 py-3 text-sm outline-none" />
              {suggestLoading && (
                <div className="mr-3 w-3.5 h-3.5 border-2 border-white/10 border-t-red-500 rounded-full animate-spin shrink-0" />
              )}
            </div>
            <button type="submit"
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl
                text-sm font-bold transition-colors shrink-0">
              Go
            </button>
          </form>

          {/* Mobile dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionsDropdown
              suggestions={suggestions} query={query}
              onSelect={(url) => { goToSuggestion(url); setSearchOpen(false); }}
              onSeeAll={() => { submitSearch(); setSearchOpen(false); }}
            />
          )}
        </div>
      </div>

      {/* Mobile nav menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#0a0a16]/98 backdrop-blur-2xl border-t border-white/[0.06] px-4 py-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                ${pathname === href
                  ? 'bg-red-600/15 text-red-400 border border-red-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

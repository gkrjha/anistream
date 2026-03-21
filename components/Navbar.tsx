'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home', icon: '⌂' },
    { href: '/anime', label: 'Anime', icon: '🐉' },
    { href: '/movies', label: 'Movies', icon: '🎬' },
    { href: '/webseries', label: 'Series', icon: '📺' },
  ];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setMobileOpen(false);
      setSearchOpen(false);
    }
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500
      ${scrolled
        ? 'bg-[#06060f]/96 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
        : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-[68px] flex items-center gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 bg-red-600 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300" />
            <div className="absolute inset-0 bg-red-500 rounded-xl group-hover:scale-95 transition-transform duration-300" />
            <span className="relative text-white text-sm font-black z-10 ml-0.5">▶</span>
          </div>
          <span className="text-white font-black text-xl tracking-tight">
            Ani<span className="text-red-500">Stream</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 ml-2">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href}
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                  ${active ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                {active && (
                  <span className="absolute inset-0 bg-white/8 rounded-lg" />
                )}
                <span className="relative">{l.label}</span>
                {active && (
                  <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="ml-auto hidden sm:flex items-center">
          <div className="relative flex items-center">
            <div className={`flex items-center bg-white/[0.07] border rounded-xl overflow-hidden
              transition-all duration-300 ${searchOpen ? 'border-red-500/60 w-64' : 'border-white/10 w-10 hover:w-48 hover:border-white/20'}`}
              onClick={() => setSearchOpen(true)}>
              <span className="pl-3 pr-2 text-gray-500 text-sm shrink-0">🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder="Search..."
                className="bg-transparent text-white placeholder-gray-600 py-2.5 pr-3 text-sm
                  outline-none w-full min-w-0"
              />
            </div>
            {searchOpen && query && (
              <button type="submit"
                className="ml-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl
                  text-sm font-bold transition-all hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] shrink-0">
                Go
              </button>
            )}
          </div>
        </form>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden ml-auto w-10 h-10 flex flex-col items-center justify-center gap-1.5
            text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300
            ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300
            ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300
            ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300
        ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#0a0a16]/98 backdrop-blur-2xl border-t border-white/[0.06] px-4 py-4 space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                ${pathname === l.href
                  ? 'bg-red-600/15 text-red-400 border border-red-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
          <form onSubmit={handleSearch} className="flex gap-2 pt-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime, movies..."
              className="flex-1 bg-white/6 border border-white/10 text-white placeholder-gray-600
                px-4 py-3 rounded-xl text-sm outline-none focus:border-red-500/50 transition-colors" />
            <button type="submit"
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors">
              Go
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, Tv2, Clapperboard, MonitorPlay, Search, X } from 'lucide-react';
import Logo from './Logo';

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
    { href: '/', label: 'Home', icon: Home },
    { href: '/anime', label: 'Anime', icon: Tv2 },
    { href: '/movies', label: 'Movies', icon: Clapperboard },
    { href: '/webseries', label: 'Series', icon: MonitorPlay },
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
                {active && (
                  <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="ml-auto hidden md:flex items-center">
          <div className="relative flex items-center">
            <div className={`flex items-center bg-white/[0.07] border rounded-xl overflow-hidden
              transition-all duration-300 ${searchOpen ? 'border-red-500/60 w-64' : 'border-white/10 w-10 hover:w-48 hover:border-white/20'}`}
              onClick={() => setSearchOpen(true)}>
              <Search size={14} className="ml-3 mr-2 text-gray-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder="Search..."
                className="bg-transparent text-white placeholder-gray-600 py-2.5 pr-3 text-sm outline-none w-full min-w-0"
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

        {/* Mobile search icon */}
        <button onClick={() => { setSearchOpen((v) => !v); setMobileOpen(false); }}
          className="md:hidden ml-auto w-10 h-10 flex items-center justify-center
            text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <Search size={18} />
        </button>

        {/* Mobile toggle */}
        <button onClick={() => { setMobileOpen((v) => !v); setSearchOpen(false); }}
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5
            text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile search bar */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${searchOpen ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#0a0a16]/98 backdrop-blur-2xl border-t border-white/[0.06] px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime, movies..."
              autoFocus={searchOpen}
              className="flex-1 bg-white/6 border border-white/10 text-white placeholder-gray-600
                px-4 py-3 rounded-xl text-sm outline-none focus:border-red-500/50 transition-colors" />
            <button type="submit"
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors">
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Mobile menu */}
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

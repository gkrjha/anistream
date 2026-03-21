import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AniStream — Watch Anime, Movies & Series Free',
  description: 'Stream thousands of anime, movies and web series in HD. Free, no ads, no signup.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#06060f] text-gray-100 font-[var(--font-inter)] antialiased">
        <Navbar />
        <main className="pt-[68px]">{children}</main>

        <footer className="mt-20 border-t border-white/[0.05]">
          <div className="max-w-[1400px] mx-auto px-8 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center
                  shadow-[0_0_20px_rgba(229,9,20,0.4)]">
                  <span className="text-white text-sm font-black ml-0.5">▶</span>
                </div>
                <div>
                  <span className="text-white font-black text-xl">Ani<span className="text-red-500">Stream</span></span>
                  <p className="text-gray-600 text-xs mt-0.5">Watch Free. No Signup.</p>
                </div>
              </div>

              <p className="text-gray-700 text-xs text-center">
                © 2026 AniStream · Powered by AniList & TMDB · For entertainment purposes only
              </p>

              <div className="flex gap-6 text-sm text-gray-600">
                {['Home', 'Anime', 'Movies', 'Series'].map((l) => (
                  <a key={l} href={l === 'Home' ? '/' : `/${l.toLowerCase()}`}
                    className="hover:text-gray-300 transition-colors">{l}</a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

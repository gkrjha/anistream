import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import Script from 'next/script';
// import { Analytics } from '@vercel/analytics/next'; // run: npm i @vercel/analytics

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AniStream — Watch Anime, Movies & Series Free',
    template: '%s | AniStream',
  },
  description: 'Stream thousands of anime, movies and web series in HD. Free, no ads, no signup.',
  metadataBase: new URL('https://anistream.vercel.app'),
  manifest: '/manifest.json',
  robots: { index: true, follow: true },
  openGraph: {
    siteName: 'AniStream',
    type: 'website',
    locale: 'en_US',
    title: 'AniStream — Watch Anime, Movies & Series Free',
    description: 'Stream thousands of anime, movies and web series in HD. Free, no ads, no signup.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AniStream — Watch Anime, Movies & Series Free',
    description: 'Stream thousands of anime, movies and web series in HD. Free, no ads, no signup.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AniStream',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#e50914" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AniStream" />
        <meta name="application-name" content="AniStream" />
        <meta name="msapplication-TileColor" content="#e50914" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body className="bg-[#06060f] text-gray-100 font-[var(--font-inter)] antialiased">
        <Navbar />
        <main className="pt-[68px]">{children}</main>

        <Script id="adblock-script" strategy="beforeInteractive">
          {`
            (function() {
              // 1. Extreme window.open block (Proxy + DefineProperty)
              const noop = () => { 
                console.log('AniStream: Blocked a popup attempt'); 
                try { window.stop(); } catch(e) {}
                return { focus: () => {}, close: () => {}, location: { href: "" } }; 
              };

              // Use Proxy to make window.open un-bypassable
              window.open = new Proxy(window.open, {
                apply: (target, thisArg, argArray) => {
                  console.log('AniStream: Proxy blocked window.open');
                  try { window.stop(); } catch(e) {}
                  return noop();
                }
              });

              const hardFreeze = (obj) => {
                try {
                  Object.defineProperty(obj, 'open', { value: noop, writable: false, configurable: false });
                } catch (e) {
                  try { obj.open = noop; } catch(err) {}
                }
              };
              hardFreeze(window);
              if (window.top) hardFreeze(window.top);
              if (window.parent) hardFreeze(window.parent);

              // 2. Block top-level navigation/redirects
              window.addEventListener('beforeunload', (e) => {
                if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
                    console.log('AniStream: Blocked an iframe-initiated redirect');
                    try { window.stop(); } catch(err) {}
                }
              }, true);

              // 3. Global Event Interceptor (Capture Phase)
              const adTriggers = ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'];
              adTriggers.forEach(type => {
                document.addEventListener(type, (e) => {
                  const target = e.target.closest('a');
                  if (target) {
                    const href = (target.href || '').toLowerCase();
                    const isExternal = href && !href.includes(window.location.hostname) && !href.startsWith('/') && !href.startsWith('#');
                    if (target.target === '_blank' || isExternal) {
                      e.preventDefault();
                      e.stopImmediatePropagation();
                      console.log('AniStream: Blocked external ad trigger');
                      return false;
                    }
                  }
                }, true);
              });

              // 4. Ad-Content Cleanup
              const adKeywords = ['pop', 'ads', 'click', 'syndication', 'qxbroker', 'quotex', 'slim', 'pelotas', 'trading', 'slimypelotas', 'track'];
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                      const src = (node.src || node.href || '').toLowerCase();
                      const id = (node.id || '').toLowerCase();
                      const cls = (node.className || '').toString().toLowerCase();
                      
                      if (adKeywords.some(kw => src.includes(kw) || id.includes(kw) || cls.includes(kw))) {
                        node.remove();
                      }
                      if (node.tagName === 'IFRAME' && src && !src.includes('vidnest') && !src.includes('animepahe') && !src.includes('vidsrc') && !src.includes(window.location.hostname)) {
                        node.remove();
                      }
                    }
                  });
                });
              });
              observer.observe(document.documentElement, { childList: true, subtree: true });

              // 5. Force links to stay in-app
              setInterval(() => {
                document.querySelectorAll('a').forEach(a => {
                  if (a.target === '_blank') a.target = '_self';
                });
              }, 500);

              window.alert = window.confirm = window.prompt = () => true;
            })();
          `}
        </Script>

        <footer className="mt-20 border-t border-white/[0.05]">
          {/* Anime Characters Banner */}
          <div className="relative overflow-hidden bg-gradient-to-b from-transparent to-[#06060f] border-b border-white/[0.04]">
            <div className="flex gap-0 h-[180px] sm:h-[220px]">
              {[
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png', name: 'Levi' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png', name: 'Gojo' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b27-Z5O02kQUydpT.jpg', name: 'Killua' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-MNypXsxSRb1R.png', name: 'Luffy' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b40882-dsj7IP943WFF.jpg', name: 'Eren' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b62-S7oAeA9WInjV.png', name: 'Zoro' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b88572-IzTwXEHSobRs.jpg', name: 'Emilia' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b417-gVLmIJu9phcK.png', name: 'Lelouch' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png', name: 'Mikasa' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b71-1W4panC53vfs.png', name: 'L' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b87275-mb13EWZBdbh3.png', name: 'Kaneki' },
                { src: 'https://s4.anilist.co/file/anilistcdn/character/large/b89334-OPj1hCzvrt7X.png', name: 'Reigen' },
              ].map((char, i) => (
                <div key={i} className="relative flex-1 min-w-[80px] sm:min-w-[100px] overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={char.src}
                    alt={char.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110 opacity-60 group-hover:opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06060f] via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white/70 font-semibold">{char.name}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Left/right fade */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#06060f] to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#06060f] to-transparent pointer-events-none" />
          </div>

          <div className="max-w-[1400px] mx-auto px-8 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Brand */}
              <Logo subtitle="Watch Free. No Signup." />

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
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            function registerSW() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  reg.addEventListener('updatefound', function() {
                    var newSW = reg.installing;
                    if (newSW) {
                      newSW.addEventListener('statechange', function() {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                          newSW.postMessage({ type: 'SKIP_WAITING' });
                        }
                      });
                    }
                  });
                })
                .catch(function(err) { console.warn('SW registration failed:', err); });
            }
            // Register immediately if page already loaded, else wait
            if (document.readyState === 'complete') {
              registerSW();
            } else {
              window.addEventListener('load', registerSW);
            }
          }
        `}</Script>
      </body>
    </html>
  );
}

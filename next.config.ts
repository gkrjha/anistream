import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // disable SW in dev to avoid cache issues
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      // Cache AniList API responses
      urlPattern: /^https:\/\/graphql\.anilist\.co/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'anilist-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
      },
    },
    {
      // Cache TMDB images
      urlPattern: /^https:\/\/image\.tmdb\.org/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'tmdb-images',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
      },
    },
    {
      // Cache AniList cover images
      urlPattern: /^https:\/\/s4\.anilist\.co/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'anilist-images',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
      },
    },
    {
      // Cache all other static assets
      urlPattern: /\.(?:js|css|woff2|woff|ttf)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 'media.kitsu.app' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);

import { createHmac, timingSafeEqual } from 'crypto';

// Upstream CDNs reject requests that don't carry the provider's Referer, so all
// media has to be fetched server-side. Proxy URLs are signed to keep this route
// from becoming an open proxy for arbitrary hosts.
function getSecret(): string {
  const secret = process.env.STREAM_PROXY_SECRET;
  if (secret) return secret;
  // Per-deployment fallback so Vercel works before the env var is set.
  // Prefer STREAM_PROXY_SECRET in the Vercel dashboard for a durable key.
  const deploy = process.env.VERCEL_DEPLOYMENT_ID;
  if (deploy) return `anistream:${deploy}`;
  if (process.env.NODE_ENV === 'production') {
    console.error('[stream-proxy] STREAM_PROXY_SECRET is not set — using unstable fallback');
  }
  return 'anistream-local-dev-secret';
}

export const PROXY_PATH = '/api/anime/proxy';
export const UPSTREAM_REFERER = 'https://megaplay.buzz/';

/** Hosts we are willing to fetch via the signed proxy. */
const ALLOWED_HOST_SUFFIXES = [
  'megaplay.buzz',
  'kotocdn.site',
  'lostproject.club',
];

export function isAllowedProxyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(url: string): string {
  return createHmac('sha256', getSecret()).update(url).digest('base64url');
}

export function proxyUrl(target: string): string {
  return `${PROXY_PATH}?u=${b64url(target)}&s=${sign(target)}`;
}

export function verifyProxyUrl(encoded: string, signature: string): string | null {
  let target: string;
  try {
    target = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  let expected: Buffer;
  try {
    expected = Buffer.from(sign(target));
  } catch {
    return null;
  }
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const url = new URL(target);
    if (url.protocol !== 'https:') return null;
    if (!isAllowedProxyHost(url.hostname)) return null;
  } catch {
    return null;
  }

  return target;
}

const URI_ATTR_TAGS = /^#EXT-X-(KEY|MAP|MEDIA|I-FRAME-STREAM-INF|PART|PRELOAD-HINT|RENDITION-REPORT)/;

export function rewritePlaylist(playlist: string, playlistUrl: string): string {
  return playlist
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        if (!URI_ATTR_TAGS.test(trimmed)) return line;
        return line.replace(/URI="([^"]+)"/g, (_, uri: string) => {
          return `URI="${proxyUrl(new URL(uri, playlistUrl).href)}"`;
        });
      }

      return proxyUrl(new URL(trimmed, playlistUrl).href);
    })
    .join('\n');
}

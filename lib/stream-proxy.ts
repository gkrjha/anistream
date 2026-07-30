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

function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeB64url(input: string): string {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function sign(url: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(url));
  let binary = '';
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function proxyUrl(target: string): Promise<string> {
  return `${PROXY_PATH}?u=${b64url(target)}&s=${await sign(target)}`;
}

export async function verifyProxyUrl(encoded: string, signature: string): Promise<string | null> {
  let target: string;
  try {
    target = decodeB64url(encoded);
  } catch {
    return null;
  }

  let expected: string;
  try {
    expected = await sign(target);
  } catch {
    return null;
  }
  if (expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

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

export async function rewritePlaylist(playlist: string, playlistUrl: string): Promise<string> {
  const lines = await Promise.all(
    playlist.split('\n').map(async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        if (!URI_ATTR_TAGS.test(trimmed)) return line;
        const matches = [...line.matchAll(/URI="([^"]+)"/g)];
        let rewritten = line;
        for (const match of matches) {
          const uri = match[1];
          rewritten = rewritten.replace(
            `URI="${uri}"`,
            `URI="${await proxyUrl(new URL(uri, playlistUrl).href)}"`
          );
        }
        return rewritten;
      }

      return await proxyUrl(new URL(trimmed, playlistUrl).href);
    })
  );
  return lines.join('\n');
}

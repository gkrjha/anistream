import { NextRequest } from 'next/server';
import { rewritePlaylist, UPSTREAM_REFERER, verifyProxyUrl } from '@/lib/stream-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const PLAYLIST_TYPES = ['mpegurl', 'x-mpegurl'];

function isPlaylist(target: string, contentType: string): boolean {
  if (new URL(target).pathname.endsWith('.m3u8')) return true;
  return PLAYLIST_TYPES.some((t) => contentType.includes(t));
}

export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get('u');
  const signature = req.nextUrl.searchParams.get('s');
  if (!encoded || !signature) return new Response('Missing parameters', { status: 400 });

  const target = await verifyProxyUrl(encoded, signature);
  if (!target) return new Response('Invalid signature', { status: 403 });

  const headers: Record<string, string> = {
    Referer: UPSTREAM_REFERER,
    Origin: UPSTREAM_REFERER.replace(/\/$/, ''),
    'User-Agent': UA,
    Accept: '*/*',
  };
  const range = req.headers.get('range');
  if (range) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers, signal: AbortSignal.timeout(20000) });
  } catch {
    return new Response('Upstream unreachable', { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Upstream error', { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') ?? '';

  if (isPlaylist(target, contentType)) {
    const body = await rewritePlaylist(await upstream.text(), upstream.url || target);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    });
  }

  // The CDN serves subtitles as octet-stream, which <track> refuses to render.
  const isVtt = new URL(target).pathname.endsWith('.vtt');
  const acceptRanges = upstream.headers.get('accept-ranges');
  const contentRange = upstream.headers.get('content-range');

  const responseHeaders = new Headers({
    'Content-Type': isVtt ? 'text/vtt; charset=utf-8' : contentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=3600',
  });
  if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);
  else if (contentRange || upstream.status === 206) responseHeaders.set('Accept-Ranges', 'bytes');

  for (const key of ['content-length', 'content-range']) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

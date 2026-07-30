import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeSources } from '@/lib/megaplay';
import { proxyUrl } from '@/lib/stream-proxy';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const anilistIdRaw = req.nextUrl.searchParams.get('anilistId');
  const malIdRaw = req.nextUrl.searchParams.get('malId');
  const anilistId = anilistIdRaw ? Number(anilistIdRaw) : null;
  const malId = malIdRaw ? Number(malIdRaw) : null;
  const episode = Number(req.nextUrl.searchParams.get('ep') || '1');
  const lang = req.nextUrl.searchParams.get('lang') === 'dub' ? 'dub' : 'sub';

  const hasAni = Number.isFinite(anilistId) && (anilistId as number) > 0;
  const hasMal = Number.isFinite(malId) && (malId as number) > 0;
  if (!hasAni && !hasMal) {
    return NextResponse.json({ error: 'anilistId or malId required' }, { status: 400 });
  }
  if (!Number.isFinite(episode) || episode <= 0) {
    return NextResponse.json({ error: 'invalid episode' }, { status: 400 });
  }

  try {
    const sources = await getEpisodeSources({
      anilistId: hasAni ? anilistId : null,
      malId: hasMal ? malId : null,
      episode,
      lang,
    });
    if (!sources) {
      return NextResponse.json({ error: `Episode ${episode} (${lang}) not available` }, { status: 404 });
    }

    return NextResponse.json({
      src: proxyUrl(sources.file),
      tracks: sources.tracks.map((t) => ({
        src: proxyUrl(t.file),
        label: t.label,
        default: Boolean(t.default),
      })),
      intro: sources.intro ?? null,
      outro: sources.outro ?? null,
      usedLang: sources.usedLang,
      requestedLang: lang,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resolve stream';
    console.error('[anime/sources]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

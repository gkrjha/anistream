import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const ANIWATCH = process.env.ANIWATCH_API_URL || 'https://aniwatch-api-brown-six.vercel.app';
const FAKE_ORIGIN = 'https://hianime.to';

function aw(url: string) {
  return fetch(url, {
    headers: {
      Origin: FAKE_ORIGIN,
      Referer: `${FAKE_ORIGIN}/`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });
}

async function getSlug(title: string): Promise<string | null> {
  try {
    const res = await aw(`${ANIWATCH}/api/v2/hianime/search/suggestion?q=${encodeURIComponent(title)}`);
    const data = await res.json();
    const list: { id: string; name: string; moreInfo?: string[] }[] = data?.data?.suggestions ?? [];
    if (!list.length) return null;
    const tl = title.toLowerCase();
    return (
      list.find((s) => s.name.toLowerCase() === tl && s.moreInfo?.includes('TV'))?.id ||
      list.find((s) => s.moreInfo?.includes('TV'))?.id ||
      list[0].id
    );
  } catch { return null; }
}

async function getEpisodeId(slug: string, epNum: number): Promise<string | null> {
  try {
    const res = await aw(`${ANIWATCH}/api/v2/hianime/anime/${slug}/episodes`);
    const data = await res.json();
    const eps: { episodeId: string; number: number }[] = data?.data?.episodes ?? [];
    return eps.find((e) => e.number === epNum)?.episodeId ?? null;
  } catch { return null; }
}

async function getSources(episodeId: string, lang: string) {
  const category = lang === 'dub' ? 'dub' : 'sub';
  for (const server of ['hd-2', 'hd-1']) {
    try {
      const res = await aw(
        `${ANIWATCH}/api/v2/hianime/episode/sources?animeEpisodeId=${encodeURIComponent(episodeId)}&server=${server}&category=${category}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.data?.sources?.length) return data.data;
    } catch { continue; }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const ep = Number(req.nextUrl.searchParams.get('ep') || '1');
  const lang = req.nextUrl.searchParams.get('lang') || 'sub';
  const title = req.nextUrl.searchParams.get('title') || '';

  if (!title) return Response.json({ error: 'title required' }, { status: 400 });

  try {
    const slug = await getSlug(title);
    if (!slug) return Response.json({ error: `Not found: ${title}` }, { status: 404 });

    const episodeId = await getEpisodeId(slug, ep);
    if (!episodeId) return Response.json({ error: `Episode ${ep} not found` }, { status: 404 });

    const sources = await getSources(episodeId, lang);
    if (!sources) return Response.json({ error: 'No sources found' }, { status: 404 });

    return Response.json(sources);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

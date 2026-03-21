import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Point this to your own Consumet instance (deploy free on Vercel/Railway)
// See: https://github.com/consumet/api.consumet.org
const CONSUMET_BASE = process.env.CONSUMET_API_URL || 'https://consumet-api-self.vercel.app';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const ep = req.nextUrl.searchParams.get('ep') || '1';
  const lang = req.nextUrl.searchParams.get('lang') || 'sub';

  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const episodeId = `${id}-episode-${ep}`;

  try {
    const url = `${CONSUMET_BASE}/meta/anilist/watch/${encodeURIComponent(episodeId)}?subOrDub=${lang}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json({ error: `Provider returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    if (!data?.sources?.length) {
      return Response.json({ error: 'No sources found' }, { status: 404 });
    }

    return Response.json(data);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

import { cached } from '@/lib/redis';
import { UPSTREAM_REFERER } from '@/lib/stream-proxy';

const BASE = 'https://megaplay.buzz';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/** Keep under Vercel hobby's ~10s function budget (scrape + getSources). */
const FETCH_MS = 7000;

export interface SubtitleTrack {
  file: string;
  label: string;
  kind: string;
  default?: boolean;
}

export interface EpisodeSources {
  file: string;
  tracks: SubtitleTrack[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  usedLang: 'sub' | 'dub';
}

interface RawSources {
  sources?: { file?: string };
  tracks?: SubtitleTrack[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

interface ResolveOpts {
  anilistId?: number | null;
  malId?: number | null;
  episode: number;
  lang: 'sub' | 'dub';
}

async function scrapeFileId(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Referer: BASE, 'User-Agent': UA },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) return null;
    return (await res.text()).match(/data-id="(\d+)"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Cache wrapper so null (not found) is stored and re-served. */
async function cachedId(key: string, fn: () => Promise<string | null>): Promise<string | null> {
  const wrapped = await cached<{ id: string | null }>(
    key,
    async () => ({ id: await fn() }),
    6 * 3600
  );
  return wrapped.id;
}

/**
 * Race AniList + MAL lookups — first hit wins. Avoids serial 7s+7s stalls
 * when one ID is missing on MegaPlay (common on Vercel’s short timeouts).
 */
async function resolveFileId(opts: ResolveOpts): Promise<string | null> {
  const { anilistId, malId, episode, lang } = opts;
  const tasks: Promise<string | null>[] = [];

  if (anilistId && anilistId > 0) {
    tasks.push(
      cachedId(`megaplay:ani:${anilistId}:${episode}:${lang}`, () =>
        scrapeFileId(`/stream/ani/${anilistId}/${episode}/${lang}`)
      )
    );
  }

  if (malId && malId > 0) {
    tasks.push(
      cachedId(`megaplay:mal:${malId}:${episode}:${lang}`, () =>
        scrapeFileId(`/stream/mal/${malId}/${episode}/${lang}`)
      )
    );
  }

  if (!tasks.length) return null;

  return new Promise((resolve) => {
    let pending = tasks.length;
    let settled = false;

    for (const task of tasks) {
      task.then((id) => {
        if (settled) return;
        if (id) {
          settled = true;
          resolve(id);
          return;
        }
        pending -= 1;
        if (pending === 0) resolve(null);
      }).catch(() => {
        if (settled) return;
        pending -= 1;
        if (pending === 0) resolve(null);
      });
    }
  });
}

async function fetchSources(fileId: string, lang: 'sub' | 'dub'): Promise<EpisodeSources | null> {
  // CDN URLs are short-lived — never cache getSources payloads
  try {
    const res = await fetch(`${BASE}/stream/getSources?id=${fileId}&type=${lang}`, {
      headers: { Referer: UPSTREAM_REFERER, 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': UA },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as RawSources;
    const file = data?.sources?.file;
    if (!file) return null;

    return {
      file,
      tracks: (data.tracks ?? []).filter((t) => t.kind === 'captions' && t.file),
      intro: data.intro?.end ? data.intro : undefined,
      outro: data.outro?.end ? data.outro : undefined,
      usedLang: lang,
    };
  } catch {
    return null;
  }
}

export async function getEpisodeSources(
  opts: ResolveOpts
): Promise<EpisodeSources | null> {
  const requested = opts.lang;
  const fileId = await resolveFileId({ ...opts, lang: requested });
  if (fileId) {
    const sources = await fetchSources(fileId, requested);
    if (sources) return sources;
  }

  // Dub unavailable → fall back to Japanese + English subs
  if (requested === 'dub') {
    const subId = await resolveFileId({ ...opts, lang: 'sub' });
    if (!subId) return null;
    return fetchSources(subId, 'sub');
  }

  return null;
}

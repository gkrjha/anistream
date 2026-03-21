import { NextRequest, NextResponse } from 'next/server';
import { getAnimeList } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get('page') || 1);
  const genre = searchParams.get('genre') || '';
  const format = searchParams.get('format') || ''; // TV, MOVIE, OVA, ONA, SPECIAL
  const status = searchParams.get('status') || ''; // RELEASING, FINISHED, NOT_YET_RELEASED

  const data = await getAnimeList(page, genre, format, status);
  return NextResponse.json(data);
}

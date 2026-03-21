import { NextRequest, NextResponse } from 'next/server';
import { getSeries } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get('page') || 1);
  const genre = searchParams.get('genre') || '';
  const sort = searchParams.get('sort') || 'popularity.desc';
  const language = searchParams.get('language') || '';

  const data = await getSeries(page, genre, sort, language);
  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { getMovies } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get('page') || 1);
  const genre = searchParams.get('genre') || '';
  const sort = searchParams.get('sort') || 'popularity.desc';

  const data = await getMovies(page, genre, sort);
  return NextResponse.json(data);
}

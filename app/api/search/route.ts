import { NextRequest, NextResponse } from 'next/server';
import { searchAll } from '@/lib/api';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || '';
  if (!query.trim()) return NextResponse.json({ items: [] });

  const items = await searchAll(query);
  return NextResponse.json({ items });
}

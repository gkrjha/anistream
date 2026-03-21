import type { Metadata } from 'next';
import AnimePageClient from './client';

export const metadata: Metadata = {
  title: 'Anime — Watch Free on AniStream',
  description: 'Browse and stream thousands of anime series and movies free in HD. Filter by genre, format, and status.',
  openGraph: { title: 'Anime — AniStream', description: 'Watch anime free in HD. No signup required.' },
  twitter: { card: 'summary_large_image' },
};

export default function AnimePage() {
  return <AnimePageClient />;
}

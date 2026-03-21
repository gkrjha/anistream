import type { Metadata } from 'next';
import MoviesPageClient from './client';

export const metadata: Metadata = {
  title: 'Movies — Watch Free on AniStream',
  description: 'Stream popular and top-rated movies free in HD. Browse by genre — action, comedy, horror, sci-fi and more.',
  openGraph: { title: 'Movies — AniStream', description: 'Watch movies free in HD. No signup required.' },
  twitter: { card: 'summary_large_image' },
};

export default function MoviesPage() {
  return <MoviesPageClient />;
}

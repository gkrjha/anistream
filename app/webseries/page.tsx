import type { Metadata } from 'next';
import WebSeriesPageClient from './client';

export const metadata: Metadata = {
  title: 'Web Series — Watch Free on AniStream',
  description: 'Stream popular web series and TV shows free in HD. Browse by genre — drama, crime, sci-fi and more.',
  openGraph: { title: 'Web Series — AniStream', description: 'Watch web series free in HD. No signup required.' },
  twitter: { card: 'summary_large_image' },
};

export default function WebSeriesPage() {
  return <WebSeriesPageClient />;
}

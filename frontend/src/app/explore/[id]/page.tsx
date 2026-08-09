import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import RedirectToExplore from './RedirectToExplore';

type Props = {
  params: Promise<{ id: string }>;
};

// Next.js config for fetching from backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getEntry(id: string) {
  try {
    const res = await fetch(`${API_URL}/entries/public/${id}`, { cache: 'no-store' });
    if (!res.ok) {
      console.error('getEntry failed:', res.status, res.statusText);
      try { console.error(await res.text()); } catch(e) {}
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('getEntry threw error:', err);
    return null;
  }
}

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params;
  const id = params.id;
  const entry = await getEntry(id);

  if (!entry) {
    return {
      title: 'Entry Not Found - DailyDiary',
    };
  }

  // Strip HTML from body for description
  const plainTextBody = entry.body.replace(/<[^>]+>/g, '').substring(0, 150) + (entry.body.length > 150 ? '...' : '');
  const authorName = entry.user?.name || 'Someone';

  return {
    title: `${authorName}'s Reflection - DailyDiary`,
    description: plainTextBody || 'Check out this reflection on DailyDiary.',
    openGraph: {
      title: `${authorName}'s Reflection - DailyDiary`,
      description: plainTextBody || 'Check out this reflection on DailyDiary.',
      url: `/explore/${id}`,
      images: entry.images?.length > 0 ? [{ url: entry.images[0].url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${authorName}'s Reflection - DailyDiary`,
      description: plainTextBody || 'Check out this reflection on DailyDiary.',
      images: entry.images?.length > 0 ? [entry.images[0].url] : [],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const id = params.id;
  // We still fetch the entry to log it, but we don't block the redirect
  await getEntry(id);

  // Render the client component that will redirect real users to the feed
  return <RedirectToExplore id={id} />;
}

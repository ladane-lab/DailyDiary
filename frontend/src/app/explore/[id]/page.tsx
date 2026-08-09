import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import ExplorePage from '../page'; // We can just render the explore page, or a specific single entry view.

type Props = {
  params: Promise<{ id: string }>;
};

// Next.js config for fetching from backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getEntry(id: string) {
  try {
    const res = await fetch(`${API_URL}/entries/public/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
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
  const entry = await getEntry(id);

  if (!entry) {
    notFound();
  }

  // We want to open the specific post. The easiest way is to render the ExplorePage 
  // but maybe pass a prop? Wait, the user said "when someone click on that shared link that perticular post should be open but it is opening like that fix this also"
  // Image 2 shows a 404 page! 
  // We can just redirect them to `/explore?entryId=${id}` or we can render a custom page for the single entry.
  // Wait! A custom page for a single entry would require building a whole component.
  // If we just render a simple client component that redirects to explore and opens a modal?
  // Or we can just build a simple read-only view of the entry?
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>{entry.user?.name}'s Reflection</h1>
      <p style={{ color: '#666' }}>{new Date(entry.createdAt).toLocaleDateString()}</p>
      
      <div 
        style={{ marginTop: '20px', fontSize: '18px', lineHeight: '1.6' }}
        dangerouslySetInnerHTML={{ __html: entry.body }} 
      />

      {entry.images && entry.images.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          {entry.images.map((img: any) => (
            <img key={img.id} src={img.url} alt="entry attachment" style={{ maxWidth: '100%', borderRadius: '8px' }} />
          ))}
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <a href="/explore" style={{ color: '#0070f3', textDecoration: 'none', fontWeight: 'bold' }}>
          &larr; Back to Explore
        </a>
      </div>
    </div>
  );
}

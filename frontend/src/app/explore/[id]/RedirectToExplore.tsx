'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToExplore({ id }: { id: string }) {
  const router = useRouter();
  
  useEffect(() => {
    // Client-side redirect ensures bots (like WhatsApp, Twitter) still read the HTML meta tags
    // but actual users get sent to the explore page with the entry focused.
    router.replace(`/explore?entryId=${id}`);
  }, [id, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>
      Redirecting to post...
    </div>
  );
}

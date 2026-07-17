"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { 
  CalendarDays, Clock,
  Heart, Zap, Sparkles, BookHeart,
  Share2, Bookmark, User as UserIcon, ArrowLeft
} from "lucide-react";
import styles from "./saved.module.css";

interface ExploreEntry {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  template?: { name: string };
  user?: { name: string; photoURL?: string | null };
  images?: { id: string; url: string }[];
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowing: boolean;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
}

const getReadTime = (htmlContent: string): string => {
  if (!htmlContent) return "1m read";
  const text = htmlContent.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes}m read`;
};

export default function SavedPostsPage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [entries, setEntries] = useState<ExploreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  useEffect(() => { const unsub = initAuth(); return unsub; }, [initAuth]);

  const fetchSavedEntries = async (pageNum = 1, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user?.getIdToken();
      const res = await fetch(`${API}/api/entries/saved?page=${pageNum}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setEntries(data.entries);
        } else {
          setEntries(prev => [...prev, ...data.entries]);
        }
        setHasMore(data.hasMore);
        setPage(data.page);
      }
    } catch (err) {
      console.error("Failed to load saved entries:", err);
      setError("Failed to connect to the feed. Please check your connection.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (initialized && user) {
      fetchSavedEntries(1, true);
    }
  }, [initialized, user]);

  const handleLike = async (entryId: string) => {
    if (!user) return;
    const update = (prev: ExploreEntry[]) => prev.map(e => (e.id === entryId ? { ...e, isLiked: !e.isLiked, likesCount: e.isLiked ? e.likesCount - 1 : e.likesCount + 1 } : e));
    setEntries(update);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      await fetch(`${API}/api/entries/${entryId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchSavedEntries(1, true); }
  };

  const handleBookmark = async (entryId: string) => {
    if (!user) return;
    const update = (prev: ExploreEntry[]) => prev.filter(e => e.id !== entryId);
    setEntries(update);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      await fetch(`${API}/api/entries/${entryId}/bookmark`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchSavedEntries(1, true); }
  };

  const handleSubscribe = async (targetUserId: string) => {
    if (!user) return;
    const update = (prev: ExploreEntry[]) => prev.map(e => (e.userId === targetUserId ? { ...e, isFollowing: !e.isFollowing } : e));
    setEntries(update);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      await fetch(`${API}/api/users/${targetUserId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchSavedEntries(1, true); }
  };

  const handleShare = (entryId: string) => {
    const url = `${window.location.origin}/explore/${entryId}`;
    if (navigator.share) navigator.share({ title: 'DailyDiary Entry', text: 'Check out this reflection on DailyDiary!', url }).catch(() => {});
    else { navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); }
  };

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  const loadingMoreRef = useRef(loadingMore);
  const hasMoreRef = useRef(hasMore);
  const pageRef = useRef(page);
  loadingMoreRef.current = loadingMore;
  hasMoreRef.current = hasMore;
  pageRef.current = page;

  useEffect(() => {
    if (loading || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMoreRef.current && hasMoreRef.current) {
        fetchSavedEntries(pageRef.current + 1);
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, hasMore]);

  if (!initialized || !user) return <div className={styles.loadingPage}><div className={styles.loadingSpin} /><p>Verifying session...</p></div>;
  
  const currentLoading = loading && entries.length === 0;

  return (
    <div className={styles.page}>
      <main className={`${styles.main} animate-page-reveal`} style={{ paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '0px', marginBottom: '20px' }}>
          <button onClick={() => router.push("/settings")} className={styles.toolBtn} style={{ border: '1px solid var(--border)', borderRadius: '50%' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bookmark size={20} /> Saved Posts
          </h1>
        </div>

        <div className={styles.contentLayout}>
          <div className={styles.feedSection}>
            {currentLoading ? (
              <div className={styles.feedContainer}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`skeleton ${styles.feedCard}`} style={{ height: '300px', width: '100%' }} />
                ))}
              </div>
            ) : error ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} style={{ color: 'var(--accent-red, #ff4d4d)' }}>⚠️</div>
                <h2>Connection Error</h2>
                <p>{error}</p>
                <button onClick={() => { setError(null); fetchSavedEntries(1, true); }} className={styles.postBtn} style={{ marginTop: '1rem' }}>Try Again</button>
              </div>
            ) : entries.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔖</div>
                <h2>No saved posts yet</h2>
                <p>When you bookmark a public reflection in the Explore feed, it will appear here.</p>
                <button onClick={() => router.push("/explore")} className={styles.postBtn} style={{ marginTop: '1rem' }}>Discover Posts</button>
              </div>
            ) : (
              <div className={styles.feedContainer}>
                {entries.map((entry, index) => {
                  const isOwner = entry.userId === user.uid;
                  const authorName = entry.user?.name || "Anonymous";
                  const date = new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                  return (
                    <div 
                      key={entry.id} 
                      className={styles.feedItem} 
                      style={{ animationDelay: `${(index % 10) * 0.1}s` }}
                    >
                      <article className={styles.feedCard}>
                        <div className={styles.feedHeader}>
                          {entry.user?.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.user.photoURL} alt={authorName} className={styles.authorAvatarImage} />
                          ) : (
                            <div className={styles.authorAvatar}>{authorName[0].toUpperCase()}</div>
                          )}
                          <div className={styles.authorInfo}>
                            <div className="flex items-center gap-3">
                              <div className={styles.authorName}>{authorName}</div>
                              {!isOwner && (
                                <button 
                                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${entry.isFollowing ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'}`}
                                  onClick={() => handleSubscribe(entry.userId)}
                                >
                                  {entry.isFollowing ? "Subscribed" : "+ Subscribe"}
                                </button>
                              )}
                            </div>
                            <div className={styles.feedMeta}>
                              <div className={styles.metaItem}><CalendarDays size={14} /> {date}</div>
                              <div className="w-1 h-1 rounded-full bg-gray-300" />
                              <div className={styles.metaItem}><Clock size={14} /> {getReadTime(entry.body)}</div>
                            </div>
                          </div>
                        </div>

                        <div className={`${styles.feedBody} ${styles.tiptapContent}`} dangerouslySetInnerHTML={{ __html: entry.body }} />

                        {entry.images && entry.images.length > 0 && (
                          <div className={styles.feedImages}>{entry.images.map((img: any) => <img key={img.id} src={img.url} alt="Media" className={styles.feedImage} />)}</div>
                        )}

                        <div className={styles.feedActions}>
                          <button className={`${styles.actionBtn} ${entry.isLiked ? styles.active : ""}`} onClick={() => handleLike(entry.id)}>
                            <Heart size={20} fill={entry.isLiked ? "currentColor" : "none"} /> <span>{entry.likesCount || ""} Like</span>
                          </button>
                          <button className={`${styles.actionBtn} ${entry.isBookmarked ? styles.active : ""}`} onClick={() => handleBookmark(entry.id)}>
                            <Bookmark size={20} fill={entry.isBookmarked ? "currentColor" : "none"} /> <span>{entry.bookmarksCount || ""} Save</span>
                          </button>
                          <div className="flex-1" />
                          <button className={styles.actionBtn} onClick={() => handleShare(entry.id)}><Share2 size={20} /></button>
                        </div>
                      </article>
                    </div>
                  );
                })}
                
                {hasMore && (
                  <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                    {loadingMore ? (
                      <div className={styles.loadingSpinSmall} />
                    ) : (
                      <span className="text-muted text-sm italic">Scrolling for more...</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className={styles.sidebar}>
            <div className={`glass-card ${styles.sidebarCard}`} style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔖 Saved Posts
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                These are the reflections you've bookmarked from the Explore feed. Revisit them anytime to find inspiration and continue supporting the authors.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { 
  Globe, BookOpen, LayoutDashboard, PenLine, CalendarDays, Trophy, 
  Medal, Settings, LogOut, Heart, Zap, Sparkles, BookHeart 
} from "lucide-react";
import styles from "./explore.module.css";

interface ExploreEntry {
  id: string;
  body: string;
  createdAt: string;
  template?: { name: string };
  user?: { name: string };
  images?: { id: string; url: string }[];
}

const getTemplateIcon = (name: string) => {
  if (name.includes("Gratitude")) return <Heart size={16} strokeWidth={2.5} />;
  if (name.includes("Productivity")) return <Zap size={16} strokeWidth={2.5} />;
  if (name.includes("Care")) return <Sparkles size={16} strokeWidth={2.5} />;
  return <BookHeart size={16} strokeWidth={2.5} />;
};

export default function ExplorePage() {
  const router = useRouter();
  const { user, initialized, initAuth, logout } = useAuthStore();
  const [entries, setEntries] = useState<ExploreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const unsub = initAuth(); return unsub; }, [initAuth]);
  useEffect(() => { if (initialized && !user) router.push("/login"); }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    const fetchPublicEntries = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API}/api/entries/public`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch (err) {
        console.error("Failed to load public entries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicEntries();
  }, [user]);

  if (!initialized || !user) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpin} />
        <p>Loading explore feed...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Main Content ── */}
      <main className={`${styles.main} animate-page-reveal`}>
        <div className={styles.mobileLogo}>
          <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
        </div>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={36} color="var(--primary)" strokeWidth={2.5} /> Community Explore
            </h1>
            <p className={styles.subtitle}>Read public reflections from writers around the world.</p>
          </div>
          <a href="/write" className="btn btn-primary" style={{ gap: "8px" }}>
            <PenLine size={18} /> New Entry
          </a>
        </header>

        {loading ? (
          <div className={styles.masonryGrid}>
            {[1,2,3,4].map((i) => <div key={i} className={`skeleton ${styles.skeletonCard}`} />)}
          </div>
        ) : entries.length === 0 ? (
          <div className={`glass-card ${styles.emptyState}`}>
            <Globe size={48} className={styles.emptyIcon} color="var(--primary)" />
            <h3>No public entries yet</h3>
            <p>Be the first to share your thoughts with the community!</p>
            <a href="/write" className="btn btn-primary" style={{ marginTop: "16px", gap: "8px" }}>
              <PenLine size={18} /> Write Public Entry
            </a>
          </div>
        ) : (
          <div className={styles.masonryGrid}>
            {entries.map((entry) => {
              const tpl = entry.template?.name || "Personal Journal";
              const authorName = entry.user?.name || "Anonymous";
              const date = new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              
              return (
                <div key={entry.id} className={`glass-card ${styles.feedCard}`}>
                  {/* Author & Meta */}
                  <div className={styles.feedHeader}>
                    <div className={styles.authorAvatar}>{authorName[0].toUpperCase()}</div>
                    <div>
                      <div className={styles.authorName}>{authorName}</div>
                      <div className={styles.feedDate}>{date}</div>
                    </div>
                    <div className={styles.tplBadge}>
                      {getTemplateIcon(tpl)} {tpl}
                    </div>
                  </div>

                  {/* Body Text */}
                  <p className={styles.feedBody}>{entry.body}</p>

                  {/* Attached Images */}
                  {entry.images && entry.images.length > 0 && (
                    <div className={styles.feedImages}>
                      {entry.images.map((img) => (
                        <div key={img.id} className={styles.feedImageWrapper}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="Journal Attachment" className={styles.feedImage} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

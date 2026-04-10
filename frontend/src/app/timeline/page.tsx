"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import styles from "./timeline.module.css";

interface EntryItem {
  id: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  template?: { name: string };
  responses?: { fieldLabel: string; value: string }[];
}

import { 
  Heart, Zap, Sparkles, BookHeart, BookOpen, LayoutDashboard, 
  PenLine, CalendarDays, Trophy, Medal, Settings, Globe 
} from "lucide-react";

const getTemplateIcon = (name: string, size = 18) => {
  if (name.includes("Gratitude")) return <Heart size={size} strokeWidth={2.5} color="var(--danger)" />;
  if (name.includes("Productivity")) return <Zap size={size} strokeWidth={2.5} color="var(--streak)" />;
  if (name.includes("Care")) return <Sparkles size={size} strokeWidth={2.5} color="var(--primary)" />;
  return <BookHeart size={size} strokeWidth={2.5} color="var(--primary)" />;
};

function getMoodFromResponses(responses?: { fieldLabel: string; value: string }[]) {
  if (!responses) return null;
  const moodField = responses.find(
    (r) => r.fieldLabel.toLowerCase().includes("mood") || r.fieldLabel.toLowerCase().includes("feeling")
  );
  return moodField?.value || null;
}

export default function TimelinePage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, [initAuth]);

  useEffect(() => {
    if (initialized && !user) router.push("/login");
  }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API}/api/entries?page=${page}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEntries((prev) => page === 1 ? data.entries : [...prev, ...data.entries]);
          setTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch entries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [user, page]);

  if (!initialized || !user) return null;

  const groupedByDate = groupByDate(entries);

  return (
    <div className={styles.page}>
      {/* ── Sidebar identical nav ── */}
      <aside className={styles.sidebar}>
        <a href="/" className={styles.sidebarLogo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
        </a>
        <nav className={styles.sidebarNav}>
          <a href="/dashboard" className={styles.navItem}><LayoutDashboard size={18} /> Dashboard</a>
          <a href="/write"     className={styles.navItem}><PenLine size={18} /> Write Entry</a>
          <a href="/timeline"  className={`${styles.navItem} ${styles.navActive}`}><CalendarDays size={18} /> Timeline</a>
          <a href="/challenges" className={styles.navItem}><Trophy size={18} /> Challenges</a>
          <a href="/badges"    className={styles.navItem}><Medal size={18} /> Badges</a>
          <a href="/settings"  className={styles.navItem}><Settings size={18} /> Settings</a>
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className={`${styles.main} animate-page-reveal`}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={32} color="var(--primary)" strokeWidth={2.5} /> Your Timeline
            </h1>
            <p className={styles.subtitle}>{total} {total === 1 ? "entry" : "entries"} recorded</p>
          </div>
          <a href="/write" className="btn btn-primary" style={{ gap: '8px' }}>
            <PenLine size={18} /> Write Today
          </a>
        </header>

        {loading && entries.length === 0 ? (
          <div className={styles.loadingGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className={`glass-card ${styles.emptyState}`}>
            <BookOpen size={48} color="var(--primary)" strokeWidth={2} />
            <h3>No entries yet</h3>
            <p>Start journaling to see your timeline grow.</p>
            <a href="/write" className="btn btn-primary" style={{ marginTop: 16, gap: '8px' }}>
              <PenLine size={18} /> Write First Entry
            </a>
          </div>
        ) : (
          <div className={styles.timeline}>
            {Object.entries(groupedByDate).map(([date, dayEntries]) => (
              <div key={date} className={styles.dayGroup}>
                <div className={styles.dateLabel}>
                  <span className={styles.dateDot} />
                  {formatDayLabel(date)}
                </div>
                <div className={styles.entryCards}>
                  {dayEntries.map((entry) => {
                    const mood = getMoodFromResponses(entry.responses);
                    const tplName = entry.template?.name || "Personal Journal";
                    return (
                      <div key={entry.id} className={`glass-card ${styles.entryCard}`}>
                        <div className={styles.entryMeta}>
                          <span className={styles.entryEmoji} style={{ display: 'flex', alignItems: 'center' }}>
                            {getTemplateIcon(tplName)}
                          </span>
                          <div>
                            <span className={styles.entryTemplate}>{tplName}</span>
                            <span className={styles.entryTime}>
                              {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {mood && <span className={styles.moodBadge}>{mood}</span>}
                          {entry.isPublic && (
                            <span className={styles.publicBadge} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Globe size={14} /> Public
                            </span>
                          )}
                        </div>
                        <p className={styles.entryPreview}>
                          {entry.body?.slice(0, 150)}
                          {entry.body?.length > 150 ? "..." : ""}
                        </p>
                        {entry.responses && entry.responses.length > 0 && (
                          <div className={styles.responsePills}>
                            {entry.responses.slice(0, 3).map((r) => (
                              <span key={r.fieldLabel} className={styles.pill}>
                                <strong>{r.fieldLabel}:</strong> {r.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {entries.length < total && (
              <button
                className={`btn btn-secondary ${styles.loadMore}`}
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function groupByDate(entries: EntryItem[]): Record<string, EntryItem[]> {
  return entries.reduce<Record<string, EntryItem[]>>((acc, entry) => {
    const date = new Date(entry.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import styles from "./timeline.module.css";
import DiaryBook, { DiaryTheme } from "@/components/DiaryBook/DiaryBook";

interface EntryItem {
  id: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  template?: { name: string };
  theme?: string;
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

  const groupedByTemplate = groupByTemplate(entries);

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
              <CalendarDays size={32} color="var(--primary)" strokeWidth={2.5} /> Your Journals
            </h1>
            <p className={styles.subtitle}>{total} total entries across your library</p>
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
            <h3>Your library is empty</h3>
            <p>Start journaling to create your first book.</p>
            <a href="/write" className="btn btn-primary" style={{ marginTop: 16, gap: '8px' }}>
              <PenLine size={18} /> Write First Entry
            </a>
          </div>
        ) : (
          <div className={styles.timeline}>
            <div className={styles.entryGrid}>
              {Object.entries(groupedByTemplate).map(([templateName, templateEntries]) => {
                const representativeTheme = templateEntries.slice().reverse().find(e => e.theme)?.theme;
                const theme: DiaryTheme = (representativeTheme as DiaryTheme) || getThemeForTemplate(templateName);
                return (
                  <DiaryBook 
                    key={templateName} 
                    entries={templateEntries} 
                    theme={theme} 
                  />
                );
              })}
            </div>

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

function groupByTemplate(entries: EntryItem[]): Record<string, EntryItem[]> {
  const groups = entries.reduce<Record<string, EntryItem[]>>((acc, entry) => {
    const tpl = entry.template?.name || "Personal Journal";
    if (!acc[tpl]) acc[tpl] = [];
    acc[tpl].push(entry);
    return acc;
  }, {});

  // Sort entries within each group by date ascending (Oldest -> Newest)
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  return groups;
}

function getThemeForTemplate(name: string): DiaryTheme {
  const n = name.toLowerCase();
  if (n.includes("gratitude")) return 'cute';
  if (n.includes("productivity")) return 'marble';
  if (n.includes("care")) return 'cute';
  if (n.includes("finance")) return 'minimal';
  if (n.includes("management")) return 'professional';
  if (n.includes("yearly") || n.includes("vintage")) return 'vintage';
  return 'marble';
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

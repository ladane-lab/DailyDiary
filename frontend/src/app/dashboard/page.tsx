"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import Sidebar from "@/components/Sidebar/Sidebar";
import Logo from "@/components/Logo/Logo";
import { 
  Flame, BookOpen, Trophy, Medal, PenLine, Heart, Zap, Sparkles, BookHeart 
} from "lucide-react";
import styles from "./dashboard.module.css";

interface Stats {
  streak: number;
  totalEntries: number;
  activeChallenges: number;
  badges: number;
}

interface RecentEntry {
  id: string;
  body: string;
  createdAt: string;
  template?: { name: string };
}

const getTemplateIcon = (name: string) => {
  if (name.includes("Gratitude")) return <Heart size={20} strokeWidth={2.5} />;
  if (name.includes("Productivity")) return <Zap size={20} strokeWidth={2.5} />;
  if (name.includes("Care")) return <Sparkles size={20} strokeWidth={2.5} />;
  return <BookHeart size={20} strokeWidth={2.5} />;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats>({ streak: 0, totalEntries: 0, activeChallenges: 0, badges: 0 });
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const unsub = initAuth();
    return unsub;
  }, [initAuth]);

  useEffect(() => {
    if (initialized && !user) router.push("/login");
  }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [userRes, entriesRes, challengesRes] = await Promise.all([
          fetch(`${API}/api/users/me`, { headers }),
          fetch(`${API}/api/entries?limit=20`, { headers }),
          fetch(`${API}/api/challenges/my`, { headers }),
        ]);

        if (userRes.ok) {
          const u = await userRes.json();
          setStats((prev) => ({
            ...prev,
            streak: u.streakCount ?? 0,
            badges: (u.userBadges ?? []).length,
          }));
        }
        if (entriesRes.ok) {
          const e = await entriesRes.json();
          // Filter to show only the latest entry for each unique journal type
          const uniqueJournals: RecentEntry[] = [];
          const seen = new Set();
          for (const entry of (e.entries ?? [])) {
            const tplName = entry.template?.name || "Personal Journal";
            if (!seen.has(tplName)) {
              seen.add(tplName);
              uniqueJournals.push(entry);
            }
            if (uniqueJournals.length >= 3) break;
          }
          setRecent(uniqueJournals);
          setStats((prev) => ({ ...prev, totalEntries: e.total ?? 0 }));
        }
        if (challengesRes.ok) {
          const c = await challengesRes.json();
          setStats((prev) => ({
            ...prev,
            activeChallenges: Array.isArray(c) ? c.filter((uc: { completed: boolean }) => !uc.completed).length : 0,
          }));
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (!mounted || !initialized || !user) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpin} />
        <p>Loading your diary...</p>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "Writer";
  const greeting = getGreeting();

  const statCards = [
    { icon: <Flame size={28} color="var(--streak)" strokeWidth={2.5}/>, value: stats.streak, label: "Day Streak" },
    { icon: <BookOpen size={28} color="var(--primary)" strokeWidth={2.5}/>, value: stats.totalEntries, label: "Total Entries" },
    { icon: <Trophy size={28} color="var(--success)" strokeWidth={2.5}/>, value: stats.activeChallenges, label: "Active Challenges" },
    { icon: <Medal size={28} color="var(--primary-light)" strokeWidth={2.5}/>, value: stats.badges, label: "Badges Earned" },
  ];

  return (
    <div className={styles.dashPage}>
      {/* ── Main Content ── */}
      <main className={`${styles.main} animate-page-reveal`}>
        <div className={styles.mobileLogo} style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
          <Logo size={24} />
        </div>
        <header className={styles.header}>
          <div>
            <h1 className={styles.greeting}>
              {greeting}, <span className="text-gradient">{displayName}</span>
            </h1>
            <p className={styles.date}>{formatDate(new Date())}</p>
          </div>
          <a href="/write" className="btn btn-primary" id="write-entry-btn" style={{ gap: "8px" }}>
            <PenLine size={18} /> Write Today
          </a>
        </header>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          {statCards.map((s) => (
            <div key={s.label} className={`glass-card ${styles.statCard}`}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div>
                {statsLoading
                  ? <div className={`skeleton ${styles.statSkeleton}`} />
                  : <div className={styles.statValue}>{s.value}</div>
                }
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.quickGrid}>
            <a href="/write"                       className={`glass-card ${styles.quickCard}`}><span className={styles.quickEmoji}><PenLine size={32} color="var(--primary)" /></span><span className={styles.quickLabel}>Write Entry</span></a>
            <a href="/write?template=gratitude"    className={`glass-card ${styles.quickCard}`}><span className={styles.quickEmoji}><Heart size={32} color="var(--danger)" /></span><span className={styles.quickLabel}>Gratitude</span></a>
            <a href="/write?template=productivity" className={`glass-card ${styles.quickCard}`}><span className={styles.quickEmoji}><Zap size={32} color="var(--streak)" /></span><span className={styles.quickLabel}>Productivity</span></a>
            <a href="/challenges"                  className={`glass-card ${styles.quickCard}`}><span className={styles.quickEmoji}><Trophy size={32} color="var(--success)" /></span><span className={styles.quickLabel}>Challenges</span></a>
          </div>
        </section>

        {/* Recent Entries */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Entries</h2>
            {recent.length > 0 && <a href="/timeline" className={styles.viewAll}>View All →</a>}
          </div>

          {statsLoading ? (
            <div className={styles.recentGrid}>
              {[1,2,3].map((i) => <div key={i} className={`skeleton ${styles.skeletonEntry}`} />)}
            </div>
          ) : recent.length === 0 ? (
            <div className={`glass-card ${styles.emptyState}`}>
              <BookOpen size={48} className={styles.emptyIcon} color="var(--primary)" />
              <h3>No entries yet</h3>
              <p>Start your journaling journey by writing your first entry!</p>
              <a href="/write" className="btn btn-primary" style={{ marginTop: "16px", gap: "8px" }}>
                <PenLine size={18} /> Write Your First Entry
              </a>
            </div>
          ) : (
            <div className={styles.recentGrid}>
              {recent.map((entry) => {
                const tpl = entry.template?.name || "Personal Journal";
                return (
                  <div key={entry.id} className={`glass-card ${styles.recentCard}`}>
                    <div className={styles.recentTop}>
                      <span className={styles.recentEmoji} style={{ color: "var(--primary)" }}>{getTemplateIcon(tpl)}</span>
                      <div>
                        <div className={styles.recentTemplate}>{tpl}</div>
                        <div className={styles.recentDate}>
                          {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

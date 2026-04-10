"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "firebase/auth";
import { 
  Settings, LayoutDashboard, PenLine, CalendarDays, 
  Trophy, Medal, LogOut, Flame, BookOpen, CheckCircle2 
} from "lucide-react";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const { user, initialized, initAuth, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<{ totalEntries: number; streak: number; joinedAt: string } | null>(null);

  useEffect(() => { const u = initAuth(); return u; }, [initAuth]);
  useEffect(() => { if (initialized && !user) router.push("/login"); }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || "");
    const fetchStats = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const token = await user.getIdToken();
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalEntries: data._count?.entries ?? 0,
            streak: data.streakCount ?? 0,
            joinedAt: data.createdAt,
          });
        }
      } catch { /* silent */ }
    };
    fetchStats();
  }, [user]);

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!initialized || !user) return null;

  const avatarLetter = (user.displayName || user.email || "U")[0].toUpperCase();
  const joinDate = stats?.joinedAt
    ? new Date(stats.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className={styles.page}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <a href="/" className={styles.sidebarLogo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
        </a>
        <nav className={styles.sidebarNav}>
          <a href="/dashboard"  className={styles.navItem}><LayoutDashboard size={18} /> Dashboard</a>
          <a href="/write"      className={styles.navItem}><PenLine size={18} /> Write Entry</a>
          <a href="/timeline"   className={styles.navItem}><CalendarDays size={18} /> Timeline</a>
          <a href="/challenges" className={styles.navItem}><Trophy size={18} /> Challenges</a>
          <a href="/badges"     className={styles.navItem}><Medal size={18} /> Badges</a>
          <a href="/settings"   className={`${styles.navItem} ${styles.navActive}`}><Settings size={18} /> Settings</a>
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className={`${styles.main} animate-page-reveal`}>
        <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={32} color="var(--primary)" strokeWidth={2.5} /> Settings
        </h1>

        {/* Profile Card */}
        <div className={`glass-card ${styles.profileCard}`}>
          <div className={styles.avatar}>{avatarLetter}</div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{user.displayName || "Anonymous"}</div>
            <div className={styles.profileEmail}>{user.email}</div>
            {stats && (
              <div className={styles.profileMeta}>
                Joined {joinDate} · {stats.streak} day streak · {stats.totalEntries} entries
              </div>
            )}
          </div>
        </div>

        {/* Edit Name */}
        <div className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <form onSubmit={handleSaveName} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Display Name</label>
              <input
                type="text"
                className="input-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                id="settings-name"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className="input-field"
                value={user.email || ""}
                disabled
                style={{ opacity: 0.5, cursor: "not-allowed" }}
              />
              <span className={styles.hint}>Email cannot be changed here.</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              id="save-profile"
            >
              {saved ? <><CheckCircle2 size={16}/> Saved!</> : saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Your Stats</h2>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{stats?.streak ?? "—"}</span>
              <span className={styles.statLbl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={16} color="var(--streak)"/> Day Streak</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{stats?.totalEntries ?? "—"}</span>
              <span className={styles.statLbl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={16} color="var(--primary)"/> Total Entries</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`glass-card ${styles.section} ${styles.dangerSection}`}>
          <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Account</h2>
          <p className={styles.dangerText}>Sign out of your account on this device.</p>
          <button onClick={handleLogout} className="btn btn-danger" id="settings-logout" style={{ gap: '8px' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}

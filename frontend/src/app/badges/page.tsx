"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import styles from "./badges.module.css";

interface Badge {
  id: string;
  name: string;
  icon: string;
  condition: string;
}

interface UserBadge {
  badgeId: string;
  awardedAt: string;
  badge: Badge;
}

import { 
  PenLine, Flame, Trophy, BookOpen, LayoutDashboard, 
  CalendarDays, Medal, Settings, Award, CheckCircle2, Lock
} from "lucide-react";

// All possible badges (shown as locked if not earned)
const ALL_BADGES = [
  { name: "First Entry",         icon: <PenLine size={32} strokeWidth={2.5} color="var(--primary)" />, condition: "Write your first diary entry" },
  { name: "7 Day Streak",        icon: <Flame size={32} strokeWidth={2.5} color="var(--streak)" />, condition: "Maintain a 7-day writing streak" },
  { name: "21 Day Champion",     icon: <Trophy size={32} strokeWidth={2.5} color="var(--success)" />, condition: "Maintain a 21-day writing streak" },
  { name: "Century Writer",      icon: <Award size={32} strokeWidth={2.5} color="var(--primary)" />, condition: "Write 100 diary entries" },
  { name: "Challenge Conqueror", icon: <Medal size={32} strokeWidth={2.5} color="var(--primary)" />, condition: "Complete any challenge" },
];

export default function BadgesPage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const u = initAuth(); return u; }, [initAuth]);
  useEffect(() => { if (initialized && !user) router.push("/login"); }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      try {
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserBadges(data.userBadges || []);
          setStreak(data.streakCount || 0);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!initialized || !user) return null;

  const earnedNames = new Set(userBadges.map((ub) => ub.badge.name));
  const earnedCount = userBadges.length;

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <a href="/" className={styles.sidebarLogo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
        </a>
        <nav className={styles.sidebarNav}>
          <a href="/dashboard"  className={styles.navItem}><LayoutDashboard size={18} /> Dashboard</a>
          <a href="/write"      className={styles.navItem}><PenLine size={18} /> Write Entry</a>
          <a href="/timeline"   className={styles.navItem}><CalendarDays size={18} /> Timeline</a>
          <a href="/challenges" className={styles.navItem}><Trophy size={18} /> Challenges</a>
          <a href="/badges"     className={`${styles.navItem} ${styles.navActive}`}><Medal size={18} /> Badges</a>
          <a href="/settings"   className={styles.navItem}><Settings size={18} /> Settings</a>
        </nav>
      </aside>

      <main className={`${styles.main} animate-page-reveal`}>
        <div className={styles.mobileLogo}>
          <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
        </div>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Medal size={32} color="var(--primary)" strokeWidth={2.5} /> Trophy Room
            </h1>
            <p className={styles.subtitle}>
              {earnedCount} of {ALL_BADGES.length} badges earned
            </p>
          </div>
          <div className={styles.streakCard}>
            <span className={styles.streakFire}><Flame size={24} color="var(--streak)" strokeWidth={2.5} /></span>
            <div>
              <div className={styles.streakNum}>{streak}</div>
              <div className={styles.streakLabel}>Day Streak</div>
            </div>
          </div>
        </header>

        {/* Progress Bar */}
        <div className={`glass-card ${styles.progressCard}`}>
          <div className={styles.progressHeader}>
            <span>Badge Progress</span>
            <span className={styles.progressCount}>{earnedCount} / {ALL_BADGES.length}</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${(earnedCount / ALL_BADGES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Badges Grid */}
        {loading ? (
          <div className={styles.badgeGrid}>
            {[1,2,3,4,5].map((i) => <div key={i} className={`skeleton ${styles.skeletonBadge}`} />)}
          </div>
        ) : (
          <div className={styles.badgeGrid}>
            {ALL_BADGES.map((badge) => {
              const earned = earnedNames.has(badge.name);
              const userBadge = userBadges.find((ub) => ub.badge.name === badge.name);
              return (
                <div
                  key={badge.name}
                  className={`glass-card ${styles.badgeCard} ${earned ? styles.badgeEarned : styles.badgeLocked}`}
                >
                  <div className={styles.badgeIconWrap}>
                    <span className={styles.badgeIcon}>{badge.icon}</span>
                    {earned && <span className={styles.earnedCheck}><CheckCircle2 size={16} color="white" /></span>}
                  </div>
                  <h3 className={styles.badgeName}>{badge.name}</h3>
                  <p className={styles.badgeCond}>{badge.condition}</p>
                  {earned && userBadge && (
                    <span className={styles.awardedDate}>
                      Earned {new Date(userBadge.awardedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {!earned && <span className={styles.lockedLabel} style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><Lock size={12} /> Locked</span>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import styles from "./challenges.module.css";

interface Challenge {
  id: string;
  name: string;
  duration: number;
  description: string;
}

interface UserChallenge {
  id: string;
  currentDay: number;
  completed: boolean;
  challenge: Challenge;
}

import { Flame, Trophy, CalendarDays, Rocket, Award, LayoutDashboard, PenLine, Settings, BookOpen, Zap, CheckCircle2, Star } from "lucide-react";
import Sidebar from "@/components/Sidebar/Sidebar";
import Logo from "@/components/Logo/Logo";

const getChallengeIcon = (duration: number, size = 24) => {
  if (duration === 7) return <Zap size={size} strokeWidth={2.5} color="var(--primary)" />;
  if (duration === 21) return <Flame size={size} strokeWidth={2.5} color="var(--streak)" />;
  if (duration === 30) return <Trophy size={size} strokeWidth={2.5} color="var(--success)" />;
  return <Star size={size} strokeWidth={2.5} color="var(--primary)" />;
};

export default function ChallengesPage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { const u = initAuth(); return u; }, [initAuth]);
  useEffect(() => { if (initialized && !user) router.push("/login"); }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [cRes, myRes] = await Promise.all([
          fetch(`${API}/api/challenges`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API}/api/challenges/my`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
        ]);
        if (Array.isArray(cRes)) setChallenges(cRes);
        if (Array.isArray(myRes)) setMyChallenges(myRes);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const joinedIds = new Set(myChallenges.map((uc) => uc.challenge.id));

  const handleJoin = async (challengeId: string) => {
    if (!user) return;
    setJoining(challengeId);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/challenges/${challengeId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMyChallenges((prev) => [...prev, data]);
        showToast("🎉 Challenge joined! Write daily to progress.");
      } else {
        showToast(data.error || "Failed to join");
      }
    } catch {
      showToast("Failed to join challenge");
    } finally {
      setJoining(null);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (!initialized || !user) return null;

  return (
    <div className={styles.page}>

      <main className={`${styles.main} animate-page-reveal`}>
        <div className={styles.mobileLogo} style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
          <Logo size={24} />
        </div>
        {/* Toast */}
        {toast && <div className={styles.toast}>{toast}</div>}

        <header className={styles.header}>
          <div>
            <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={32} color="var(--success)" strokeWidth={2.5} /> Challenges
            </h1>
            <p className={styles.subtitle}>Push your limits. Write every day.</p>
          </div>
        </header>

        {/* My Active Challenges */}
        {myChallenges.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your Challenges</h2>
            <div className={styles.cardGrid}>
              {myChallenges.map((uc) => {
                const pct = Math.round((uc.currentDay / uc.challenge.duration) * 100);
                return (
                  <div key={uc.id} className={`glass-card ${styles.challengeCard} ${uc.completed ? styles.completed : ""}`}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardIcon}>{getChallengeIcon(uc.challenge.duration)}</span>
                      <div>
                        <h3 className={styles.cardName}>{uc.challenge.name}</h3>
                        <p className={styles.cardDesc}>{uc.challenge.description}</p>
                      </div>
                      {uc.completed && <span className={styles.completedBadge} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Done</span>}
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={styles.progressLabel}>
                      <span>Day {uc.currentDay} of {uc.challenge.duration}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Available Challenges */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Available Challenges</h2>
          {loading ? (
            <div className={styles.cardGrid}>
              {[1,2,3].map((i) => <div key={i} className={`skeleton ${styles.skeletonCard}`} />)}
            </div>
          ) : challenges.length === 0 ? (
            <div className={`glass-card ${styles.emptyState}`}>
              <Trophy size={48} color="var(--primary)" strokeWidth={2} />
              <p>No challenges available at the moment.</p>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {challenges.map((c) => {
                const alreadyJoined = joinedIds.has(c.id);
                return (
                  <div key={c.id} className={`glass-card ${styles.challengeCard}`}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardIcon}>{getChallengeIcon(c.duration)}</span>
                      <div>
                        <h3 className={styles.cardName}>{c.name}</h3>
                        <p className={styles.cardDesc}>{c.description}</p>
                      </div>
                    </div>
                    <div className={styles.durationBadge}>{c.duration} Days</div>
                    <button
                      id={`join-${c.id}`}
                      className={`btn ${alreadyJoined ? "btn-secondary" : "btn-primary"}`}
                      style={{ width: "100%", marginTop: 16 }}
                      onClick={() => !alreadyJoined && handleJoin(c.id)}
                      disabled={alreadyJoined || joining === c.id}
                    >
                      {joining === c.id ? "Joining..." : alreadyJoined ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><CheckCircle2 size={18} /> Enrolled</span> : "Join Challenge"}
                    </button>
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

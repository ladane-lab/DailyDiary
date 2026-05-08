"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import styles from "./page.module.css";

import {
  BookOpen, Heart, Zap, Sparkles, PieChart, Timer, Target, Lock, 
  Layers, Flame, Trophy, Calendar, Globe, PenLine
} from "lucide-react";

const TEMPLATES_PREVIEW = [
  { icon: <BookOpen size={32} strokeWidth={2} />, name: "Personal Journal", color: "#6C5CE7" },
  { icon: <Heart size={32} strokeWidth={2} />, name: "Gratitude Journal", color: "#00B894" },
  { icon: <Zap size={32} strokeWidth={2} />, name: "Productivity", color: "#FDCB6E" },
  { icon: <Sparkles size={32} strokeWidth={2} />, name: "Self Care", color: "#FD79A8" },
  { icon: <PieChart size={32} strokeWidth={2} />, name: "Finance", color: "#00CEC9" },
  { icon: <Timer size={32} strokeWidth={2} />, name: "Time Management", color: "#E17055" },
  { icon: <Target size={32} strokeWidth={2} />, name: "Yearly Planner", color: "#A29BFE" },
];

const FEATURES = [
  {
    icon: <Lock size={40} strokeWidth={1.5} color="var(--primary)" />,
    title: "AES-256 Encryption",
    desc: "Your entries are encrypted with military-grade AES-256-GCM. Only you can read them.",
  },
  {
    icon: <Layers size={40} strokeWidth={1.5} color="var(--primary)" />,
    title: "Smart Templates",
    desc: "7+ structured templates — gratitude, productivity, finance, and more.",
  },
  {
    icon: <Flame size={40} strokeWidth={1.5} color="var(--streak)" />,
    title: "Streak System",
    desc: "Write daily and watch your streak grow. Stay consistent, stay motivated.",
  },
  {
    icon: <Trophy size={40} strokeWidth={1.5} color="var(--success)" />,
    title: "Challenges & Badges",
    desc: "Take on 7, 21, or 30-day challenges. Earn badges for every milestone.",
  },
  {
    icon: <Calendar size={40} strokeWidth={1.5} color="var(--primary)" />,
    title: "Timeline & Calendar",
    desc: "Visualize your journaling journey with a beautiful timeline and calendar view.",
  },
  {
    icon: <Globe size={40} strokeWidth={1.5} color="var(--primary)" />,
    title: "Public or Private",
    desc: "Keep entries private or share them publicly. You're in full control.",
  },
];

export default function HomePage() {
  const { user, initialized, initAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    const unsub = initAuth();
    
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle or use direct values for CSS variables
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      unsub();
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [initAuth]);

  if (!mounted) return null;

  return (
    <div 
      className={styles.page} 
      style={{ 
        '--mouse-x': `${mousePos.x}px`, 
        '--mouse-y': `${mousePos.y}px` 
      } as React.CSSProperties}
    >
      {/* ── Navigation ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.logo}>
            <span className={styles.logoIcon}>
              <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} />
            </span>
            <span className={styles.logoText}>DailyDiary</span>
            <span className={styles.logoDot}>.in</span>
          </a>
          <div className={styles.navLinks}>
            {initialized && user ? (
              <>
                <a href="/dashboard" className="btn btn-primary">
                  Dashboard →
                </a>
              </>
            ) : (
              <>
                <a href="/login" className="btn btn-secondary">
                  Log In
                </a>
                <a href="/register" className="btn btn-primary">
                  Get Started Free
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.heroOrb1} />
          <div className={styles.heroOrb2} />
        </div>
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.heroTag}>
            <Lock size={16} strokeWidth={2} /> Encrypted & Secure
          </div>
          <h1 className={styles.heroTitle}>
            Write. Reflect.<br />
            <span className="text-gradient">Grow Every Day.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A premium encrypted journaling platform with smart templates,
            daily streaks, challenges, and gamification. Build the writing
            habit that transforms your life.
          </p>
          <div className={styles.heroCta}>
            <a href="/register" className="btn btn-primary" style={{ padding: "16px 40px", fontSize: "1.1rem", gap: "8px" }}>
              Start Writing Free <Flame size={20} strokeWidth={2.5} />
            </a>
            <a href="#features" className="btn btn-secondary" style={{ padding: "16px 32px", gap: "8px" }}>
              See Features
            </a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>7+</span>
              <span className={styles.statLabel}>Templates</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>AES-256</span>
              <span className={styles.statLabel}>Encryption</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>100%</span>
              <span className={styles.statLabel}>Free to Start</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Templates Preview ── */}
      <section className={styles.templates} id="templates">
        <div className="container">
          <h2 className={styles.sectionTitle}>
            Choose Your <span className="text-gradient">Template</span>
          </h2>
          <p className={styles.sectionSub}>
            Pick from structured templates designed for every journaling style.
          </p>
          <div className={styles.templateGrid}>
            {TEMPLATES_PREVIEW.map((t, i) => (
              <div
                key={t.name}
                className={`glass-card ${styles.templateCard}`}
                style={{
                  animationDelay: `${0.1 + i * 0.08}s`,
                  borderTop: `3px solid ${t.color}`,
                }}
              >
                <span className={styles.templateEmoji} style={{ color: t.color }}>{t.icon}</span>
                <span className={styles.templateName}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features} id="features">
        <div className="container">
          <h2 className={styles.sectionTitle}>
            Everything You <span className="text-gradient-accent">Need</span>
          </h2>
          <p className={styles.sectionSub}>
            From encryption to gamification — we've got it all.
          </p>
          <div className={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass-card ${styles.featureCard}`}
                style={{ animationDelay: `${0.2 + i * 0.12}s` }}
              >
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.finalCta}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 className={styles.ctaTitle}>
            Ready to <span className="text-gradient">Start Writing?</span>
          </h2>
          <p className={styles.ctaSub}>
            Join thousands who trust DailyDiary.in to protect their most
            personal thoughts.
          </p>
          <a href="/register" className="btn btn-primary" style={{ padding: "18px 48px", fontSize: "1.15rem", gap: "8px" }}>
            <PenLine size={20} strokeWidth={2.5} /> Create Free Account
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <span className={styles.logoIcon}>
              <BookOpen size={20} color="var(--text-muted)" strokeWidth={2.5} />
            </span>
            <span>DailyDiary.in</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/contact">Contact</a>
          </div>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} DailyDiary.in — All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

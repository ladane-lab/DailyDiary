"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "../Logo/Logo";
import { useAuthStore } from "@/store/authStore";
import { 
  BookOpen, LayoutDashboard, PenLine, CalendarDays, 
  Globe, Trophy, Medal, Settings, LogOut, Calendar, Sun, Moon
} from "lucide-react";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const [theme, setTheme] = useState("light");

  const getThemeValue = () => {
    return localStorage.getItem("theme") || "system";
  };

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(getThemeValue());
    };
    window.addEventListener("theme-changed", handleThemeChange);
    setTheme(getThemeValue());
    return () => {
      window.removeEventListener("theme-changed", handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const currentResolved = theme === "dark" || 
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    const next = currentResolved === "light" ? "dark" : "light";
    
    localStorage.setItem("theme", next);
    window.dispatchEvent(new Event("theme-changed"));
  };

  const navItems = [
    { href: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { href: "/write",     icon: <PenLine size={18} />, label: "Write Entry" },
    { href: "/timeline",  icon: <CalendarDays size={18} />, label: "Timeline" },
    { href: "/calendar",  icon: <Calendar size={18} />, label: "Calendar" },
    { href: "/explore",   icon: <Globe size={18} />, label: "Explore" },
    { href: "/challenges", icon: <Trophy size={18} />, label: "Challenges" },
    { href: "/badges",    icon: <Medal size={18} />, label: "Badges" },
    { href: "/settings",  icon: <Settings size={18} />, label: "Settings" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link href="/dashboard" className={styles.sidebarLogo} style={{ textDecoration: 'none' }}>
          <Logo size={28} />
        </Link>
      </div>
      
      <nav className={styles.sidebarNav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`${styles.navItem} ${isActive ? styles.navActive : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarBottom} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button 
          onClick={toggleTheme} 
          className={styles.logoutBtn} 
          style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", width: "100%", border: "1px solid var(--border)", background: "transparent" }}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          Theme
        </button>
        <button onClick={logout} className={styles.logoutBtn} id="logout-btn">
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </aside>
  );
}

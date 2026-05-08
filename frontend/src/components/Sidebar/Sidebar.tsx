"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { 
  BookOpen, LayoutDashboard, PenLine, CalendarDays, 
  Globe, Trophy, Medal, Settings, LogOut 
} from "lucide-react";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const navItems = [
    { href: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { href: "/write",     icon: <PenLine size={18} />, label: "Write Entry" },
    { href: "/timeline",  icon: <CalendarDays size={18} />, label: "Timeline" },
    { href: "/explore",   icon: <Globe size={18} />, label: "Explore" },
    { href: "/challenges", icon: <Trophy size={18} />, label: "Challenges" },
    { href: "/badges",    icon: <Medal size={18} />, label: "Badges" },
    { href: "/settings",  icon: <Settings size={18} />, label: "Settings" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link href="/dashboard" className={styles.sidebarLogo}>
          <span className="animate-float">
            <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} />
          </span>
          <span>DailyDiary</span>
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

      <div className={styles.sidebarBottom}>
        <button onClick={logout} className={styles.logoutBtn} id="logout-btn">
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </aside>
  );
}

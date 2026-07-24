"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar/Sidebar";
import ErrorBoundary from "./ErrorBoundary";
import { useAuthStore } from "@/store/authStore";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/register", "/privacy", "/terms", "/contact", "/about"];
const AUTH_ONLY_GUEST_PATHS = ["/login", "/signup", "/register"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();

  const applyCurrentTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth();
    applyCurrentTheme();

    const handleThemeChange = () => {
      applyCurrentTheme();
    };

    window.addEventListener("theme-changed", handleThemeChange);
    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener("theme-changed", handleThemeChange);
    };
  }, [initAuth]);

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  // Centralized Route Protection Logic
  useEffect(() => {
    if (!initialized) return;

    if (!user && !isPublicPage) {
      router.replace("/login");
    } else if (user && AUTH_ONLY_GUEST_PATHS.includes(pathname)) {
      router.replace("/dashboard");
    }
  }, [initialized, user, isPublicPage, pathname, router]);

  // Loading state while checking auth on protected routes
  if (!initialized && !isPublicPage) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary, #0d1117)", color: "var(--text-secondary, #8b949e)", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>Loading DailyDiary...</div>
        </div>
      </div>
    );
  }

  // Prevent rendering protected content before redirect completes
  if (initialized && !user && !isPublicPage) {
    return null;
  }

  // Don't show sidebar on landing page, auth pages, or legal pages
  if (isPublicPage) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <div className="layout-root">
        <Sidebar />
        <div className="content-container">
          {children}
        </div>
      </div>
    </ErrorBoundary>
  );
}


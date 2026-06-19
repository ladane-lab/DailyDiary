"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar/Sidebar";
import ErrorBoundary from "./ErrorBoundary";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const applyCurrentTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // default or system preference
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  useEffect(() => {
    applyCurrentTheme();

    const handleThemeChange = () => {
      applyCurrentTheme();
    };

    window.addEventListener("theme-changed", handleThemeChange);
    return () => {
      window.removeEventListener("theme-changed", handleThemeChange);
    };
  }, []);
  
  // List of paths that should NOT have a sidebar (landing page, auth pages, legal pages)
  const noSidebarPaths = ["/", "/login", "/signup", "/register", "/privacy", "/terms", "/contact"];
  const isNoSidebarPage = noSidebarPaths.includes(pathname);

  // Don't show sidebar on landing page or auth pages
  if (isNoSidebarPage) {
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


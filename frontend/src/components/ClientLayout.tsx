"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar/Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // List of paths that should NOT have a sidebar (landing page, auth pages)
  const noSidebarPaths = ["/", "/login", "/signup"];
  const isNoSidebarPage = noSidebarPaths.includes(pathname);

  // Don't show sidebar on landing page or auth pages
  if (isNoSidebarPage) {
    return <>{children}</>;
  }

  return (
    <div className="layout-root">
      <Sidebar />
      <div className="content-container">
        {children}
      </div>
    </div>
  );
}

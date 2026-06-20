"use client";
// Persistent Diary Styling System

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import styles from "./timeline.module.css";
import DiaryBook, { DiaryTheme } from "@/components/DiaryBook/DiaryBook";
import Sidebar from "@/components/Sidebar/Sidebar";
import Logo from "@/components/Logo/Logo";

interface EntryItem {
  id: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  template?: { name: string };
  templateId?: string | null;
  theme?: string;
  responses?: { fieldLabel: string; value: string }[];
}

import { 
  Sparkles, BookOpen, PenLine, CalendarDays
} from "lucide-react";

export default function TimelinePage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [preferredThemes, setPreferredThemes] = useState<Record<string, string>>({});
  const [selectedJournal, setSelectedJournal] = useState<{ id: string, name: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, [initAuth]);

  useEffect(() => {
    if (initialized && !user) router.push("/login");
  }, [user, initialized, router]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
        const res = await fetch(`${API}/api/entries?page=${page}&limit=50${searchParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEntries((prev) => page === 1 ? data.entries : [...prev, ...data.entries]);
          setTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch entries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [user, page, debouncedSearch]);

  // Dedicated effect for preferences to ensure they load reliably
  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      try {
        const token = await user.getIdToken();
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const userData = await res.json();
          if (userData.preferredThemes) {
            setPreferredThemes(userData.preferredThemes);
            localStorage.setItem(`diary_themes_${user.uid}`, JSON.stringify(userData.preferredThemes));
          }
        } else {
          // Try fallback
          const local = localStorage.getItem(`diary_themes_${user.uid}`);
          if (local) setPreferredThemes(JSON.parse(local));
        }
      } catch (err) {
        console.error("Failed to fetch preferences:", err);
        const local = localStorage.getItem(`diary_themes_${user.uid}`);
        if (local) setPreferredThemes(JSON.parse(local));
      }
    };
    fetchPrefs();
  }, [user]);

  if (!initialized || !user) return null;

  const groupedByTemplate = groupByTemplate(entries);

  return (
    <div className={styles.page}>
      {/* ── Main ── */}
      <main className={`${styles.main} animate-page-reveal`}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={32} color="var(--primary)" strokeWidth={2.5} /> Your Journals
            </h1>
            <p className={styles.subtitle}>{total} total entries across your library</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className={`btn ${isEditMode ? 'btn-secondary' : 'btn-outline'}`} 
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) setSelectedJournal(null);
              }}
              style={{ gap: '8px' }}
            >
              <Sparkles size={18} /> {isEditMode ? "Applied Changes" : "Change Style"}
            </button>
            <a href="/write" className="btn btn-primary" style={{ gap: '8px' }}>
              <PenLine size={18} /> Write Today
            </a>
          </div>
        </header>

        {/* Timeline search bar */}
        <div style={{ marginBottom: '24px', width: '100%' }}>
          <input 
            type="text" 
            placeholder="Search entries by keyword, template, date, or field answers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ padding: '12px 18px', fontSize: '0.95rem' }}
          />
        </div>

        {isEditMode && (
          <div className={`${styles.fixedThemeSelector} animate-slide-down`}>
            {selectedJournal ? (
              <>
                <p className={styles.selectorLabel}>Select Diary Style for <strong>{selectedJournal.name}</strong></p>
                <div className={styles.themeGrid}>
                  {[
                    { id: "marble", name: "Marble", color: "#a8d1ff", icon: "🪨" },
                    { id: "vintage", name: "Vintage", color: "#5c4033", icon: "📜" },
                    { id: "minimal", name: "Minimal", color: "#f1f5f9", icon: "✦" },
                    { id: "cute", name: "Cute", color: "#f9c6e0", icon: "🌸" },
                    { id: "professional", name: "Pro", color: "#1e2937", icon: "📓" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      className={`${styles.themeOption} ${preferredThemes[selectedJournal.name] === s.id ? styles.themeActive : ""}`}
                      style={{ backgroundColor: s.color }}
                      onClick={async () => {
                        const newTheme = s.id;
                        const cleanName = selectedJournal.name.trim();
                        const updated = { ...preferredThemes, [cleanName]: newTheme };
                        setPreferredThemes(updated);
                        localStorage.setItem(`diary_themes_${user.uid}`, JSON.stringify(updated));
                        
                        try {
                          const token = await user.getIdToken();
                          const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
                          await fetch(`${API}/api/users/theme`, {
                            method: 'PATCH',
                            headers: { 
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}` 
                            },
                            body: JSON.stringify({ templateId: cleanName, theme: newTheme }),
                          });
                        } catch (err) {
                          console.error("Failed to save theme preference:", err);
                        }
                      }}
                      title={s.name}
                    >
                      <span className={styles.themeIcon}>{s.icon}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-2 text-gray-500 italic text-sm">
                Click any journal below to change its style
              </div>
            )}
          </div>
        )}

        {loading && entries.length === 0 ? (
          <div className={styles.loadingGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className={`glass-card ${styles.emptyState}`}>
            <BookOpen size={48} color="var(--primary)" strokeWidth={2} />
            <h3>Your library is empty</h3>
            <p>Start journaling to create your first book.</p>
            <a href="/write" className="btn btn-primary" style={{ marginTop: 16, gap: '8px' }}>
              <PenLine size={18} /> Write First Entry
            </a>
          </div>
        ) : (
          <div className={styles.timeline}>
            <div className={styles.entryGrid}>
              {Object.entries(groupedByTemplate).map(([templateName, templateEntries]) => {
                const cleanName = templateName.trim();
                const representativeTheme = templateEntries.find(e => e.theme)?.theme;
                const theme: DiaryTheme = (preferredThemes[cleanName] as DiaryTheme) || 
                                          (representativeTheme as DiaryTheme) || 
                                          getThemeForTemplate(cleanName);

                const templateId = templateEntries[0]?.templateId || templateName;

                return (
                  <div 
                    key={templateName} 
                    className={`
                      ${styles.journalItem} 
                      ${selectedJournal?.id === templateId ? styles.selectedJournal : ""}
                      ${isEditMode ? styles.editModeJournal : ""}
                    `}
                    onClick={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedJournal({ id: templateId, name: templateName });
                      }
                    }}
                  >
                    <div style={{ pointerEvents: isEditMode ? 'none' : 'auto' }}>
                      <DiaryBook 
                        entries={templateEntries} 
                        theme={theme} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {entries.length < total && (
              <button
                className={`btn btn-secondary ${styles.loadMore}`}
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function groupByTemplate(entries: EntryItem[]): Record<string, EntryItem[]> {
  const groups = entries.reduce<Record<string, EntryItem[]>>((acc, entry) => {
    const tpl = (entry.template?.name || "Personal Journal").trim();
    if (!acc[tpl]) acc[tpl] = [];
    acc[tpl].push(entry);
    return acc;
  }, {});

  // Sort entries within each group by date ascending (Oldest -> Newest)
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  return groups;
}

function getThemeForTemplate(name: string): DiaryTheme {
  const n = name.toLowerCase();
  if (n.includes("gratitude")) return 'cute';
  if (n.includes("productivity")) return 'marble';
  if (n.includes("care")) return 'cute';
  if (n.includes("finance")) return 'minimal';
  if (n.includes("management")) return 'professional';
  if (n.includes("yearly") || n.includes("vintage")) return 'vintage';
  return 'marble';
}


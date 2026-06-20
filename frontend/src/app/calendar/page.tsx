"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, PenLine, Heart, Zap, Sparkles, BookHeart, Clock, BookOpen } from "lucide-react";
import Logo from "@/components/Logo/Logo";
import styles from "./calendar.module.css";

interface EntryResponse {
  fieldLabel: string;
  value: string;
}

interface ImageItem {
  id: string;
  url: string;
}

interface EntryItem {
  id: string;
  body: string;
  createdAt: string;
  template?: { name: string };
  responses?: EntryResponse[];
  images?: ImageItem[];
  theme?: string;
}

const getTemplateIcon = (name: string, size = 16) => {
  if (name.includes("Gratitude")) return <Heart size={size} strokeWidth={2.5} color="var(--danger)" />;
  if (name.includes("Productivity")) return <Zap size={size} strokeWidth={2.5} color="var(--streak)" />;
  if (name.includes("Care")) return <Sparkles size={size} strokeWidth={2.5} color="var(--primary)" />;
  return <BookHeart size={size} strokeWidth={2.5} color="var(--primary)" />;
};

export default function CalendarPage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, [initAuth]);

  useEffect(() => {
    if (initialized && !user) {
      router.push("/login");
    }
  }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      try {
        const token = await user.getIdToken();
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API}/api/entries?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
        }
      } catch (err) {
        console.error("Failed to fetch calendar entries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [user]);

  if (!initialized || !user) return null;

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Map dates to entries
  const getEntriesForDate = (day: number) => {
    return entries.filter(entry => {
      const eDate = new Date(entry.createdAt);
      return eDate.getDate() === day && eDate.getMonth() === month && eDate.getFullYear() === year;
    });
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  // Build grid cells
  const calendarCells = [];
  // Empty slots for padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEntries = getEntriesForDate(day);
    const hasEntries = dayEntries.length > 0;
    const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

    calendarCells.push(
      <button
        key={`day-${day}`}
        onClick={() => handleDayClick(day)}
        className={`${styles.dayCell} ${isSelected ? styles.selectedDay : ""} ${isToday ? styles.today : ""}`}
      >
        <span className={styles.dayNumber}>{day}</span>
        {hasEntries && (
          <div className={styles.indicators}>
            {dayEntries.map((e, idx) => (
              <span 
                key={e.id} 
                className={styles.indicatorDot} 
                style={{ 
                  backgroundColor: e.theme === 'cute' ? 'var(--danger)' : 
                                   e.theme === 'vintage' ? 'var(--streak)' : 
                                   'var(--primary)' 
                }} 
              />
            ))}
          </div>
        )}
      </button>
    );
  }

  // Selected date entries list
  const selectedEntries = selectedDate 
    ? entries.filter(entry => {
        const eDate = new Date(entry.createdAt);
        return eDate.getDate() === selectedDate.getDate() && 
               eDate.getMonth() === selectedDate.getMonth() && 
               eDate.getFullYear() === selectedDate.getFullYear();
      })
    : [];

  return (
    <div className={styles.page}>
      <main className={`${styles.main} animate-page-reveal`}>

        
        <header className={styles.header}>
          <div>
            <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={32} color="var(--primary)" strokeWidth={2.5} /> Calendar View
            </h1>
            <p className={styles.subtitle}>Browse your journal collections by date</p>
          </div>
          <a href="/write" className="btn btn-primary" style={{ gap: '8px' }}>
            <PenLine size={18} /> Write Today
          </a>
        </header>

        <div className={styles.calendarLayout}>
          {/* Calendar Card */}
          <div className={`glass-card ${styles.calendarCard}`}>
            <div className={styles.calendarHeader}>
              <h2 className={styles.monthLabel}>{monthNames[month]} {year}</h2>
              <div className={styles.navBtns}>
                <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '8px 12px' }}><ChevronLeft size={16} /></button>
                <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '8px 12px' }}><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className={styles.weekDaysGrid}>
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className={styles.daysGrid}>
              {calendarCells}
            </div>
          </div>

          {/* Reflections List Card */}
          <div className={`glass-card ${styles.detailsCard}`}>
            <h2 className={styles.detailsTitle}>
              Reflections for {selectedDate ? selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Selected Date"}
            </h2>
            
            {loading ? (
              <div className={styles.emptyState}>Loading reflections...</div>
            ) : selectedEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <CalendarIcon size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>No entries recorded on this day.</p>
                <a href="/write" className="btn btn-secondary btn-sm" style={{ marginTop: '12px', fontSize: '0.8rem', padding: '6px 16px' }}>Write for this date</a>
              </div>
            ) : (
              <div className={styles.entryList}>
                {selectedEntries.map(entry => {
                  let cleanBody = entry.body.trim();
                  if (entry.template?.name === "Personal Journal") {
                    cleanBody = cleanBody.replace(/^Write freely\.\.\.:\s*/i, '');
                  }
                  if (!cleanBody.startsWith('<')) {
                    cleanBody = cleanBody.replace(/^([^<]+?)(?:\r\n|\r|\n|$)/gm, '<p>$1</p>');
                  }

                  const timeStr = new Date(entry.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit"
                  });

                  return (
                    <div key={entry.id} className={styles.entryItemCard} onClick={() => router.push(`/timeline`)}>
                      <div className={styles.entryItemHeader}>
                        <span className={styles.entryItemIcon}>{getTemplateIcon(entry.template?.name || "")}</span>
                        <div className={styles.entryItemTitle}>{entry.template?.name || "Personal Journal"}</div>
                        <div className={styles.entryItemTime}><Clock size={12} /> {timeStr}</div>
                      </div>
                      
                      {entry.responses && entry.responses.length > 0 && (
                        <div className={styles.entryMiniResponses}>
                          {entry.responses.slice(0, 2).map((r, i) => (
                            <div key={i} className={styles.entryMiniResponseRow}>
                              <span className={styles.entryMiniResponseLbl}>{r.fieldLabel}:</span> {r.value}
                            </div>
                          ))}
                        </div>
                      )}

                      <div 
                        className={`text-sm line-clamp-3 ${styles.entryItemBody} ${styles.tiptapContent}`}
                        dangerouslySetInnerHTML={{ __html: cleanBody }}
                      />

                      {entry.images && entry.images.length > 0 && (
                        <div className={styles.entryMiniImages}>
                          {entry.images.map(img => (
                            <img key={img.id} src={img.url} alt="Attachment" className={styles.entryMiniImg} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

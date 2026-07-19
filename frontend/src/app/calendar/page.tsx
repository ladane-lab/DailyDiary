"use client";
import { sanitizeHtml } from "@/lib/sanitize";
import { API_URL } from "@/lib/api";

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
  const { user, initialized } = useAuthStore();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  
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
        const API = API_URL;
        const res = await fetch(`${API}/entries?limit=1000`, {
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

  // Monthly stats
  const entriesInMonth = entries.filter(entry => {
    const eDate = new Date(entry.createdAt);
    return eDate.getMonth() === month && eDate.getFullYear() === year;
  });

  const entriesWritten = entriesInMonth.length;
  
  let longestEntry = 0;
  const wordsWritten = entriesInMonth.reduce((acc, e) => {
    const text = e.body.replace(/<[^>]+>/g, ' ');
    const wordCount = text.match(/\b\w+\b/g)?.length || 0;
    if (wordCount > longestEntry) longestEntry = wordCount;
    return acc + wordCount;
  }, 0);

  const avgMood = entriesWritten > 0 ? "😊 Happy" : "-";
  const writingStreak = (user as any)?.streakCount || 0;
  const journalDays = new Set(entriesInMonth.map(e => new Date(e.createdAt).getDate())).size;

  return (
    <div className={styles.page}>
      <main className={`${styles.main} animate-page-reveal`}>

        
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>
              Calendar View
            </h1>
            <p className={styles.subtitle}>Browse your journal collections by date</p>
          </div>
          <a href="/write" className={`btn btn-primary ${styles.writeBtn}`}>
            <PenLine size={16} className={styles.btnIcon} /> Write Today
          </a>
        </header>

        <div className={styles.calendarLayout}>
          <div className={styles.leftColumn}>
            {/* Calendar Card */}
            <div className={`glass-card ${styles.calendarCard}`}>
              <div className={styles.calendarHeader}>
                <div className={styles.monthYearSelectors}>
                  <select 
                    value={month} 
                    onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
                    className={styles.selectorDropdown}
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select 
                    value={year} 
                    onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))}
                    className={styles.selectorDropdown}
                  >
                    {Array.from({ length: 151 }, (_, i) => 1950 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.navBtns}>
                  <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '4px 8px' }}><ChevronLeft size={16} /></button>
                  <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '4px 8px' }}><ChevronRight size={16} /></button>
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

            {/* Monthly Statistics Card */}
            <div className={styles.statsCard}>
              <h2 className={styles.statsTitle}>{monthNames[month]} Summary</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Entries</span>
                  <span className={styles.statValue}>{entriesWritten}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Words</span>
                  <span className={styles.statValue}>{wordsWritten.toLocaleString()}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Avg Mood</span>
                  <span className={styles.statValue}>{avgMood}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Longest</span>
                  <span className={styles.statValue}>{longestEntry} words</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Streak</span>
                  <span className={styles.statValue}>{writingStreak} Days</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Journal Days</span>
                  <span className={styles.statValue}>{journalDays}/{daysInMonth}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reflections List Card */}
          <div className={`glass-card ${styles.detailsCard}`}>
            <h2 className={styles.detailsTitle}>
              {selectedDate ? selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Selected Date"}
            </h2>
            <p className={styles.detailsSubtitle}>
              {selectedEntries.length === 0 ? "No Entry" : `${selectedEntries.length} Journal Entr${selectedEntries.length > 1 ? 'ies' : 'y'}`}
            </p>
            
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

                  // Categorize responses
                  const moodResponses = entry.responses?.filter(r => r.fieldLabel.toLowerCase().includes('mood')) || [];
                  const gratitudeResponses = entry.responses?.filter(r => r.fieldLabel.toLowerCase().includes('gratitude') || r.fieldLabel.toLowerCase().includes('thankful')) || [];
                  const achievementResponses = entry.responses?.filter(r => r.fieldLabel.toLowerCase().includes('achieve') || r.fieldLabel.toLowerCase().includes('goal') || r.fieldLabel.toLowerCase().includes('win')) || [];

                  return (
                    <div key={entry.id} className={styles.entryItemCard} onClick={() => router.push(`/timeline`)} style={{ cursor: 'pointer' }}>
                      <div className={styles.entryItemHeader}>
                        <span className={styles.entryItemIcon}>{getTemplateIcon(entry.template?.name || "")}</span>
                        <div className={styles.entryItemTitle}>{entry.template?.name || "Morning Journal"}</div>
                        <div className={styles.entryItemTime}><Clock size={12} /> {timeStr}</div>
                      </div>
                      
                      {moodResponses.length > 0 && (
                        <div className={styles.reflectionSection}>
                          <div className={styles.reflectionLabel}>Today's Mood</div>
                          <div className={styles.reflectionContent}>{moodResponses.map(m => m.value).join(', ')}</div>
                        </div>
                      )}

                      {gratitudeResponses.length > 0 && (
                        <div className={styles.reflectionSection}>
                          <div className={styles.reflectionLabel}>Gratitude</div>
                          <div className={styles.reflectionContent}>
                            <ul>
                              {gratitudeResponses.map((r, i) => (
                                <li key={i}>{r.value}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {achievementResponses.length > 0 && (
                        <div className={styles.reflectionSection}>
                          <div className={styles.reflectionLabel}>Achievements</div>
                          <div className={styles.reflectionContent}>
                            <ul>
                              {achievementResponses.map((r, i) => (
                                <li key={i}>{r.value}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className={styles.reflectionSection}>
                        <div className={styles.reflectionLabel}>Reflection</div>
                        <div 
                          className={`text-sm line-clamp-4 ${styles.reflectionContent} ${styles.tiptapContent}`}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(cleanBody) }}
                        />
                      </div>

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


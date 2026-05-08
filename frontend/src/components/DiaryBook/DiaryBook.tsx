"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from "./DiaryBook.module.css";
import { ChevronLeft, ChevronRight, Hash, Calendar, Globe, Lock as LockIcon, X, Clock, Image as ImageIcon, ChevronDown } from "lucide-react";


export type DiaryTheme = 'vintage' | 'minimal' | 'cute' | 'professional' | 'marble';

interface EntryItem {
  id: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  template?: { name: string };
  theme?: string;
  responses?: { fieldLabel: string; value: string }[];
}

interface ThemeConfig {
  color: string;
  icon: string;
  displayName: string;
  subtitle: string;
  hasLock: boolean;
  paperColor: string;
  lineColor: string;
  textColor: string;
  accentColor: string;
}

const THEME_CONFIGS: Record<DiaryTheme, ThemeConfig> = {
  marble: { 
    color: "#a8d1ff", icon: "🪨", displayName: "Marble", subtitle: "Light Blue Premium", hasLock: true,
    paperColor: '#ffffff', lineColor: '#f0f4f8', textColor: '#1A2F23', accentColor: '#5F8575'
  },
  vintage: { 
    color: "#5c4033", icon: "📜", displayName: "Vintage", subtitle: "Brown Leather", hasLock: true,
    paperColor: '#f4ecd8', lineColor: '#dcd1b3', textColor: '#3e2723', accentColor: '#8b4513'
  },
  minimal: { 
    color: "#f1f5f9", icon: "✦", displayName: "Minimal", subtitle: "Clean White", hasLock: false,
    paperColor: '#ffffff', lineColor: '#f1f1f1', textColor: '#2d3436', accentColor: '#333333'
  },
  cute: { 
    color: "#f9c6e0", icon: "🌸", displayName: "Cute", subtitle: "Pink Aesthetic", hasLock: false,
    paperColor: '#fff9fe', lineColor: '#fce4ec', textColor: '#880e4f', accentColor: '#ec407a'
  },
  professional: { 
    color: "#1e2937", icon: "📓", displayName: "Professional", subtitle: "Dark Professional", hasLock: false,
    paperColor: '#ffffff', lineColor: '#eaeff2', textColor: '#0f172a', accentColor: '#1e3a8a'
  }
};

export default function DiaryBook({ 
  entries, 
  theme = 'marble',
}: { 
  entries: EntryItem[], 
  theme?: DiaryTheme,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [jumpInput, setJumpInput] = useState("");
  const [isAutoFlipping, setIsAutoFlipping] = useState(false);
  const [entryPageCounts, setEntryPageCounts] = useState<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const calculate = () => {
      setEntryPageCounts(prev => {
        let changed = false;
        const newCounts = { ...prev };
        entries.forEach(entry => {
          const el = document.getElementById(`measure-${entry.id}`);
          if (el) {
            const height = el.scrollHeight;
            const firstPageHeight = 432; // 504 - 48 (header) - 24 (gap)
            const otherPageHeight = 480; // 504 - 24 (gap)
            
            let pages = 1;
            if (height > firstPageHeight) {
              pages = 1 + Math.ceil((height - firstPageHeight) / otherPageHeight);
            }

            if (newCounts[entry.id] !== pages) {
              newCounts[entry.id] = pages;
              changed = true;
            }
          }
        });
        return changed ? newCounts : prev;
      });
    };

    // Calculate immediately
    calculate();

    // Use ResizeObserver to detect when fonts load or CSS applies
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(calculate, 50);
    });

    entries.forEach(entry => {
      const el = document.getElementById(`measure-${entry.id}`);
      if (el) observer.observe(el);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(calculate);
    }

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [entries]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('journal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('journal-open');
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('journal-open');
    };
  }, [isOpen]);

  const config = THEME_CONFIGS[theme] || THEME_CONFIGS.marble;
  const tplName = entries[0]?.template?.name || "Personal Journal";

  const playSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audio = audioContextRef.current;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = 720;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
      osc.stop(audio.currentTime + 0.15);
    } catch(e) {}
  };

  const bookPages = useMemo(() => {
    const allPhysicalPages: { content: React.ReactNode; isBack: boolean }[] = [];
    
    entries.forEach((entry) => {
      const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      const timeStr = new Date(entry.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
      });

      let cleanBody = entry.body.trim();
      
      // Remove "Write freely...:" label from Personal Journal in reading view
      if (tplName === "Personal Journal") {
        cleanBody = cleanBody.replace(/^Write freely\.\.\.:\s*/i, '');
      }

      if (!cleanBody.startsWith('<')) {
        cleanBody = cleanBody.replace(/^([^<]+?)(?:\r\n|\r|\n|$)/gm, '<p>$1</p>');
      }

      const numPages = entryPageCounts[entry.id] || 1;

      // Helper to render an entry's page
      const renderEntryPage = (pageIdx: number, isPhysicalBack: boolean) => {
        const hasHeader = pageIdx === 0;
        const headerHeight = 48; 
        const safeArea = 24; 
        const pageHeight = 504;
        const firstPageContent = pageHeight - headerHeight - safeArea; 
        const otherPageContent = pageHeight - safeArea; 

        const contentOffset = hasHeader ? 0 : firstPageContent + (pageIdx - 1) * otherPageContent;

        return (
          <div 
            className={`${styles.pageCommon} ${isPhysicalBack ? styles.paperBack : styles.paperFront}`} 
            style={{ '--page-color': config.paperColor, '--line-color': config.lineColor } as any}
          >
            {hasHeader && (
              <div className={styles.pageHeader} style={{ color: config.accentColor }}>
                <span><Calendar size={12} className="inline mr-1" /> {dateStr}</span>
                <span className="opacity-60">{timeStr}</span>
              </div>
            )}
            
            <div style={{ 
              height: hasHeader ? `${firstPageContent}px` : `${otherPageContent}px`, 
              marginTop: `${safeArea}px`,
              overflow: 'hidden', 
              flexShrink: 0 
            }}>
              <div 
                className={`text-[14px] leading-[24px] pr-2 font-medium ${styles.tiptapContent}`} 
                style={{ 
                  color: config.textColor, 
                  fontFamily: '"Inter", sans-serif',
                  transform: `translateY(-${contentOffset}px)`
                }}
                dangerouslySetInnerHTML={{ __html: cleanBody }} 
              />
            </div>
          </div>
        );
      };

      for (let p = 0; p < numPages; p++) {
        const isBack = allPhysicalPages.length % 2 !== 0;
        allPhysicalPages.push({
          content: renderEntryPage(p, isBack),
          isBack
        });
      }
    });

    // Chunk logical pages into leaves
    const leaves: any[] = [];
    for (let i = 0; i < allPhysicalPages.length; i += 2) {
      leaves.push({
        front: allPhysicalPages[i].content,
        back: allPhysicalPages[i+1]?.content || (
          <div 
            className={`${styles.pageCommon} ${styles.paperBack}`} 
            style={{ '--page-color': config.paperColor, '--line-color': config.lineColor } as any}
          />
        )
      });
    }

    return leaves;
  }, [entries, config, entryPageCounts]);

  const totalFlipPages = bookPages.length + 1; // +1 for the cover

  const animateToPage = async (target: number) => {
    if (isAutoFlipping || target === currentPage || target < 0 || target > totalFlipPages) return;
    
    setIsAutoFlipping(true);
    const direction = target > currentPage ? 1 : -1;
    let current = currentPage;

    while (current !== target) {
      playSound();
      current += direction;
      
      if (current === 1 && direction === 1) setIsOpen(true);
      if (current === 0 && direction === -1) setIsOpen(false);
      
      setCurrentPage(current);
      // Wait roughly the transition time minus a bit for overlapping smoothness
      await new Promise(r => setTimeout(r, 700));
    }
    setIsAutoFlipping(false);
  };

  const jumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(jumpInput);
    if (!isNaN(val)) {
      animateToPage(val);
      setJumpInput("");
    }
  };

  const currentYear = entries[0] ? new Date(entries[0].createdAt).getFullYear() : new Date().getFullYear();

  return (
    <div className={styles.gridPlaceholder}>
      <div className={`${styles.scene} ${isOpen ? styles.sceneOpen : ""}`}>
        {isOpen && (
          <div className={styles.overlay} onClick={() => !isAutoFlipping && animateToPage(0)} />
        )}

        <div 
          className={`${styles.book} ${isOpen ? styles.opened : ""}`}
          style={{ '--diary-cover': config.color, '--page-color': config.paperColor } as any}
        >
          <div className={styles.binding} />

          {/* Static Back Cover (Anchors the book to realism) */}
          <div className={styles.backCover}>
            <div className={styles.backCoverInner}>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 opacity-10">
                <Globe size={32} />
                <div className="mt-4 text-[9px] uppercase tracking-[0.4em] font-bold">DailyDiary Gen-2</div>
              </div>
            </div>
          </div>

          {/* Cover Leaf (The first flip) */}
          <div 
            className={`${styles.stackPage} ${currentPage > 0 ? styles.flipped : ""}`} 
            style={{ zIndex: 100, '--tz': '10px' } as any}
            onClick={() => !isAutoFlipping && animateToPage(currentPage === 0 ? 1 : 0)}
          >
            <div className={`${styles.pageFront} ${styles.stackCoverFront}`}>
              <div className="relative z-10 text-center text-white flex flex-col items-center">
                <div className="text-5xl mb-6 opacity-80 drop-shadow-md">{config.icon}</div>
                <div className="w-16 h-0.5 bg-white/40 mb-10" />
                <h2 className={styles.entryTitle}>{tplName}</h2>
                <p className={styles.entrySubtitle}>Volume {currentYear}</p>
                <div className="w-16 h-0.5 bg-white/40 mt-10" />
              </div>
              {config.hasLock && <div className={styles.lock}>🔒</div>}
              <div className={styles.strap} />
            </div>
            <div className={`${styles.pageBack} ${styles.stackCoverBack}`}>
              <div className={styles.innerCoverPaper}>
                <div className="h-full w-full flex items-center justify-center italic opacity-30 text-sm font-serif">
                  Property of {tplName}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Entry Pages */}
          {bookPages.map((page, idx) => {
            const pageNum = idx + 1;
            const isFlipped = currentPage > pageNum;
            const zIndex = 100 - pageNum;
            // 9.5px, 9.0px, 8.5px... sequentially behind the cover
            const tz = 10 - (pageNum * 0.5); 
            return (
              <div 
                key={idx} 
                className={`${styles.stackPage} ${styles.entryPage} ${isFlipped ? styles.flipped : ""}`} 
                style={{ zIndex, '--tz': `${tz}px` } as any}
                onClick={() => !isAutoFlipping && animateToPage(isFlipped ? pageNum : pageNum + 1)}
              >
                <div className={styles.pageFront}>{page.front}</div>
                <div className={styles.pageBack}>{page.back}</div>
              </div>
            );
          })}
        </div>

        {/* Controls Overlay - Moved outside .book for better reliability */}
        {isOpen && (
          <>
            <div className={styles.sideControls} onClick={e => e.stopPropagation()}>
              <button 
                className={styles.navArrow} 
                onClick={() => animateToPage(currentPage - 1)} 
                disabled={currentPage === 0 || isAutoFlipping}
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                className={styles.navArrow} 
                onClick={() => animateToPage(currentPage + 1)} 
                disabled={currentPage === totalFlipPages || isAutoFlipping}
              >
                <ChevronRight size={32} />
              </button>
            </div>

            <div className={styles.bottomControls} onClick={e => e.stopPropagation()}>
              <form onSubmit={jumpToPage} className={styles.jumpForm}>
                <span className={styles.jumpLabel}>Page</span>
                <input 
                  type="number" 
                  value={jumpInput} 
                  onChange={e => setJumpInput(e.target.value)} 
                  className={styles.jumpInput}
                  placeholder={String(currentPage)}
                />
                <button type="submit" className={styles.jumpBtn}>Go</button>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <button 
                  type="button" 
                  className={styles.closeBtnAlt} 
                  onClick={() => animateToPage(0)}
                >
                  Close
                </button>
              </form>
            </div>
          </>
        )}
      </div>
      
      {/* Hidden Measuring Container - MUST MATCH ACTUAL CONTENT WIDTH (400px - 48px - 48px - 8px padding = 296px) */}
      <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', top: '-9999px', width: '296px' }}>
        {entries.map(entry => {
          let cleanBody = entry.body.trim();
          if (!cleanBody.startsWith('<')) {
            cleanBody = cleanBody.replace(/^([^<]+?)(?:\r\n|\r|\n|$)/gm, '<p>$1</p>');
          }
          return (
            <div 
              id={`measure-${entry.id}`} 
              key={`measure-${entry.id}`}
              className={`text-[14px] leading-[24px] pr-2 font-medium ${styles.tiptapContent}`} 
              style={{ fontFamily: '"Inter", sans-serif' }}
              dangerouslySetInnerHTML={{ __html: cleanBody }} 
            />
          );
        })}
      </div>
    </div>
  );
}

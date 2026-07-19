"use client";
import { sanitizeHtml } from "@/lib/sanitize";
import { API_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { Heart, Zap, Sparkles, BookHeart, Calendar, Clock, Printer } from "lucide-react";

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

export default function ExportPrintPage() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);

  
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
          // Sort entries by date ascending for chronologically ordered book
          const sorted = (data.entries || []).sort(
            (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setEntries(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch print entries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [user]);

  // Trigger print once loading finishes and entries are rendered
  useEffect(() => {
    if (entries.length > 0 && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [entries, loading]);

  if (!initialized || !user) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#64748b' }}>Authenticating...</div>;
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#64748b' }}>Decrypting and preparing your journal print...</div>;
  }

  if (entries.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', padding: '32px', textAlign: 'center', color: '#64748b' }}>
        <h2>No entries found to export</h2>
        <p>Start writing in your journal first, then return here to print.</p>
        <button onClick={() => window.close()} style={{ marginTop: '16px', padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: 'none' }}>Close Window</button>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media screen {
          body {
            background-color: #f1f5f9;
            color: #1e293b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 40px 20px;
          }
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            padding: 60px 50px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            border-radius: 12px;
          }
          .print-header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 40px;
          }
          .print-btn {
            background-color: #5F8575;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-btn:hover {
            background-color: #4F7062;
          }
        }

        @media print {
          body {
            background-color: #ffffff;
            color: #000000;
            font-family: Georgia, serif;
            margin: 0;
            padding: 0;
          }
          .print-container {
            box-shadow: none;
            padding: 0;
          }
          .print-header-bar {
            display: none !important;
          }
          .entry-page {
            page-break-after: always;
            page-break-inside: avoid;
            padding-top: 20px;
          }
        }

        .entry-page {
          border-bottom: 1px dashed #e2e8f0;
          padding-bottom: 40px;
          margin-bottom: 40px;
        }
        
        .entry-page:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        @media print {
          .entry-page {
            border-bottom: none;
            margin-bottom: 0;
          }
        }

        .title {
          font-family: Georgia, serif;
          font-size: 2.2rem;
          margin: 0 0 8px 0;
          color: #0f172a;
        }
        @media print {
          .title { color: #000000; }
        }

        .meta {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 24px;
        }
        @media print {
          .meta { color: #334155; }
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .responses-box {
          background-color: #f8fafc;
          border-left: 4px solid #5F8575;
          padding: 16px 20px;
          margin-bottom: 24px;
          border-radius: 0 8px 8px 0;
        }
        @media print {
          .responses-box {
            background-color: #ffffff;
            border-left: 3px solid #000000;
          }
        }

        .response-row {
          margin-bottom: 12px;
        }
        .response-row:last-child {
          margin-bottom: 0;
        }
        .response-label {
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 2px;
        }
        .response-value {
          font-size: 1.05rem;
          color: #0f172a;
        }
        @media print {
          .response-label { color: #334155; }
          .response-value { color: #000000; }
        }

        .body-text {
          font-size: 1.1rem;
          line-height: 1.7;
          color: #1e293b;
        }
        @media print {
          .body-text {
            color: #000000;
            line-height: 1.8;
          }
        }

        .body-text p {
          margin: 0 0 16px 0;
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        .image-card {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .image-card img {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
        }
        @media print {
          .image-card {
            border: none;
            page-break-inside: avoid;
          }
          .image-card img {
            max-height: 250px;
            object-fit: contain;
          }
        }
      `}</style>

      <div className="print-container">
        <div className="print-header-bar">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>DailyDiary.in Journal Export</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Contains {entries.length} reflections from {new Date(entries[0].createdAt).toLocaleDateString()} to {new Date(entries[entries.length - 1].createdAt).toLocaleDateString()}
            </p>
          </div>
          <button className="print-btn" onClick={() => window.print()}>
            <Printer size={18} /> Print Journal
          </button>
        </div>

        {entries.map((entry) => {
          const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          });
          const timeStr = new Date(entry.createdAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
          });

          // Filter out the main text responses from standard answers block
          const filteredResponses = (entry.responses || []).filter(
            r => !r.fieldLabel.toLowerCase().includes("write freely") && !r.fieldLabel.toLowerCase().includes("notes")
          );

          // Standard formatting logic
          let cleanBody = entry.body.trim();
          if (entry.template?.name === "Personal Journal") {
            cleanBody = cleanBody.replace(/^Write freely\.\.\.:\s*/i, '');
          }
          if (!cleanBody.startsWith('<')) {
            cleanBody = cleanBody.replace(/^([^<]+?)(?:\r\n|\r|\n|$)/gm, '<p>$1</p>');
          }

          return (
            <div key={entry.id} className="entry-page">
              <h2 className="title">{entry.template?.name || "Personal Journal"}</h2>
              
              <div className="meta">
                <div className="meta-item">
                  <Calendar size={14} /> {dateStr}
                </div>
                <div className="meta-item">
                  <Clock size={14} /> {timeStr}
                </div>
              </div>

              {filteredResponses.length > 0 && (
                <div className="responses-box">
                  {filteredResponses.map((r, i) => (
                    <div key={i} className="response-row">
                      <div className="response-label">{r.fieldLabel}</div>
                      <div className="response-value">{r.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {cleanBody && (
                <div 
                  className="body-text"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(cleanBody) }}
                />
              )}

              {entry.images && entry.images.length > 0 && (
                <div className="images-grid">
                  {entry.images.map((img) => (
                    <div key={img.id} className="image-card">
                      <img src={img.url} alt="Journal media attachment" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}


"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft, Mail, MessageSquare, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setStatus("🎉 Message sent! Our support team will get back to you within 24 hours.");
    setEmail("");
    setMessage("");
    setTimeout(() => setStatus(null), 5000);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans), sans-serif",
      padding: "40px 20px"
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Navigation */}
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border)"
        }}>
          <Link href="/" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "var(--primary)"
          }}>
            <BookOpen size={24} strokeWidth={2.5} />
            <span>DailyDiary<span style={{ color: "var(--accent)" }}>.in</span></span>
          </Link>
          <Link href="/" className="btn btn-secondary" style={{ display: "inline-flex", gap: "6px", padding: "8px 16px" }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </header>

        <main style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "32px"
        }}>
          {/* Info Card */}
          <div className="glass-card" style={{
            padding: "40px",
            background: "var(--bg-glass)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            height: "fit-content"
          }}>
            <div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: "12px" }}>Get in Touch</h1>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                Have questions about our AES-256 client-side encryption? Or feedback on streaks and badges? We'd love to hear from you.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  background: "rgba(95, 133, 117, 0.1)",
                  color: "var(--primary)",
                  padding: "10px",
                  borderRadius: "50%",
                  display: "flex"
                }}>
                  <Mail size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Email Support</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>support@dailydiary.in</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  background: "rgba(95, 133, 117, 0.1)",
                  color: "var(--primary)",
                  padding: "10px",
                  borderRadius: "50%",
                  display: "flex"
                }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Community Feedback</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>feedback@dailydiary.in</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  background: "rgba(95, 133, 117, 0.1)",
                  color: "var(--primary)",
                  padding: "10px",
                  borderRadius: "50%",
                  display: "flex"
                }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Office</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Bangalore, India</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="glass-card" style={{
            padding: "40px",
            background: "var(--bg-glass)",
            borderRadius: "var(--radius-lg)"
          }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px" }}>Send us a Message</h2>
            
            {status && (
              <div style={{
                background: "rgba(102, 187, 106, 0.15)",
                color: "var(--success)",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                marginBottom: "20px",
                fontSize: "0.9rem",
                fontWeight: 500
              }}>
                {status}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Your Message</label>
                <textarea
                  className="textarea-field"
                  placeholder="Tell us how we can help..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  style={{ minHeight: "150px" }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", gap: "8px", padding: "14px" }}>
                <Send size={18} /> Send Message
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Style for Form Card Layout responsiveness */}
      <style jsx global>{`
        @media (max-width: 768px) {
          main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

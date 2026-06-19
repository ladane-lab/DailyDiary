"use client";

import Link from "next/link";
import { BookOpen, ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans), sans-serif",
      padding: "40px 20px"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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

        {/* Content Card */}
        <main className="glass-card" style={{
          padding: "48px",
          background: "var(--bg-glass)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div style={{
              background: "rgba(95, 133, 117, 0.1)",
              color: "var(--primary)",
              padding: "12px",
              borderRadius: "50%"
            }}>
              <Shield size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 800 }}>Privacy Policy</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Last updated: June 16, 2026</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>1. Information We Collect</h2>
              <p>
                At DailyDiary.in, we take your privacy extremely seriously. Because we offer server-side and client-side encryption, your journal entry contents are encrypted before they hit our database. We collect:
              </p>
              <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong>Account Information:</strong> Your name, email address, and authentication tokens provided by Firebase.</li>
                <li><strong>Journal Metadata:</strong> Non-sensitive properties like template IDs, streaks, and timestamps required to run streaks and challenge logic.</li>
                <li><strong>Images:</strong> Photos you explicitly upload to decorate your public/private entries, which are securely hosted.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>2. How We Protect Your Data</h2>
              <p>
                All journal entry bodies are encrypted using <strong>AES-256-GCM</strong>. In Premium tier, entries can be encrypted locally on your device with a Master Key that never leaves your browser, meaning even our server administrators cannot read your reflections.
              </p>
            </section>

            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>3. Data Sharing</h2>
              <p>
                We do not sell, trade, or share your personal data with third-party advertising companies. Your private journal entries are visible only to you. Public entries you choose to post on the Community Feed are accessible to all platform users.
              </p>
            </section>

            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>4. Your Rights</h2>
              <p>
                You have the absolute right to export all your journal data at any time, delete individual posts, or permanently close your account (which deletes all your data from our database).
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

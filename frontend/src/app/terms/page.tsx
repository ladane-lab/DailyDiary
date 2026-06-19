"use client";

import Link from "next/link";
import { BookOpen, ArrowLeft, Scale } from "lucide-react";

export default function TermsPage() {
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
              <Scale size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 800 }}>Terms of Service</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Last updated: June 16, 2026</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>1. Acceptance of Terms</h2>
              <p>
                By creating an account or accessing the DailyDiary.in journaling platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, you must not use our service.
              </p>
            </section>

            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>2. Use of Service</h2>
              <p>
                You are solely responsible for maintaining the confidentiality of your credentials (including your encryption keys). You agree to use the service only for lawful purposes. You must not:
              </p>
              <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>Post illegal, harmful, or abusive content in public Community entries.</li>
                <li>Attempt to bypass the service's encryption layers or reverse-engineer the API.</li>
                <li>Use automated scripts to write entries or spam the public feed.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>3. Data & Intellectual Property</h2>
              <p>
                You retain full ownership and copyright of any content you write or upload on DailyDiary.in. By choosing to share a post in the Community Feed, you grant us a non-exclusive license to display this content on the platform to other users.
              </p>
            </section>

            <section>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>4. Termination of Accounts</h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate our community standards on the public feed. You may request deletion of all your data at any time through the Settings page.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

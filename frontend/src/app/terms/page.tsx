"use client";

import Link from "next/link";
import { BookOpen, ArrowLeft, ShieldCheck, Scale } from "lucide-react";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo/Logo";

export default function TermsPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Check initially
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)", // Reverted back to the standard, light website background color
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans), sans-serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: isMobile ? "0px" : "clamp(12px, 3vw, 40px)", // No outer padding on mobile so card fills screen
      overflow: "hidden"
    }}>
      <div className="glass-card" style={{
        width: "100%",
        maxWidth: "900px",
        height: isMobile ? "100dvh" : "calc(100vh - clamp(24px, 6vw, 80px))", // Full height on mobile
        maxHeight: isMobile ? "none" : "900px",
        background: "var(--bg-glass)",
        borderRadius: isMobile ? "0px" : "24px", // No border radius on mobile
        boxShadow: isMobile ? "none" : "0 25px 50px -12px rgba(0, 0, 0, 0.15)", // Softer shadow
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: isMobile ? "none" : "1px solid var(--border)"
      }}>
        
        {/* Header - Fixed */}
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "16px 20px" : "20px 32px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          flexShrink: 0
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={isMobile ? 28 : 32} />
          </Link>
          <Link href="/" className="btn btn-secondary" style={{ 
            display: "inline-flex", 
            gap: "6px", 
            padding: isMobile ? "8px 12px" : "10px 20px", 
            borderRadius: "10px", 
            fontWeight: "600", 
            border: "1px solid var(--border)",
            alignItems: "center",
            whiteSpace: "nowrap"
          }}>
            <ArrowLeft size={16} /> <span>{isMobile ? "Back" : "Back to App"}</span>
          </Link>
        </header>

        {/* Content Area - Scrollable */}
        <main style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: isMobile ? "32px 20px 60px 20px" : "40px 48px",
          color: "var(--text-secondary)",
          WebkitOverflowScrolling: "touch"
        }}>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "12px", marginBottom: "40px" }}>
            <div style={{
              background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
              color: "white",
              padding: isMobile ? "10px" : "14px",
              borderRadius: "16px",
              boxShadow: "0 8px 20px rgba(86, 121, 106, 0.25)",
              marginBottom: "4px"
            }}>
              <ShieldCheck size={isMobile ? 24 : 32} strokeWidth={2} />
            </div>
            <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
              Terms of Service
            </h1>
            <p style={{
              background: "var(--bg-secondary)",
              padding: "6px 16px",
              borderRadius: "30px",
              fontSize: "0.9rem",
              fontWeight: 600,
              border: "1px solid var(--border)",
              marginTop: "4px"
            }}>
              Last updated: August 9, 2026
            </p>
          </div>

          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            
            <section style={{ background: "var(--bg-glass)", padding: "clamp(16px, 4vw, 32px)", borderRadius: "16px", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", marginBottom: "32px" }}>
              <p style={{ fontSize: "1rem", lineHeight: "1.7", color: "var(--text-primary)" }}>Welcome to DailyDiary.in. These Terms of Service ("Terms") govern your access to and use of the DailyDiary.in journaling platform, including personal diary features, the Community Feed, accounts, profiles, and other services provided through the platform.</p>
              <p style={{ marginTop: "16px", fontSize: "1rem", lineHeight: "1.7", color: "var(--text-primary)" }}>By creating an account, accessing, or using DailyDiary.in, you agree to these Terms. If you do not agree with these Terms, you must not use the service.</p>
            </section>
            
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>1.</span> Acceptance of Terms
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>By creating an account or accessing DailyDiary.in, you confirm that you have read, understood, and agreed to these Terms of Service.</p>
                <p>You are responsible for using DailyDiary.in in accordance with these Terms and all applicable laws and regulations.</p>
                <p>DailyDiary.in may update these Terms from time to time. The "Last updated" date at the top of this page will indicate when changes were made.</p>
              </div>
            </section>
            
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>2.</span> Description of the Service
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in is a journaling platform that allows users to:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Create and manage personal diary entries.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Organize and view their diary entries.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Upload supported images.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Maintain a personal profile.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Choose whether supported content is private or shared publicly.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Share selected content through the Community Feed.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Interact with publicly available content according to the features provided by the platform.</li>
                </ul>
                <p>DailyDiary.in may modify, add, or remove features from the service as necessary to maintain, improve, secure, or develop the platform.</p>
              </div>
            </section>
            
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>3.</span> User Responsibility
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>You are solely responsible for the content that you create, upload, store, or publish through your account. This includes:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Text you write.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Images you upload.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Content you publish to the Community Feed.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Links or other information you include in public content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Your use of the platform.</li>
                </ul>
                <p>You agree that you will not use DailyDiary.in for unlawful, harmful, abusive, fraudulent, or malicious purposes.</p>
              </div>
            </section>
            
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>4.</span> Prohibited Content and Activities
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>You must not use DailyDiary.in to create, upload, or publish content that:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Is illegal or promotes illegal activities.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Contains threats or credible encouragement of violence.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Promotes or encourages harm toward another person.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Contains harassment, bullying, or targeted abuse.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Contains hate speech or hateful attacks against individuals or groups.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Contains sexually explicit or pornographic material.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Contains excessively graphic or disturbing violence.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Encourages suicide or self-harm.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Promotes dangerous or harmful activities.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Contains scams, phishing attempts, or fraudulent content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Contains malicious links or software.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Is intended to distribute malware or compromise another user's device or account.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Constitutes spam or unwanted promotional content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Consists of excessive or repeated posts intended to manipulate or disrupt the Community Feed.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Infringes another person's copyright, trademark, privacy, or other legal rights.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Impersonates another person or attempts to mislead users about the identity of the content creator.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Attempts to bypass DailyDiary.in's security, moderation, authentication, rate-limiting, or access-control mechanisms.</li>
                </ul>
              </div>
            </section>
            
            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>5.</span> Community Feed
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>The Community Feed is intended for normal, respectful, and safe user-generated content.</p>
                <p>By publishing content to the Community Feed, you understand that the content may become visible to other users according to the platform's current functionality.</p>
                <p>You are responsible for ensuring that content you intentionally publish publicly complies with these Terms.</p>
                <p>DailyDiary.in does not endorse, approve, or necessarily represent the opinions, statements, or views expressed in user-generated content.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>6.</span> User-Generated Content and Legal Responsibility
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>Users are responsible for the content they create, upload, and publish.</p>
                <p>To the extent permitted by applicable law, users are responsible for the legal consequences of content or conduct that they unlawfully publish or perform through DailyDiary.in.</p>
                <p>DailyDiary.in is a platform that provides tools for users to create and share content. The presence of user-generated content on the platform does not mean that DailyDiary.in endorses, approves, or adopts that content.</p>
                <p>To the extent permitted by applicable law, DailyDiary.in and its owner/operators do not assume responsibility for user-generated content merely because that content is stored, displayed, or made available through the platform.</p>
                <p>Nothing in these Terms is intended to exclude or limit any liability that cannot legally be excluded or limited under applicable law.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>7.</span> Content Moderation and Safety
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in may use automated rule-based content safety mechanisms to help protect the Community Feed.</p>
                <p>These mechanisms may analyze public content for signals associated with:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Abusive or offensive language.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Sexual or explicit content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Harassment.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Hate speech.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Threats.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Violence.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Self-harm encouragement.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Spam.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Repeated content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Suspicious links.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Other violations of these Terms.</li>
                </ul>
                <p>Text may be normalized and checked against moderation rules and patterns. Uploaded images may also undergo technical validation, including file type, file signature, size, and other security checks.</p>
                
                <div style={{ background: "rgba(208, 100, 61, 0.1)", borderLeft: "4px solid var(--accent)", padding: "16px", borderRadius: "0 8px 8px 0", marginTop: "8px", color: "var(--text-primary)" }}>
                  <p style={{ fontWeight: "bold", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><Scale size={18} /> Important limitation</p>
                  <p style={{ fontSize: "0.95rem" }}>Automated moderation systems cannot guarantee that every violation will be detected. A post that passes automated checks does not mean that the content has been officially approved by DailyDiary.in. Users may report content that they believe violates these Terms.</p>
                </div>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>8.</span> Content Removal
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in reserves the right to remove or restrict content that:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Violates these Terms.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Is reported as potentially harmful or prohibited.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Creates a security or abuse risk.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Appears to violate applicable law.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Is otherwise considered inappropriate for the Community Feed.</li>
                </ul>
                <p>Content may be rejected before publication or removed after publication. DailyDiary.in may take action without providing advance notice where immediate action is reasonably necessary to protect users, the platform, or the public.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>9.</span> User Reporting
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>Users may report Community Feed content that they believe violates these Terms. Reports may include categories such as:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Sexual or explicit content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Harassment or bullying.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Hate speech.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Threats or violence.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Self-harm content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Spam.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Scam or phishing.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Other inappropriate content.</li>
                </ul>
                <p>DailyDiary.in may review reported content and take appropriate action. Submitting false, malicious, or abusive reports repeatedly may itself result in restrictions on the reporting account.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>10.</span> Moderation Decisions
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>Depending on the nature and severity of a violation, DailyDiary.in may:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Reject a post.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Remove a published post.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Restrict a user's ability to create public posts.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Temporarily restrict an account.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Suspend an account.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Permanently terminate an account.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Remove or restrict a user's profile.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Take other reasonable measures necessary to protect the platform and its users.</li>
                </ul>
                <p>Repeated violations may result in progressively stronger enforcement. Severe violations may result in immediate account suspension or termination.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>11.</span> Account and Profile Restrictions
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in may restrict, suspend, disable, or terminate an account or profile when reasonably necessary due to:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Repeated violations of these Terms.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Serious prohibited content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Spam or platform abuse.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Fraudulent activity.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Attempts to bypass security controls.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Attempts to compromise the platform.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Threats to other users.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Illegal activity involving the platform.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Other serious abuse of the service.</li>
                </ul>
                <p>Account restrictions may affect access to public posting, profiles, Community Feed features, or other platform functionality.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>12.</span> Account and Data Deletion
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>You may request deletion of your DailyDiary.in account and associated data through the available account/settings functionality.</p>
                <p>Where supported by the platform, account deletion may result in the removal of:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Your user profile.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Your personal account information.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Your diary entries.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Your uploaded content.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Your associated account data.</li>
                </ul>
                <p>However, some information may be retained for a limited period when reasonably necessary for:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Security and abuse prevention.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Fraud prevention.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Legal compliance.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Resolving disputes.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Preventing repeated abuse.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Protecting the rights and safety of users.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Responding to valid legal requests.</li>
                </ul>
                <p>Retention of such information does not mean that the account remains publicly active.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>13.</span> Public Content and Deletion
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>When you voluntarily publish content to the Community Feed, other users may be able to view, save, copy, screenshot, or otherwise retain that content.</p>
                <p>If you later delete the content or your account, DailyDiary.in may remove content from its systems according to its deletion processes, but DailyDiary.in cannot guarantee the deletion of copies that have already been obtained or stored by other users or third parties outside its control.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>14.</span> Ownership of Your Content
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>You retain ownership and applicable intellectual-property rights in the original content that you create and upload to DailyDiary.in.</p>
                <p>DailyDiary.in does not claim ownership of your original diary entries, images, or other original user-generated content.</p>
                <p>By choosing to publish content through the Community Feed, you grant DailyDiary.in a non-exclusive license to store, process, display, and distribute that content as reasonably necessary to operate and provide the Community Feed and related platform functionality.</p>
                <p>This license does not transfer ownership of your content to DailyDiary.in.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>15.</span> Copyright and Intellectual Property
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>You must not upload or publish content that infringes another person's copyright, trademark, or other intellectual-property rights.</p>
                <p>If you believe that content on DailyDiary.in infringes your rights, you may report the relevant content through the appropriate reporting or support mechanism provided by the platform.</p>
                <p>DailyDiary.in may remove content that it reasonably believes violates intellectual-property rights or applicable law.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>16.</span> Account Security
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>You are responsible for maintaining the security of your account and authentication credentials. You must not:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Share your account credentials intentionally.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Allow unauthorized persons to use your account.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Attempt to access another user's account.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Attempt to bypass authentication.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Attempt to obtain another user's private diary information.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Attempt to compromise DailyDiary.in's authentication or security systems.</li>
                </ul>
                <p>You should report suspected unauthorized access or security issues through the appropriate DailyDiary.in support channel.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>17.</span> Security and Abuse Prevention
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in may use reasonable technical and organizational measures to protect the platform, its users, and its services. These measures may include:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                  {['Authentication and access controls', 'Rate limiting and abuse prevention', 'Request and input validation', 'CSRF and CORS protections', 'Automated abuse and spam detection', 'File and upload validation', 'Content safety and moderation checks', 'Security monitoring and logging', 'Other measures reasonably necessary to maintain platform security'].map(i => (
                    <span key={i} style={{ background: "rgba(86, 121, 106, 0.08)", border: "1px solid rgba(86, 121, 106, 0.2)", padding: "4px 12px", borderRadius: "16px", fontSize: "0.85rem", fontWeight: "600", color: "var(--primary)" }}>{i}</span>
                  ))}
                </div>
                <p>Users must not attempt to bypass, disable, interfere with, circumvent, or exploit security, authentication, moderation, rate-limiting, or other protective mechanisms used by DailyDiary.in.</p>
                <p>DailyDiary.in may restrict, suspend, or terminate access where it reasonably believes that a user has attempted to compromise the security or integrity of the platform.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>18.</span> Automated Systems and Moderation
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in may use automated systems and technologies to assist with:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                  {['Security and abuse prevention', 'Spam and bot detection', 'Rate limiting', 'Content safety and moderation', 'File and upload validation', 'Fraud or suspicious-activity detection', 'Platform reliability and performance'].map(i => (
                    <span key={i} style={{ background: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: "16px", fontSize: "0.85rem", fontWeight: "600" }}>{i}</span>
                  ))}
                </div>
                <p>Automated systems may make mistakes and do not guarantee that all harmful, abusive, illegal, or inappropriate content will be detected or prevented. DailyDiary.in may use human or administrative review, where appropriate, to investigate reports, appeals, suspicious activity, or potential violations of these Terms.</p>
                <p>DailyDiary.in may take appropriate action based on automated signals, user reports, investigations, or administrative review, including removing content, restricting features, suspending accounts, or terminating accounts where permitted by these Terms.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>19.</span> Legal Requests and Cooperation
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in may preserve, disclose, or provide information when reasonably necessary to:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Comply with applicable law.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Respond to valid legal processes or requests from competent authorities.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Protect the safety of users or other persons.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Investigate fraud, abuse, or security incidents.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Protect the rights, property, or security of DailyDiary.in.</li>
                </ul>
                <p>Any disclosure will be handled according to applicable legal requirements and the platform's applicable privacy practices.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>20.</span> Service Availability
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in is provided on an ongoing development basis. We may temporarily suspend, modify, or discontinue portions of the service for:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Maintenance.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Security updates.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Infrastructure changes.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Technical issues.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Service improvements.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Emergency situations.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Other operational reasons.</li>
                </ul>
                <p>We do not guarantee that the service will always be available, uninterrupted, or error-free.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>21.</span> No Guarantee of Content Safety
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in uses reasonable technical and administrative measures to help prevent prohibited content from appearing in the Community Feed.</p>
                <p>However, no automated moderation or security system can guarantee that all harmful, abusive, illegal, or inappropriate content will be detected or removed immediately. Users should report content that they believe violates these Terms.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>22.</span> Disclaimer Regarding User Conduct
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in is not responsible for a user's independent actions, statements, or unlawful conduct merely because the user has an account or uses the platform.</p>
                <p>Users remain responsible for their own actions and content. Nothing in these Terms removes or limits rights or liabilities that cannot legally be excluded or limited under applicable law.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>23.</span> Termination of Accounts
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in may suspend or terminate an account when the account or its use violates these Terms or presents a significant security, safety, or abuse risk.</p>
                <p>Termination may result in:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>Loss of access to the account.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Removal or restriction of the user's profile.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Removal of public posts.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Restriction of future registration or posting.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Deletion of associated data subject to applicable retention requirements.</li>
                </ul>
                <p>You may also stop using the service and request account deletion through the available account settings.</p>
              </div>
            </section>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <span style={{ color: "var(--primary)" }}>24.</span> Changes to These Terms
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "1rem", lineHeight: "1.6" }}>
                <p>DailyDiary.in may modify these Terms when necessary. Changes may be made to reflect:</p>
                <ul style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "square", color: "var(--primary)" }}>
                  <li style={{ color: "var(--text-secondary)" }}>New features.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Security improvements.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Changes to moderation practices.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Legal or regulatory requirements.</li>
                  <li style={{ color: "var(--text-secondary)" }}>Changes to the platform.</li>
                </ul>
                <p>The updated version will be published on this page with a revised "Last updated" date.</p>
                <p>Your continued use of DailyDiary.in after the updated Terms become effective constitutes acceptance of the revised Terms, to the extent permitted by applicable law.</p>
              </div>
            </section>

            <section style={{ background: "rgba(86, 121, 106, 0.05)", padding: "20px", borderRadius: "12px", borderLeft: "4px solid var(--primary)" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span style={{ color: "var(--primary)" }}>25.</span> Contact
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: "1.6" }}>If you have questions about these Terms, content moderation, account restrictions, or other platform-related matters, please use the support/contact mechanism provided by DailyDiary.in.</p>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}

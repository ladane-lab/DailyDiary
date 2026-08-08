"use client";
import Link from "next/link";
import Script from "next/script";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Logo from "@/components/Logo/Logo";
import styles from "./auth.module.css";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error, login, loginWithGoogle, sendPasswordReset, clearError, initialized } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // Security challenge states
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (initialized && user) {
      router.push("/dashboard");
    }
  }, [user, initialized, router]);

  // Bind Turnstile callback to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).onTurnstileCallback = (token: string) => {
        setTurnstileToken(token);
        clearError();
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).onTurnstileCallback;
      }
    };
  }, [clearError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (forgotMode) {
      try {
        await sendPasswordReset(email);
        setResetSent(true);
      } catch (err) {
        // Handle client-side reset error
      }
    } else {
      try {
        await login(email, password, turnstileToken);
      } catch (err: any) {
        if (err instanceof Error && err.message === 'SECURITY_CHALLENGE_REQUIRED') {
          setShowTurnstile(true);
        }
      }
    }
  };

  return (
    <div className={styles.authPage}>
      {/* Cloudflare Turnstile script */}
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />

      <div className={styles.authBg}>
        <div className={styles.authOrb1} />
        <div className={styles.authOrb2} />
      </div>

      <div className={styles.authContainer}>
        <Link href="/" className={styles.authLogo} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
          <Logo size={40} />
        </Link>

        <div className={`glass-card ${styles.authCard}`}>
          <h1 className={styles.authTitle}>{forgotMode ? "Reset Password" : "Welcome Back"}</h1>
          <p className={styles.authSubtitle}>
            {forgotMode 
              ? "Enter your email to receive a password reset link" 
              : "Sign in to continue journaling"}
          </p>

          {error && error !== 'SECURITY_CHALLENGE_REQUIRED' && (
            <div className={styles.authError}>
              <span>⚠️</span> {error}
            </div>
          )}

          {resetSent && (
            <div className={styles.authSuccess} style={{ backgroundColor: 'rgba(102, 187, 106, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> Password reset link sent! Check your email inbox.
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            {/* Honeypot Fields (display:none) */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <input type="text" name="website_honey" tabIndex={-1} autoComplete="off" />
              <input type="text" name="email_honey" tabIndex={-1} autoComplete="off" />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="login-email"
              />
            </div>

            {!forgotMode && (
              <div className={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className={styles.fieldLabel} style={{ marginBottom: 0 }}>Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setForgotMode(true); setResetSent(false); clearError(); setShowTurnstile(false); setTurnstileToken(""); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="login-password"
                />
              </div>
            )}

            {/* Cloudflare Turnstile Challenge Container */}
            {showTurnstile && (
              <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Please solve the challenge below:</p>
                <div 
                  className="cf-turnstile" 
                  data-sitekey={TURNSTILE_SITE_KEY}
                  data-callback="onTurnstileCallback"
                />
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary ${styles.authBtn}`}
              disabled={loading || (showTurnstile && !turnstileToken)}
              id="login-submit"
            >
              {loading 
                ? (forgotMode ? "Sending..." : "Signing in...") 
                : (forgotMode ? "Send Reset Link" : "Sign In")}
            </button>
          </form>

          {forgotMode ? (
            <p className={styles.authFooter}>
              <button 
                type="button" 
                onClick={() => { setForgotMode(false); setResetSent(false); clearError(); setShowTurnstile(false); setTurnstileToken(""); }} 
                className={styles.authLink}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Back to Sign In
              </button>
            </p>
          ) : (
            <>
              <div className={styles.divider}>
                <span>or</span>
              </div>

              <button
                onClick={loginWithGoogle}
                className={`btn btn-google ${styles.authBtn}`}
                disabled={loading}
                id="google-login"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              <p className={styles.authFooter}>
                Don&apos;t have an account?{" "}
                <Link href="/register" className={styles.authLink}>
                  Sign up free
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

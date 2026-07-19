"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Logo from "@/components/Logo/Logo";
import styles from "./auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error, login, loginWithGoogle, sendPasswordReset, clearError, initialized } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  
  useEffect(() => {
    if (initialized && user) {
      router.push("/dashboard");
    }
  }, [user, initialized, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (forgotMode) {
      try {
        await sendPasswordReset(email);
        setResetSent(true);
      } catch (err) {
        // Error state handled in store
      }
    } else {
      await login(email, password);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authBg}>
        <div className={styles.authOrb1} />
        <div className={styles.authOrb2} />
      </div>

      <div className={styles.authContainer}>
        <a href="/" className={styles.authLogo} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
          <Logo size={40} />
        </a>

        <div className={`glass-card ${styles.authCard}`}>
          <h1 className={styles.authTitle}>{forgotMode ? "Reset Password" : "Welcome Back"}</h1>
          <p className={styles.authSubtitle}>
            {forgotMode 
              ? "Enter your email to receive a password reset link" 
              : "Sign in to continue journaling"}
          </p>

          {error && (
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
                    onClick={() => { setForgotMode(true); setResetSent(false); clearError(); }} 
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

            <button
              type="submit"
              className={`btn btn-primary ${styles.authBtn}`}
              disabled={loading}
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
                onClick={() => { setForgotMode(false); setResetSent(false); clearError(); }} 
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
                <a href="/register" className={styles.authLink}>
                  Sign up free
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

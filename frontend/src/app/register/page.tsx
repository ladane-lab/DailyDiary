"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Logo from "@/components/Logo/Logo";
import styles from "./auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, error, register, loginWithGoogle, clearError, initialized } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  
  useEffect(() => {
    if (initialized && user) {
      router.push("/dashboard");
    }
  }, [user, initialized, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters long.");
      return;
    }
    await register(name, email, password);
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
          <h1 className={styles.authTitle}>Create Account</h1>
          <p className={styles.authSubtitle}>Start your journaling journey today</p>

          {(localError || error) && (
            <div className={styles.authError}>
              <span>⚠️</span> {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={name}
                onChange={(e) => { setName(e.target.value); setLocalError(null); clearError(); }}
                required
                id="register-name"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLocalError(null); clearError(); }}
                required
                id="register-email"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLocalError(null); clearError(); }}
                required
                minLength={8}
                id="register-password"
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${styles.authBtn}`}
              disabled={loading}
              id="register-submit"
            >
              {loading ? "Creating account..." : "Create Free Account"}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            onClick={loginWithGoogle}
            className={`btn btn-google ${styles.authBtn}`}
            disabled={loading}
            id="google-register"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className={styles.authFooter}>
            Already have an account?{" "}
            <a href="/login" className={styles.authLink}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

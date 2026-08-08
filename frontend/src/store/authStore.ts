import { API_URL } from "@/lib/api";
import { create } from 'zustand';
import {
  auth,
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  User,
} from '@/lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (name: string, email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initAuth: () => () => void;
}

// Helpers for Fingerprinting and CSRF
function getBrowserFingerprint(): string {
  if (typeof window === 'undefined') return '';
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
  ];
  const str = components.join('###');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return 'fp-' + Math.abs(hash).toString(16);
}

function getCsrfTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') return decodeURIComponent(value);
  }
  return '';
}

/**
 * Synchronizes client authenticated Firebase identity with the Express backend.
 * Propagates CSRF, fingerprinting, and Turnstile headers to the backend sync API.
 */
async function syncUserToBackend(user: User, turnstileToken?: string): Promise<void> {
  const token = await user.getIdToken();
  const fingerprint = getBrowserFingerprint();
  const csrfToken = getCsrfTokenFromCookie();

  const response = await fetch(`${API_URL}/users/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Device-Fingerprint': fingerprint,
      'X-CSRF-Token': csrfToken,
      'X-Turnstile-Token': turnstileToken || '',
    },
    body: JSON.stringify({
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL,
    }),
  });

  if (!response.ok) {
    const data = await response.json() as any;
    if (data.turnstileRequired) {
      throw new Error('SECURITY_CHALLENGE_REQUIRED');
    }
    throw new Error(data.error || 'Backend synchronization failed');
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  login: async (email, password, turnstileToken) => {
    set({ loading: true, error: null });
    try {
      // 1. Authenticate directly via Firebase SDK
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // 2. Synchronize session with backend & run security checks
      await syncUserToBackend(cred.user, turnstileToken);
      set({ user: cred.user, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', loading: false });
      if (err.message === 'SECURITY_CHALLENGE_REQUIRED') {
        throw err;
      }
    }
  },

  register: async (name, email, password, turnstileToken) => {
    set({ loading: true, error: null });
    try {
      // 1. Create account via Firebase SDK
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // 2. Set user display profile
      await updateProfile(cred.user, { displayName: name });
      // 3. Synchronize session with backend
      await syncUserToBackend(cred.user, turnstileToken);
      set({ user: cred.user, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', loading: false });
      if (err.message === 'SECURITY_CHALLENGE_REQUIRED') {
        throw err;
      }
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserToBackend(cred.user);
      set({ user: cred.user, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Google authentication failed', loading: false });
    }
  },

  sendPasswordReset: async (email) => {
    set({ loading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to send password reset email', loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null });
    } catch (err) {
      console.error('Logout error', err);
    }
  },

  clearError: () => set({ error: null }),

  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, initialized: true, loading: false });
    });
    return unsubscribe;
  },
}));

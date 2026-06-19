import { create } from 'zustand';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged,
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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initAuth: () => () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function syncUserToBackend(user: User) {
  try {
    const token = await user.getIdToken();
    await fetch(`${API_URL}/api/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        firebaseId: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL,
      }),
    });
  } catch (err) {
    console.warn('Backend sync failed (server may be offline):', err);
  }
}

function getFriendlyErrorMessage(err: any): string {
  if (!err || typeof err !== 'object') return 'An unexpected error occurred';
  const code = err.code || '';
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Access to this account has been temporarily disabled. Please reset your password or try again later.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was canceled before completing.';
    default:
      const msg = err.message || '';
      if (msg.includes('Firebase:')) {
        return 'Authentication failed. Please check your credentials.';
      }
      return msg || 'An error occurred during authentication.';
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await syncUserToBackend(cred.user);
      set({ user: cred.user, loading: false });
    } catch (err: unknown) {
      set({ error: getFriendlyErrorMessage(err), loading: false });
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await syncUserToBackend(cred.user);
      set({ user: cred.user, loading: false });
    } catch (err: unknown) {
      set({ error: getFriendlyErrorMessage(err), loading: false });
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserToBackend(cred.user);
      set({ user: cred.user, loading: false });
    } catch (err: unknown) {
      set({ error: getFriendlyErrorMessage(err), loading: false });
    }
  },

  sendPasswordReset: async (email) => {
    set({ loading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email);
      set({ loading: false });
    } catch (err: unknown) {
      set({ error: getFriendlyErrorMessage(err), loading: false });
      throw err;
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null });
  },

  clearError: () => set({ error: null }),

  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, initialized: true, loading: false });
    });
    return unsubscribe;
  },
}));

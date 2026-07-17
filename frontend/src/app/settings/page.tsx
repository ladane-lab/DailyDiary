"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "firebase/auth";
import { 
  Settings, LayoutDashboard, PenLine, CalendarDays, 
  Trophy, Medal, LogOut, Flame, BookOpen, CheckCircle2,
  Trash2, Download, Printer, Bookmark
} from "lucide-react";
import Logo from "@/components/Logo/Logo";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const { user, initialized, initAuth, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<{ totalEntries: number; streak: number; joinedAt: string } | null>(null);

  // Change Password states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete Account state
  const [deleting, setDeleting] = useState(false);

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select a photo smaller than 2MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { storage } = await import("@/lib/firebase");
      
      const ext = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${ext}`;
      const imageRef = ref(storage, `avatars/${user.uid}/${fileName}`);
      
      const snapshot = await uploadBytes(imageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      // Update Firebase Auth profile
      const { updateProfile } = await import("firebase/auth");
      await updateProfile(user, { photoURL: url });

      // Sync to backend DB
      const token = await user.getIdToken();
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      await fetch(`${API}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebaseId: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: url,
        }),
      });
      
      window.location.reload();
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      alert("Failed to upload avatar: " + (err.message || "Unknown error"));
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => { const u = initAuth(); return u; }, [initAuth]);
  useEffect(() => { if (initialized && !user) router.push("/login"); }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || "");
    const fetchStats = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const token = await user.getIdToken();
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalEntries: data._count?.entries ?? 0,
            streak: data.streakCount ?? 0,
            joinedAt: data.createdAt,
          });
        }
      } catch { /* silent */ }
    };
    fetchStats();
  }, [user]);

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (!user) return;
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { updatePassword } = await import("firebase/auth");
      await updatePassword(user, newPassword);
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err: any) {
      console.error("Password update failed:", err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError("For security reasons, this action requires a recent sign-in. Please log out, log back in, and try again.");
      } else {
        setPasswordError(err.message || "Failed to update password. Please try again.");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExportJSON = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API}/api/entries?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const entriesData = data.entries.map((entry: any) => ({
          id: entry.id,
          createdAt: entry.createdAt,
          templateName: entry.template?.name || "Personal Journal",
          body: entry.body,
          isPublic: entry.isPublic,
          theme: entry.theme,
          responses: entry.responses
        }));
        const blob = new Blob([JSON.stringify(entriesData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dailydiary-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("Failed to export entries.");
      }
    } catch (err) {
      console.error("Export JSON failed:", err);
      alert("An error occurred during export.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const ok = confirm("WARNING: Deleting your account will permanently wipe all your diary entries, active challenges, badges, and personal settings from our database. This action is irreversible. Are you sure you want to proceed?");
    if (!ok) return;

    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      // 1. Delete data from backend DB
      const res = await fetch(`${API}/api/users`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete backend user data");
      }

      // 2. Delete user from Firebase Auth
      await user.delete();

      // 3. Log out and go home
      await logout();
      router.push("/");
    } catch (err: any) {
      console.error("Delete account failed:", err);
      if (err.code === 'auth/requires-recent-login') {
        alert("For security reasons, this action requires a recent sign-in. Please sign out, sign in again, and try deleting your account.");
      } else {
        alert("Failed to delete account. Please try again later or contact support.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!initialized || !user) return null;

  const avatarLetter = (user.displayName || user.email || "U")[0].toUpperCase();
  const joinDate = stats?.joinedAt
    ? new Date(stats.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className={styles.page}>
      {/* ── Main ── */}
      <main className={`${styles.main} animate-page-reveal`}>

        <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={32} color="var(--primary)" strokeWidth={2.5} /> Settings
        </h1>

        {/* Profile Card */}
        <div className={`glass-card ${styles.profileCard}`}>
          <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="Avatar" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatar}>{avatarLetter}</div>
            )}
            <label htmlFor="avatar-upload" className={styles.avatarUploadLabel} title="Upload Profile Picture">
              {avatarUploading ? "..." : "📷"}
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
              disabled={avatarUploading}
            />
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{user.displayName || "Anonymous"}</div>
            <div className={styles.profileEmail}>{user.email}</div>
            {stats && (
              <div className={styles.profileMeta}>
                Joined {joinDate} · {stats.streak} day streak · {stats.totalEntries} entries
              </div>
            )}
          </div>
        </div>

        {/* Edit Name */}
        <div className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <form onSubmit={handleSaveName} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Display Name</label>
              <input
                type="text"
                className="input-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                id="settings-name"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className="input-field"
                value={user.email || ""}
                disabled
                style={{ opacity: 0.5, cursor: "not-allowed" }}
              />
              <span className={styles.hint}>Email cannot be changed here.</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              id="save-profile"
            >
              {saved ? <><CheckCircle2 size={16}/> Saved!</> : saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Your Stats</h2>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{stats?.streak ?? "—"}</span>
              <span className={styles.statLbl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={16} color="var(--streak)"/> Day Streak</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{stats?.totalEntries ?? "—"}</span>
              <span className={styles.statLbl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={16} color="var(--primary)"/> Total Entries</span>
            </div>
          </div>
        </div>


        {/* Change Password */}
        <div className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Security</h2>
          <form onSubmit={handleChangePassword} className={styles.form}>
            {passwordError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                ⚠️ {passwordError}
              </div>
            )}
            {passwordSaved && (
              <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginBottom: '12px' }}>
                ✅ Password changed successfully!
              </div>
            )}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={passwordSaving}
            >
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Data Portability */}
        <div className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Data & Activity</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            View your saved posts, download a copy of your journal reflections or print them as a keepsake book.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => router.push("/saved")} className="btn btn-primary" style={{ gap: '8px' }}>
              <Bookmark size={18} /> View Saved Posts
            </button>
            <button onClick={handleExportJSON} className="btn btn-secondary" style={{ gap: '8px' }}>
              <Download size={18} /> Export JSON Data
            </button>
            <button onClick={() => window.open("/export-print", "_blank")} className="btn btn-secondary" style={{ gap: '8px' }}>
              <Printer size={18} /> Export PDF/Print
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`glass-card ${styles.section} ${styles.dangerSection}`}>
          <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Danger Zone</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p className={styles.dangerText} style={{ marginBottom: '8px' }}>Sign out of your account on this device.</p>
              <button onClick={handleLogout} className="btn btn-secondary" id="settings-logout" style={{ gap: '8px', borderColor: 'var(--border)' }}>
                <LogOut size={18} /> Sign Out
              </button>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <p className={styles.dangerText} style={{ marginBottom: '8px', color: 'var(--danger)' }}>Permanently delete your account and wipe all private records under the Indian DPDP Act.</p>
              <button onClick={handleDeleteAccount} className="btn btn-danger" disabled={deleting} style={{ gap: '8px' }}>
                <Trash2 size={18} /> {deleting ? "Deleting Account..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

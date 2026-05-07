"use client";

import { useEffect, useState, useRef } from "react";
import { Editor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  BookOpen, 
  CalendarDays, 
  LayoutDashboard, 
  Medal, 
  PenLine, 
  Settings, 
  Trophy,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Heart,
  Zap,
  Sparkles,
  BookHeart,
  ImagePlus,
  Lock,
  Globe,
  ChevronRight
} from "lucide-react";
import styles from "./write.module.css";

const getApiBase = () => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:5000";
};

interface TemplateField {
  label: string;
  type: "text" | "textarea" | "number" | "emoji" | "rating";
}

interface Template {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
}

const MOOD_EMOJIS = ["😊", "😌", "😐", "😔", "😢", "😡", "🤩", "😴", "🥳", "😰"];

// Fallback templates (used when backend is offline)
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "personal",
    name: "Personal Journal",
    description: "A free-form space for your thoughts.",
    fields: [
      { label: "How are you feeling?", type: "emoji" },
      { label: "Write freely...", type: "textarea" },
    ],
  },
  {
    id: "gratitude",
    name: "Gratitude Journal",
    description: "Focus on positivity and gratitude.",
    fields: [
      { label: "Mood", type: "emoji" },
      { label: "I am grateful for...", type: "text" },
      { label: "Something good that happened", type: "text" },
      { label: "Someone I appreciate", type: "text" },
    ],
  },
  {
    id: "productivity",
    name: "Productivity Journal",
    description: "Track daily tasks, focus, and growth.",
    fields: [
      { label: "Tasks completed today", type: "number" },
      { label: "Focus level (1-10)", type: "rating" },
      { label: "What did I improve today?", type: "text" },
      { label: "Tomorrow's priority", type: "text" },
    ],
  },
  {
    id: "selfcare",
    name: "Self Care Journal",
    description: "Monitor well-being, mood, and sleep.",
    fields: [
      { label: "Mood", type: "emoji" },
      { label: "Sleep hours", type: "number" },
      { label: "Stress level (1-10)", type: "rating" },
      { label: "Self-care activity", type: "text" },
      { label: "Notes", type: "textarea" },
    ],
  },
  {
    id: "finance",
    name: "Finance Journal",
    description: "Track daily finances.",
    fields: [
      { label: "Total expenses today", type: "number" },
      { label: "Income received", type: "number" },
      { label: "Savings goal progress", type: "text" },
      { label: "Notes", type: "textarea" },
    ],
  },
  {
    id: "time",
    name: "Time Management",
    description: "Analyze daily time use.",
    fields: [
      { label: "Most productive hour", type: "text" },
      { label: "Hours worked", type: "number" },
      { label: "Hours of leisure", type: "number" },
      { label: "What consumed the most time?", type: "text" },
    ],
  },
  {
    id: "yearly",
    name: "Yearly Planner",
    description: "Set goals and track progress.",
    fields: [
      { label: "Goal for this year", type: "text" },
      { label: "Progress so far", type: "text" },
      { label: "Key milestones hit", type: "textarea" },
    ],
  },
];

import RichTextEditor, { EditorToolbar } from "@/components/RichTextEditor/RichTextEditor";

const getTemplateIcon = (name: string, size = 32) => {
  if (name.includes("Gratitude")) return <Heart size={size} strokeWidth={2.5} color="var(--danger)" />;
  if (name.includes("Productivity")) return <Zap size={size} strokeWidth={2.5} color="var(--streak)" />;
  if (name.includes("Care")) return <Sparkles size={size} strokeWidth={2.5} color="var(--primary)" />;
  return <BookHeart size={size} strokeWidth={2.5} color="var(--primary)" />;
};

export default function WritePage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("marble");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, [initAuth]);

  useEffect(() => {
    if (initialized && !user) {
      router.push("/login");
    }
  }, [user, initialized, router]);

  // Try to fetch templates from backend
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API}/api/templates`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setTemplates(data);
        }
      } catch {
        // Use fallback templates
      }
    };
    fetchTemplates();
  }, []);

  // Fetch user preferences for themes
  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const token = await user.getIdToken();
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (selectedTemplate && data.preferredThemes?.[selectedTemplate.name]) {
            const theme = data.preferredThemes[selectedTemplate.name];
            setSelectedTheme(theme);
            localStorage.setItem(`diary_themes_${user.uid}`, JSON.stringify(data.preferredThemes));
          }
        } else {
          // Fallback
          const local = localStorage.getItem(`diary_themes_${user.uid}`);
          if (local) {
            const prefs = JSON.parse(local);
            if (selectedTemplate && prefs[selectedTemplate.name]) {
              setSelectedTheme(prefs[selectedTemplate.name]);
            }
          }
        }
      } catch { 
        const local = localStorage.getItem(`diary_themes_${user.uid}`);
        if (local) {
          const prefs = JSON.parse(local);
          if (selectedTemplate && prefs[selectedTemplate.name]) {
            setSelectedTheme(prefs[selectedTemplate.name]);
          }
        }
      }
    };
    fetchPrefs();
  }, [user, selectedTemplate]);

  const handleFieldChange = (label: string, value: string) => {
    setResponses((prev) => ({ ...prev, [label]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please select a photo smaller than 5MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const imageRef = ref(storage, `entries/${user.uid}/${fileName}`);
      
      console.log("[Write] Uploading image to Firebase Storage...");
      const snapshot = await uploadBytes(imageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setImageUrls((prev) => [...prev, url]);
      console.log("[Write] Image uploaded successfully!");
    } catch (err: any) {
      console.error("Image upload failed:", err);
      // Provide user-friendly feedback based on common Firebase errors
      if (err.code === 'storage/unauthorized') {
        alert("Upload failed: Permission denied. Please ensure you are logged in correctly.");
      } else if (err.code === 'storage/canceled') {
        alert("Upload canceled.");
      } else {
        alert(`Image upload failed: ${err.message || "Unknown error"}. Check your internet connection or Firebase configuration.`);
      }
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate || !user) return;

    // Validation: Check if at least one response was provided
    if (Object.keys(responses).length === 0 || Object.values(responses).every(v => v.trim() === '')) {
      alert("Please fill in at least one field before saving your entry.");
      return;
    }

    setSaving(true);

    try {
      const body = Object.entries(responses)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

      const token = await user.getIdToken();
      const apiBase = getApiBase();
      const endpoint = `${apiBase}/api/entries`;

      console.log("[Write] Sending entry to backend at:", endpoint);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          body,
          isPublic,
          responses: Object.entries(responses).map(([fieldLabel, value]) => ({
            fieldLabel,
            value,
          })),
          images: imageUrls,
          theme: selectedTheme,
        }),
      });

      if (!res.ok) {
        const responseText = await res.text();
        let errorMessage = `Failed to save entry (${res.status})`;
        try {
          const parsed = JSON.parse(responseText);
          errorMessage = parsed.error || parsed.message || errorMessage;
        } catch {
          if (responseText) errorMessage = responseText;
        }
        throw new Error(errorMessage);
      }

      console.log("[Write] Entry saved successfully!");
      setSaved(true);
      setTimeout(() => router.push("/timeline"), 1800);
    } catch (err: any) {
      console.error("[Write] Save failed:", err);
      alert(err.message || "Something went wrong while saving your entry. Please try again.");
      setSaving(false);
    }
  };

  if (!initialized || !user) return null;

  // Step 1: Template Selection
  if (!selectedTemplate) {
    return (
      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <a href="/" className={styles.sidebarLogo} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
          </a>
          <nav className={styles.sidebarNav}>
            <a href="/dashboard" className={styles.navItem}><LayoutDashboard size={18} /> Dashboard</a>
            <a href="/write"     className={`${styles.navItem} ${styles.navActive}`}><PenLine size={18} /> Write Entry</a>
            <a href="/timeline"  className={styles.navItem}><CalendarDays size={18} /> Timeline</a>
            <a href="/challenges" className={styles.navItem}><Trophy size={18} /> Challenges</a>
            <a href="/badges"    className={styles.navItem}><Medal size={18} /> Badges</a>
            <a href="/settings"  className={styles.navItem}><Settings size={18} /> Settings</a>
          </nav>
        </aside>

        <main className={`${styles.main} animate-page-reveal`}>
          <div className={styles.mobileLogo}>
            <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
          </div>
          <div className={styles.writeHeader}>
            <button onClick={() => router.push("/dashboard")} className={styles.backBtn}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 className={styles.title}>Choose Your Template</h1>
            <p className={styles.writeSubtitle}>Pick a structured format for today&apos;s entry</p>
          </div>

        <div className={styles.templateGrid}>
          {templates.map((t, i) => (
            <button
              key={t.id}
              className={`glass-card ${styles.templateSelect}`}
              onClick={() => {
                setSelectedTemplate(t);
                setResponses({});
              }}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className={styles.tplIcon}>
                {getTemplateIcon(t.name)}
              </span>
              <span className={styles.tplName}>{t.name}</span>
              <span className={styles.tplDesc}>{t.description}</span>
            </button>
          ))}
          </div>
        </main>
      </div>
    );
  }

  // Step 2: Write Entry
  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <a href="/" className={styles.sidebarLogo} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
        </a>
        <nav className={styles.sidebarNav}>
          <a href="/dashboard" className={styles.navItem}><LayoutDashboard size={18} /> Dashboard</a>
          <a href="/write"     className={`${styles.navItem} ${styles.navActive}`}><PenLine size={18} /> Write Entry</a>
          <a href="/timeline"  className={styles.navItem}><CalendarDays size={18} /> Timeline</a>
          <a href="/challenges" className={styles.navItem}><Trophy size={18} /> Challenges</a>
          <a href="/badges"    className={styles.navItem}><Medal size={18} /> Badges</a>
          <a href="/settings"  className={styles.navItem}><Settings size={18} /> Settings</a>
        </nav>
      </aside>

      <main className={`${styles.main} animate-page-reveal`}>
        <div className={styles.mobileLogo}>
          <BookOpen size={24} color="var(--primary)" strokeWidth={2.5} /> DailyDiary
        </div>
        <div className={styles.writeHeader}>
          <button onClick={() => setSelectedTemplate(null)} className={styles.backBtn}>
            <ArrowLeft size={16} /> Change Template
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={styles.title} style={{ color: selectedTheme?.titleColor }}>
                {selectedTemplate.name}
              </h1>
              <p className={styles.writeSubtitle}>{selectedTemplate.description}</p>
            </div>
            {saved && (
              <div className={styles.saveStatus}>
                <CheckCircle2 size={20} color="var(--success)" /> Saved successfully!
              </div>
            )}
          </div>
        </div>

      {saved ? (
        <div className={`glass-card ${styles.savedState}`}>
          <CheckCircle2 size={64} color="var(--success)" className={styles.savedIcon} />
          <h2>Entry Saved & Encrypted!</h2>
          <p>Your entry has been securely encrypted and stored.</p>
        </div>
      ) : (
        <div className={`glass-card ${styles.formCard} relative p-0`}>
          <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" style={{ borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', minHeight: '48px' }}>
             {activeEditor ? (
               <EditorToolbar editor={activeEditor} />
             ) : (
               <div className="flex items-center justify-center h-full text-xs text-gray-400 p-3 italic">Click any text field to show formatting tools</div>
             )}
          </div>

          <div className={styles.formFields} style={{ padding: '36px' }}>
            {(selectedTemplate.fields as TemplateField[]).map((field) => (
              <div key={field.label} className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{field.label}</label>
                {renderField(
                  field, 
                  responses[field.label] || "", 
                  (val) => handleFieldChange(field.label, val),
                  setActiveEditor
                )}
              </div>
            ))}
          </div>

          <div className={styles.imageUploadSection} style={{ margin: '0 36px 24px' }}>
            <h3 className={styles.imageUploadTitle}>Attach Media</h3>
            {imageUrls.length > 0 && (
              <div className={styles.imagePreviewGrid}>
                {imageUrls.map((url, idx) => (
                  <div key={idx} className={styles.imagePreviewWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Upload ${idx + 1}`} className={styles.imagePreview} />
                  </div>
                ))}
              </div>
            )}
            
            <button 
              type="button" 
              className={styles.uploadBtn} 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              <ImagePlus size={18} /> {uploadingImage ? "Uploading..." : "Add Photo"}
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              style={{ display: "none" }} 
            />
          </div>



          <div className={styles.formActions} style={{ margin: '36px', marginTop: 0 }}>
            {/* Public / Private Toggle */}
            <button
              type="button"
              onClick={() => setIsPublic((p) => !p)}
              className={`${styles.visibilityBtn} ${isPublic ? styles.visibilityPublic : ""}`}
              id="toggle-visibility"
            >
              {isPublic ? <><Globe size={18} /> Public</> : <><Lock size={18} /> Private</>}
            </button>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving} id="save-entry" style={{ gap: '8px' }}>
              {saving ? "Encrypting..." : <><Lock size={18} /> Encrypt & Save</>} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

function renderField(
  field: TemplateField,
  value: string,
  onChange: (val: string) => void,
  setActiveEditor?: (editor: Editor) => void
) {
  switch (field.type) {
    case "emoji":
      return (
        <div className={styles.emojiPicker}>
          {MOOD_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={`${styles.emojiBtn} ${value === e ? styles.emojiActive : ""}`}
              onClick={() => onChange(e)}
            >
              {e}
            </button>
          ))}
        </div>
      );

    case "rating":
      return (
        <div className={styles.ratingPicker}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.ratingBtn} ${parseInt(value) === n ? styles.ratingActive : ""}`}
              onClick={() => onChange(String(n))}
            >
              {n}
            </button>
          ))}
        </div>
      );

    case "number":
      return (
        <input
          type="number"
          className="input-field"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "text":
    case "textarea":
      return (
        <RichTextEditor
          value={value}
          onChange={(val) => onChange(val)}
          onFocus={setActiveEditor}
        />
      );

    default:
      return (
        <input
          type="text"
          className="input-field"
          placeholder="Type here..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

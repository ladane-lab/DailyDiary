"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { API_URL } from "@/lib/api";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { 
  Globe, PenLine, CalendarDays, Clock,
  Heart, Zap, Sparkles, BookHeart, MessageCircle, 
  Share2, Bookmark, MoreHorizontal, Send, Image as ImageIcon,
  Smile, Users, X, Check, Trash2, Edit3, User as UserIcon, Rss,
  ExternalLink, ImagePlus
} from "lucide-react";
import styles from "./explore.module.css";
import RichTextEditor, { EditorToolbar } from "@/components/RichTextEditor";
import { Editor } from "@tiptap/react";
import { FeedCard } from "./FeedCard";



interface ExploreEntry {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  template?: { name: string };
  user?: { name: string; photoURL?: string | null };
  images?: { id: string; url: string }[];
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowing: boolean;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
}

const getTemplateIcon = (name: string) => {
  if (name.includes("Gratitude")) return <Heart size={16} strokeWidth={2.5} />;
  if (name.includes("Productivity")) return <Zap size={16} strokeWidth={2.5} />;
  if (name.includes("Care")) return <Sparkles size={16} strokeWidth={2.5} />;
  return <BookHeart size={16} strokeWidth={2.5} />;
};

const getReadTime = (htmlContent: string): string => {
  if (!htmlContent) return "1m read";
  const text = htmlContent.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes}m read`;
};

export default function ExplorePage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [entries, setEntries] = useState<ExploreEntry[]>([]);
  const [userEntries, setUserEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingUser, setLoadingUser] = useState(false);
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<"community" | "personal">("community");
  
  // Compose & Edit state
  const [newPost, setNewPost] = useState("");
  const [writing, setWriting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0); 
  
  // Image & Emoji state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Edit image upload state
  const [editUploadedImages, setEditUploadedImages] = useState<string[]>([]);
  const [isEditUploading, setIsEditUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Toolbar state
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [editEditor, setEditEditor] = useState<Editor | null>(null);

  useEffect(() => { const unsub = initAuth(); return unsub; }, [initAuth]);
  
  const uploadToFirebase = (file: File, userId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.name}`;
      const storageRef = ref(storage, `explore/${userId}/${uniqueName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        null,
        (error) => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please choose an image under 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const downloadURL = await uploadToFirebase(file, user.uid);
      setUploadedImages(prev => [...prev, downloadURL]);
    } catch (err: any) {
      console.error("[Upload] Error:", err);
      alert(`Upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { alert("Image too large (max 5MB)"); return; }
    setIsEditUploading(true);
    try {
      const downloadURL = await uploadToFirebase(file, user.uid);
      setEditUploadedImages(prev => [...prev, downloadURL]);
    } catch (err: any) {
      alert(`Upload failed: ${err?.message}`);
    } finally {
      setIsEditUploading(false);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  const addEmoji = (emoji: string) => {
    if (activeEditor) {
      activeEditor.chain().focus().insertContent(emoji).run();
    } else {
      setNewPost(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  const fetchPublicEntries = async (pageNum = 1, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const API = API_URL;
      const token = await user?.getIdToken();
      const res = await fetch(`${API}/entries/public?page=${pageNum}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setEntries(data.entries);
        } else {
          setEntries(prev => [...prev, ...data.entries]);
        }
        setHasMore(data.hasMore);
        setPage(data.page);
      }
    } catch (err) {
      console.error("Failed to load public entries:", err);
      setError("Failed to connect to the feed. Please check your connection.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };



  const fetchUserPublicEntries = async () => {
    if (!user) return;
    setLoadingUser(true);
    try {
      const API = API_URL;
      const token = await user.getIdToken();
      const res = await fetch(`${API}/entries/my-public`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserEntries(data.entries);
      }
    } catch (err) {
      console.error("Failed to load user public entries:", err);
    } finally {
      setLoadingUser(false);
    }
  };


  useEffect(() => {
    if (initialized) {
      fetchPublicEntries(1, true);
      if (user) fetchUserPublicEntries();
    }
  }, [initialized, user]);

  const handlePost = async () => {
    const hasText = newPost.trim() && newPost !== "<p></p>";
    const hasImages = uploadedImages.length > 0;
    if (!hasText && !hasImages) return;
    if (!user) return;
    setIsPosting(true);
    
    const optimisticEntry: ExploreEntry = {
      id: `temp-${Date.now()}`,
      userId: user.uid,
      body: newPost,
      createdAt: new Date().toISOString(),
      user: { name: user.displayName || user.email?.split('@')[0] || "You" },
      isLiked: false,
      isBookmarked: false,
      isFollowing: false,
      likesCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      images: uploadedImages.map((url, i) => ({ id: `temp-img-${i}`, url }))
    };

    setEntries(prev => [optimisticEntry, ...prev]);
    setUserEntries(prev => [optimisticEntry, ...prev]);
    
    const savedPost = newPost; 
    const savedImages = [...uploadedImages];
    setNewPost("");
    setUploadedImages([]);
    setResetKey(prev => prev + 1);
    setActiveEditor(null);

    try {
      const API = API_URL;
      const token = await user.getIdToken();
      const res = await fetch(`${API}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          body: savedPost, 
          isPublic: true, 
          templateId: "personal",
          images: savedImages 
        })
      });
      
      if (res.ok) {
        const realEntry: ExploreEntry = await res.json();
        // Replace the optimistic entry with the real server entry (preserving images)
        const replaceOptimistic = (prev: ExploreEntry[]) =>
          prev.map(e => e.id === optimisticEntry.id ? {
            ...realEntry,
            isLiked: false,
            isBookmarked: false,
            isFollowing: false,
            likesCount: 0,
            commentsCount: 0,
            bookmarksCount: 0,
          } : e);
        setEntries(replaceOptimistic);
        setUserEntries(replaceOptimistic);
      } else {
        throw new Error("Failed to post");
      }
    } catch (err) {
      console.error("Failed to post:", err);
      alert("Failed to share post.");
      fetchPublicEntries(1, false);
      fetchUserPublicEntries();
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editBody.trim() || !user || editBody === "<p></p>") return;
    try {
      const API = API_URL;
      const token = await user.getIdToken();
      const res = await fetch(`${API}/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: editBody, images: editUploadedImages })
      });
      if (res.ok) {
        const data = await res.json();
        // Update the entry in-place with new body and images
        const updateEntry = (prev: ExploreEntry[]) => prev.map(e =>
          e.id === id 
            ? { ...e, body: editBody, images: [...(e.images || []), ...(data.images?.filter((ni: any) => !(e.images || []).some((ei) => ei.id === ni.id)) || [])] }
            : e
        );
        setEntries(updateEntry);
        setUserEntries(updateEntry);
        setEditingId(null);
        setEditEditor(null);
        setEditUploadedImages([]);
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this public entry?") || !user) return;
    const update = (prev: ExploreEntry[]) => prev.filter(e => e.id !== id);
    setEntries(update);
    setUserEntries(update);
    try {
      const API = API_URL;
      const token = await user.getIdToken();
      const res = await fetch(`${API}/entries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error("Failed to delete:", err);
      fetchPublicEntries();
      fetchUserPublicEntries();
    }
  };

  const handleLike = async (entryId: string) => {
    if (!user) return;
    const update = (prev: ExploreEntry[]) => prev.map(e => (e.id === entryId ? { ...e, isLiked: !e.isLiked, likesCount: e.isLiked ? e.likesCount - 1 : e.likesCount + 1 } : e));
    setEntries(update);
    setUserEntries(update);
    try {
      const API = API_URL;
      const token = await user.getIdToken();
      await fetch(`${API}/entries/${entryId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchPublicEntries(); fetchUserPublicEntries(); }
  };

  const handleBookmark = async (entryId: string) => {
    if (!user) return;
    const update = (prev: ExploreEntry[]) => prev.map(e => (e.id === entryId ? { ...e, isBookmarked: !e.isBookmarked, bookmarksCount: e.isBookmarked ? e.bookmarksCount - 1 : e.bookmarksCount + 1 } : e));
    setEntries(update);
    setUserEntries(update);
    try {
      const API = API_URL;
      const token = await user.getIdToken();
      await fetch(`${API}/entries/${entryId}/bookmark`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchPublicEntries(); fetchUserPublicEntries(); }
  };

  const handleSubscribe = async (targetUserId: string) => {
    if (!user) return;
    const update = (prev: ExploreEntry[]) => prev.map(e => (e.userId === targetUserId ? { ...e, isFollowing: !e.isFollowing } : e));
    setEntries(update);
    setUserEntries(update);
    try {
      const API = API_URL;
      const token = await user.getIdToken();
      await fetch(`${API}/users/${targetUserId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchPublicEntries(); fetchUserPublicEntries(); }
  };

  const handleShare = (entryId: string) => {
    const url = `${window.location.origin}/explore/${entryId}`;
    if (navigator.share) navigator.share({ title: 'DailyDiary Entry', text: 'Check out this reflection on DailyDiary!', url }).catch(() => {});
    else { navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); }
  };

    const handleToggleMenu = useCallback((id: string | null) => {
    setShowMenuId(id);
  }, []);

  const handleSetEditing = useCallback((id: string | null, body?: string) => {
    setEditingId(id);
    if (body) setEditBody(body);
  }, []);

  const handleRemoveEditImage = useCallback((idx: number) => {
    setEditUploadedImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // Use refs to avoid stale closures in IntersectionObserver callback
  const loadingMoreRef = useRef(loadingMore);
  const hasMoreRef = useRef(hasMore);
  const pageRef = useRef(page);
  loadingMoreRef.current = loadingMore;
  hasMoreRef.current = hasMore;
  pageRef.current = page;

  useEffect(() => {
    if (loading || !hasMore || activeTab !== "community") return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMoreRef.current && hasMoreRef.current) {
        fetchPublicEntries(pageRef.current + 1);
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, hasMore, activeTab]);

  if (!initialized || !user) return <div className={styles.loadingPage}><div className={styles.loadingSpin} /><p>Verifying session...</p></div>;
  
  const currentLoading = activeTab === "community" ? (loading && entries.length === 0) : (loadingUser && userEntries.length === 0);
  const filteredEntries = activeTab === "community" ? entries : userEntries;

  return (
    <div className={styles.page}>
      <main className={`${styles.main} animate-page-reveal`}>
        <div className={styles.contentLayout}>
          <div className={styles.feedSection}>
            {/* ... Tab Switcher ... */}
            <div className={styles.tabStickyHeader}>
              <div className={styles.tabContainer}>
                <button 
                  className={`${styles.tabBtn} ${activeTab === "community" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("community")}
                >
                  <Globe size={18} /> Community Feed
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === "personal" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("personal")}
                >
                  <UserIcon size={18} /> My Public Posts
                </button>
              </div>
            </div>
            {/* ── Conditional Composer (Only on My Posts) ── */}
            {activeTab === "personal" && (
              <div className={`${styles.composeSection} animate-in fade-in slide-in-from-top-4 duration-500`}>
                {user.photoURL ? (
                  <Image src={user.photoURL} alt="Avatar" className={styles.composeAvatarImage} width={48} height={48} style={{ objectFit: "cover" }} />
                ) : (
                  <div className={styles.composeAvatar}>{user.displayName?.[0] || user.email?.[0].toUpperCase()}</div>
                )}
                <div className={styles.composeArea}>
                  <div className={`${styles.editorWrapper} ${activeEditor ? styles.editorActive : ""}`}>
                    {(activeEditor || (newPost && newPost !== "<p></p>")) && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <EditorToolbar editor={activeEditor} />
                      </div>
                    )}
                    <RichTextEditor 
                      key={resetKey}
                      value={newPost} 
                      onChange={setNewPost} 
                      placeholder="What's on your mind? Share a public reflection..." 
                      onFocus={(editor) => setActiveEditor(editor)}
                    />
                    
                    {uploadedImages.length > 0 && (
                      <div className={styles.composePreviews}>
                        {uploadedImages.map((url, i) => (
                          <div key={i} className={styles.previewItem}>
                            <Image src={url} alt="Upload" width={80} height={80} style={{ objectFit: "cover" }} />
                            <button onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.composeActions}>
                    <div className={styles.composeTools}>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                      />
                      <button 
                        className={styles.toolBtn} 
                        title="Add Image" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <div className={styles.loadingSpinSmall} /> : <ImageIcon size={20} />}
                      </button>
                      
                      <div style={{ position: 'relative' }}>
                        <button 
                          className={styles.toolBtn} 
                          title="Add Mood" 
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          <Smile size={20} />
                        </button>
                        
                        {showEmojiPicker && (
                          <div className={styles.emojiPicker}>
                            {[
                              "❤️", "✨", "😊", "🌱", "🦋", "🌈", "🌊", "🌙", "☁️", "🔥", "🙌", "🙏",
                              "😂", "😍", "🤔", "😎", "🥳", "🤩", "🥰", "🥺", "🤯", "😴", "😇", "🤫",
                              "🌸", "🌻", "🍀", "🍃", "🍂", "🍄", "🌎", "🌍", "🌏", "🌟", "⭐", "💫",
                              "🍎", "🍓", "🍕", "☕", "🍦", "🍭", "🎨", "🎭", "🎮", "🎸", "📚", "🕯️",
                              "🧸", "🎈", "💎", "🔋", "💡", "📱", "💻", "⌨️", "🖱️", "🎥", "📸", "📼",
                              "🔍", "🔒", "🔓", "🔔", "📍", "🚩", "🏁", "🏆", "⚽", "🏀", "🎾", "🏐",
                              "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
                              "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺",
                              "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️",
                              "🚀", "✈️", "🚗", "🚲", "🏠", "🏖️", "🏔️", "⛲", "🎡", "🎢", "🚂", "🚢",
                              "💍", "💼", "🎒", "👒", "👗", "👔", "👖", "👠", "👟", "🌂", "💄", "🕶️",
                              "📢", "📣", "💬", "💭", "✉️", "📫", "📌", "🖇️", "✂️", "🔨", "🔑", "📦",
                              "✅", "❌", "⚠️", "⛔", "🚫", "💯", "💢", "💥", "💫", "💦", "💨", "💤"
                            ].map(emoji => (
                              <button key={emoji} onClick={() => addEmoji(emoji)} className={styles.emojiBtn}>{emoji}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1" />

                    <button 
                      className={styles.postBtn} 
                      disabled={isPosting || (!newPost.trim() && uploadedImages.length === 0) || newPost === "<p></p>"} 
                      onClick={handlePost}
                    >
                      {isPosting ? "Posting..." : <><Send size={18} /> Post Publicly</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentLoading ? (
              <div className={styles.feedContainer}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`skeleton ${styles.feedCard}`} style={{ height: '300px', width: '100%' }} />
                ))}
              </div>
            ) : error ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} style={{ color: 'var(--accent-red, #ff4d4d)' }}>⚠️</div>
                <h2>Connection Error</h2>
                <p>{error}</p>
                <button onClick={() => { setError(null); fetchPublicEntries(1, true); }} className={styles.postBtn} style={{ marginTop: '1rem' }}>Try Again</button>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🌐</div>
                <h2>{activeTab === "community" ? "The world is quiet right now" : "Your community awaits"}</h2>
                <p>{activeTab === "community" ? "Be the first to share a public reflection and inspire others today." : "Share your first public reflection to start building your community presence."}</p>
              </div>
            ) : (
              <div className={styles.feedContainer}>
                {filteredEntries.map((entry, index) => {
                  const isOwner = entry.userId === user.uid;
                  const authorName = entry.user?.name || "Anonymous";
                  const date = new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const isEditing = editingId === entry.id;

                  return (
                    <div 
                      key={entry.id} 
                      className={`${styles.feedItem} ${ (showMenuId === entry.id || editingId === entry.id) ? styles.activeItem : "" }`} 
                      style={{ animationDelay: `${(index % 10) * 0.1}s` }}
                    >

                      
                                            <FeedCard
                        entry={entry}
                        user={user}
                        activeTab={activeTab}
                        isOwner={isOwner}
                        authorName={authorName}
                        date={date}
                        isEditing={isEditing}
                        showMenu={showMenuId === entry.id}
                        editBody={editBody}
                        editUploadedImages={editUploadedImages}
                        editEditor={editEditor}
                        isEditUploading={isEditUploading}
                        editFileInputRef={editFileInputRef}
                        onSubscribe={handleSubscribe}
                        onToggleMenu={handleToggleMenu}
                        onSetEditing={handleSetEditing}
                        onDelete={handleDelete}
                        onSetEditBody={setEditBody}
                        onSetEditEditor={setEditEditor}
                        onRemoveEditImage={handleRemoveEditImage}
                        onEditImageUpload={handleEditImageUpload}
                        onUpdate={handleUpdate}
                        onLike={handleLike}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                      />
                    </div>
                  );
                })}
                
                {/* Infinite Scroll Trigger */}
                {activeTab === "community" && hasMore && (
                  <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                    {loadingMore ? (
                      <div className={styles.loadingSpinSmall} />
                    ) : (
                      <span className="text-muted text-sm italic">Scrolling for more reflections...</span>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>

          <aside className={styles.sidebar}>
            <div className={`glass-card ${styles.sidebarCard}`} style={{ padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📖 Community Guidelines
              </h3>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', listStyleType: 'disc', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Share mindful reflections and authentic personal thoughts.</li>
                <li>Be respectful and supportive to others.</li>
                <li>Do not post spam, hate speech, or explicit images.</li>
              </ul>
            </div>
            
            <div className={`glass-card ${styles.sidebarCard}`} style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ About Community Feed
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                DailyDiary Explore is a space to read public reflections, support other writers with likes, and subscribe to their volume journals.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}





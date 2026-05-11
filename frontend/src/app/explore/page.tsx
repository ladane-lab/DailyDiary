"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { 
  Globe, PenLine, CalendarDays, Clock,
  Heart, Zap, Sparkles, BookHeart, MessageCircle, 
  Share2, Bookmark, MoreHorizontal, Send, Image as ImageIcon,
  Smile, Users, X, Check, Trash2, Edit3, User as UserIcon, Rss,
  ExternalLink, ImagePlus
} from "lucide-react";
import styles from "./explore.module.css";
import RichTextEditor, { EditorToolbar } from "@/components/RichTextEditor/RichTextEditor";
import { Editor } from "@tiptap/react";

const AdSlot = ({ type }: { type: "banner" | "feed" | "skyscraper" }) => (
  <div className={`${styles.adSlot} ${
    type === "banner" ? styles.adBanner : 
    type === "skyscraper" ? styles.adSkyscraper : 
    styles.adInFeed
  }`}>
    <div className={styles.adLabel}>
      <ExternalLink size={14} /> Sponsor Space
    </div>
    <div className={styles.adPlaceholder}>
      {type === "skyscraper" ? "Skyscraper Ad" : "Monetization Slot"}
    </div>
  </div>
);

interface ExploreEntry {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  template?: { name: string };
  user?: { name: string };
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

export default function ExplorePage() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [entries, setEntries] = useState<ExploreEntry[]>([]);
  const [userEntries, setUserEntries] = useState<ExploreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingUser, setLoadingUser] = useState(false);
  const [activeComments, setActiveComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<"community" | "personal">("community");
  
  // Compose & Edit state
  const [newPost, setNewPost] = useState("");
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
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setUploadedImages(prev => [...prev, data.url]);
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
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      const data = await res.json();
      setEditUploadedImages(prev => [...prev, data.url]);
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
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user?.getIdToken();
      const res = await fetch(`${API}/api/entries/public?page=${pageNum}&limit=10`, {
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
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && activeTab === "community") {
      fetchPublicEntries(page + 1);
    }
  };

  const fetchUserPublicEntries = async () => {
    if (!user) return;
    setLoadingUser(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      // Fetch user's entries and filter for public ones
      const res = await fetch(`${API}/api/entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const publicOnly = data.entries.filter((e: any) => e.isPublic);
        // Map to ExploreEntry format
        const mapped = publicOnly.map((e: any) => ({
          ...e,
          user: { name: user.displayName || user.email?.split('@')[0] || "You" },
          isLiked: false, 
          isBookmarked: false,
          isFollowing: false,
          likesCount: 0,
          commentsCount: 0,
          bookmarksCount: 0
        }));
        setUserEntries(mapped);
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
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/entries`, {
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
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/entries/${id}`, {
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
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/entries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPublicEntries();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleLike = async (entryId: string) => {
    if (!user) return;
    setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, isLiked: !e.isLiked, likesCount: e.isLiked ? e.likesCount - 1 : e.likesCount + 1 } : e)));
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      await fetch(`${API}/api/entries/${entryId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchPublicEntries(); }
  };

  const handleBookmark = async (entryId: string) => {
    if (!user) return;
    setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, isBookmarked: !e.isBookmarked, bookmarksCount: e.isBookmarked ? e.bookmarksCount - 1 : e.bookmarksCount + 1 } : e)));
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      await fetch(`${API}/api/entries/${entryId}/bookmark`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchPublicEntries(); }
  };

  const handleSubscribe = async (targetUserId: string) => {
    if (!user) return;
    setEntries(prev => prev.map(e => (e.userId === targetUserId ? { ...e, isFollowing: !e.isFollowing } : e)));
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = await user.getIdToken();
      await fetch(`${API}/api/users/${targetUserId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { fetchPublicEntries(); }
  };

  const handleShare = (entryId: string) => {
    const url = `${window.location.origin}/explore/${entryId}`;
    if (navigator.share) navigator.share({ title: 'DailyDiary Entry', text: 'Check out this reflection on DailyDiary!', url }).catch(() => {});
    else { navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); }
  };

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading || !hasMore || activeTab !== "community") return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore && hasMore) {
        loadMore();
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, loadingMore, hasMore, activeTab, page]);

  if (!initialized || !user) return <div className={styles.loadingPage}><div className={styles.loadingSpin} /><p>Verifying session...</p></div>;
  
  const currentLoading = activeTab === "community" ? (loading && entries.length === 0) : (loadingUser && userEntries.length === 0);
  const filteredEntries = activeTab === "community" ? entries : userEntries;

  return (
    <div className={styles.page}>
      <main className={`${styles.main} animate-page-reveal`}>
        {/* ... Tab Switcher ... */}
        <div className={styles.tabContainer} style={{ marginTop: '20px' }}>
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

        <div className={styles.contentLayout}>
          <div className={styles.feedSection}>
            {/* ── Conditional Composer (Only on My Posts) ── */}
            {activeTab === "personal" && (
              <div className={`${styles.composeSection} animate-in fade-in slide-in-from-top-4 duration-500`}>
                <div className={styles.composeAvatar}>{user.displayName?.[0] || user.email?.[0].toUpperCase()}</div>
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
                            <img src={url} alt="Upload" />
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
            ) : filteredEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <Globe size={80} className={styles.emptyIcon} />
                <h3>{activeTab === "community" ? "The world is quiet right now" : "Your community awaits"}</h3>
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
                      className={styles.feedItem} 
                      style={{ animationDelay: `${(index % 10) * 0.1}s` }}
                    >
                      {/* In-feed ad every 3 posts */}
                      {index > 0 && index % 3 === 0 && <AdSlot type="feed" />}
                      
                      <article className={styles.feedCard}>
                        <div className={styles.feedHeader}>
                          <div className={styles.authorAvatar}>{authorName[0].toUpperCase()}</div>
                          <div className={styles.authorInfo}>
                            <div className="flex items-center gap-3">
                              <div className={styles.authorName}>{authorName}</div>
                              {!isOwner && (
                                <button 
                                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${entry.isFollowing ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'}`}
                                  onClick={() => handleSubscribe(entry.userId)}
                                >
                                  {entry.isFollowing ? "Subscribed" : "+ Subscribe"}
                                </button>
                              )}
                            </div>
                            <div className={styles.feedMeta}>
                              <div className={styles.metaItem}><CalendarDays size={14} /> {date}</div>
                              <div className="w-1 h-1 rounded-full bg-gray-300" />
                              <div className={styles.metaItem}><Clock size={14} /> 2m read</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className={styles.tplBadge}>{getTemplateIcon(entry.template?.name || "")} {entry.template?.name || "Journal"}</div>
                            {isOwner && (
                              <div className="relative">
                                <button className={styles.toolBtn} onClick={() => setShowMenuId(showMenuId === entry.id ? null : entry.id)}><MoreHorizontal size={20} /></button>
                                {showMenuId === entry.id && (
                                  <div className={styles.menuPopover}>
                                    <button onClick={() => { setEditingId(entry.id); setEditBody(entry.body); setShowMenuId(null); }} className={styles.menuItem}><Edit3 size={16} /> Edit Post</button>
                                    <button onClick={() => { handleDelete(entry.id); setShowMenuId(null); }} className={`${styles.menuItem} ${styles.menuDanger}`}><Trash2 size={16} /> Delete</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className={styles.editArea}>
                            <div className={`${styles.editorWrapper} ${styles.editorActive}`}>
                               <EditorToolbar editor={editEditor} />
                               <RichTextEditor value={editBody} onChange={setEditBody} onFocus={(editor) => setEditEditor(editor)} />
                            </div>
                            {/* Edit image previews */}
                            {editUploadedImages.length > 0 && (
                              <div className={styles.composePreviews}>
                                {editUploadedImages.map((url, i) => (
                                  <div key={i} className={styles.previewItem}>
                                    <img src={url} alt="Upload" />
                                    <button onClick={() => setEditUploadedImages(prev => prev.filter((_, idx) => idx !== i))}><X size={14} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-between items-center gap-3 mt-4">
                              <div className="flex gap-2">
                                <input type="file" ref={editFileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleEditImageUpload} />
                                <button className={styles.toolBtn} title="Add Image" onClick={() => editFileInputRef.current?.click()} disabled={isEditUploading}>
                                  {isEditUploading ? <div className={styles.loadingSpinSmall} /> : <ImageIcon size={18} />}
                                </button>
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => { setEditingId(null); setEditEditor(null); setEditUploadedImages([]); }} className={styles.actionBtn}><X size={18} /> Cancel</button>
                                <button onClick={() => handleUpdate(entry.id)} className={styles.postBtn}><Check size={18} /> Save Changes</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`${styles.feedBody} ${styles.tiptapContent}`} dangerouslySetInnerHTML={{ __html: entry.body }} />
                        )}

                        {entry.images && entry.images.length > 0 && (
                          <div className={styles.feedImages}>{entry.images.map((img) => <img key={img.id} src={img.url} alt="Media" className={styles.feedImage} />)}</div>
                        )}

                        <div className={styles.feedActions}>
                          <button className={`${styles.actionBtn} ${entry.isLiked ? styles.active : ""}`} onClick={() => handleLike(entry.id)}>
                            <Heart size={20} fill={entry.isLiked ? "currentColor" : "none"} /> <span>{entry.likesCount || ""} Like</span>
                          </button>
                          <button className={styles.actionBtn} onClick={() => setActiveComments(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}>
                            <MessageCircle size={20} /> <span>{entry.commentsCount || ""} Comment</span>
                          </button>
                          <button className={`${styles.actionBtn} ${entry.isBookmarked ? styles.active : ""}`} onClick={() => handleBookmark(entry.id)}>
                            <Bookmark size={20} fill={entry.isBookmarked ? "currentColor" : "none"} /> <span>{entry.bookmarksCount || ""} Save</span>
                          </button>
                          <div className="flex-1" />
                          <button className={styles.actionBtn} onClick={() => handleShare(entry.id)}><Share2 size={20} /></button>
                        </div>
                      </article>
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

                {/* Bottom Ad as per drawing */}
                <AdSlot type="banner" />
              </div>
            )}
          </div>

          <aside className={styles.sidebar}>
            <AdSlot type="banner" />
            <AdSlot type="skyscraper" />
            <AdSlot type="feed" />
            <AdSlot type="skyscraper" />
          </aside>
        </div>
      </main>
    </div>
  );
}

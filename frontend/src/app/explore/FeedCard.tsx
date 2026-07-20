"use client";
import Image from "next/image";
import React, { memo } from "react";
import { 
  CalendarDays, Clock, Heart, Bookmark, Share2, 
  MoreHorizontal, Edit3, Trash2, Check, X, Image as ImageIcon
} from "lucide-react";
import styles from "./explore.module.css";
import RichTextEditor, { EditorToolbar } from "@/components/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitize";

interface FeedCardProps {
  entry: any;
  user: any;
  activeTab: string;
  isOwner: boolean;
  authorName: string;
  date: string;
  isEditing: boolean;
  showMenu: boolean;
  editBody: string;
  editUploadedImages: string[];
  editEditor: any;
  isEditUploading: boolean;
  editFileInputRef: React.RefObject<HTMLInputElement | null>;
  onSubscribe: (userId: string) => void;
  onToggleMenu: (id: string | null) => void;
  onSetEditing: (id: string | null, body?: string) => void;
  onDelete: (id: string) => void;
  onSetEditBody: (body: string) => void;
  onSetEditEditor: (editor: any) => void;
  onRemoveEditImage: (idx: number) => void;
  onEditImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdate: (id: string) => void;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
  onShare: (id: string) => void;
}

const getReadTime = (htmlContent: string): string => {
  if (!htmlContent) return "1m read";
  const text = htmlContent.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes}m read`;
};

const FeedCardComponent: React.FC<FeedCardProps> = ({
  entry,
  user,
  activeTab,
  isOwner,
  authorName,
  date,
  isEditing,
  showMenu,
  editBody,
  editUploadedImages,
  editEditor,
  isEditUploading,
  editFileInputRef,
  onSubscribe,
  onToggleMenu,
  onSetEditing,
  onDelete,
  onSetEditBody,
  onSetEditEditor,
  onRemoveEditImage,
  onEditImageUpload,
  onUpdate,
  onLike,
  onBookmark,
  onShare
}) => {
  return (
    <article className={styles.feedCard}>
      <div className={styles.feedHeader}>
        {entry.user?.photoURL ? (
          <Image src={entry.user.photoURL} alt={authorName} className={styles.authorAvatarImage} width={48} height={48} style={{ objectFit: "cover" }} />
        ) : (
          <div className={styles.authorAvatar}>{authorName[0].toUpperCase()}</div>
        )}
        <div className={styles.authorInfo}>
          <div className="flex items-center gap-3">
            <div className={styles.authorName}>{authorName}</div>
          </div>
          <div className={styles.feedMeta}>
            <div className={styles.metaItem}><CalendarDays size={14} /> {date}</div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className={styles.metaItem}><Clock size={14} /> {getReadTime(entry.body)}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === "personal" && isOwner && (
            <div style={{ position: 'relative' }}>
              <button className={styles.toolBtn} onClick={() => onToggleMenu(showMenu ? null : entry.id)}><MoreHorizontal size={20} /></button>
              {showMenu && (
                <div className={styles.menuPopover}>
                  <button onClick={() => { onSetEditing(entry.id, entry.body); onToggleMenu(null); }} className={styles.menuItem}><Edit3 size={16} /> Edit Post</button>
                  <button onClick={() => { onDelete(entry.id); onToggleMenu(null); }} className={`${styles.menuItem} ${styles.menuDanger}`}><Trash2 size={16} /> Delete</button>
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
             <RichTextEditor value={editBody} onChange={onSetEditBody} onFocus={onSetEditEditor} />
          </div>
          {editUploadedImages.length > 0 && (
            <div className={styles.composePreviews}>
              {editUploadedImages.map((url, i) => (
                <div key={i} className={styles.previewItem}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Upload" />
                  <button onClick={() => onRemoveEditImage(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center gap-3 mt-4">
            <div className="flex gap-2">
              <input type="file" ref={editFileInputRef} style={{ display: 'none' }} accept="image/*" onChange={onEditImageUpload} />
              <button className={styles.toolBtn} title="Add Image" onClick={() => editFileInputRef.current?.click()} disabled={isEditUploading}>
                {isEditUploading ? <div className={styles.loadingSpinSmall} /> : <ImageIcon size={18} />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { onSetEditing(null); onSetEditEditor(null); }} className={styles.actionBtn}><X size={18} /> Cancel</button>
              <button onClick={() => onUpdate(entry.id)} className={styles.postBtn}><Check size={18} /> Save Changes</button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${styles.feedBody} ${styles.tiptapContent}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.body) }} />
      )}

      {entry.images && entry.images.length > 0 && (
        <div className={styles.feedImages}>
          {entry.images.map((img: any) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt="Media" className={styles.feedImage} style={{ objectFit: "cover", width: "100%", height: "auto", borderRadius: 8 }} />
          ))}
        </div>
      )}

      <div className={styles.feedActions}>
        <button className={`${styles.actionBtn} ${entry.isLiked ? styles.active : ""}`} onClick={() => onLike(entry.id)}>
          <Heart size={20} fill={entry.isLiked ? "currentColor" : "none"} /> <span>{entry.likesCount || ""} Like</span>
        </button>
        <button className={`${styles.actionBtn} ${entry.isBookmarked ? styles.active : ""}`} onClick={() => onBookmark(entry.id)}>
          <Bookmark size={20} fill={entry.isBookmarked ? "currentColor" : "none"} /> <span>{entry.bookmarksCount || ""} Save</span>
        </button>
        <div className="flex-1" />
        <button className={styles.actionBtn} onClick={() => onShare(entry.id)}><Share2 size={20} /></button>
      </div>
    </article>
  );
};

export const FeedCard = memo(FeedCardComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when other cards are edited/menus opened
  return (
    prevProps.entry === nextProps.entry &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.showMenu === nextProps.showMenu &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.editBody === nextProps.editBody &&
    prevProps.editUploadedImages === nextProps.editUploadedImages &&
    prevProps.isEditUploading === nextProps.isEditUploading
  );
});


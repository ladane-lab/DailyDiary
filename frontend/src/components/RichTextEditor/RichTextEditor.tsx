import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-font-family';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Palette, Undo, Redo, Heading1, Heading2, Heading3,
  Type, ArrowUpDown
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: (editor: Editor) => void;
}

const COLORS = [
  '#000000', '#4b5563', '#9ca3af', '#ffffff', '#8b4513', '#dc2626', '#ea580c',
  '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
  '#ec4899', '#f43f5e'
];

const FONTS = [
  { name: 'Inter', value: '"Inter", sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Monospace', value: '"Courier New", monospace' },
  { name: 'Cursive', value: '"Comic Sans MS", cursive' },
];

const SIZES = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '16px' },
  { label: 'Large', value: '20px' },
  { label: 'Huge', value: '24px' },
];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).run(),
    };
  },
});

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [revision, setRevision] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const fontPickerRef = useRef<HTMLDivElement>(null);
  const sizePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => setRevision(r => r + 1);
    editor.on('transaction', handleUpdate);
    
    // Handle click outside to close color picker
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) setShowColorPicker(false);
      if (fontPickerRef.current && !fontPickerRef.current.contains(event.target as Node)) setShowFontPicker(false);
      if (sizePickerRef.current && !sizePickerRef.current.contains(event.target as Node)) setShowSizePicker(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`${styles.toolbar} sticky top-0 z-50`} style={{ borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
      <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={styles.toolbarBtn}>
            <Undo size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={styles.toolbarBtn}>
            <Redo size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarBtnActive : ''}`}>
            <Heading1 size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 2 }) ? styles.toolbarBtnActive : ''}`}>
            <Heading2 size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 3 }) ? styles.toolbarBtnActive : ''}`}>
            <Heading3 size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${styles.toolbarBtn} ${editor.isActive('bold') ? styles.toolbarBtnActive : ''}`}>
            <Bold size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${styles.toolbarBtn} ${editor.isActive('italic') ? styles.toolbarBtnActive : ''}`}>
            <Italic size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${styles.toolbarBtn} ${editor.isActive('underline') ? styles.toolbarBtnActive : ''}`}>
            <UnderlineIcon size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`${styles.toolbarBtn} ${editor.isActive('strike') ? styles.toolbarBtnActive : ''}`}>
            <Strikethrough size={16} />
          </button>
          
          <div className={styles.colorPickerContainer} ref={colorPickerRef}>
            <button type="button" onClick={() => setShowColorPicker(!showColorPicker)} className={styles.toolbarBtn}>
              <Palette size={16} />
            </button>
            {showColorPicker && (
              <div className={styles.colorPickerPopover}>
                <div className={styles.colorGrid}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={styles.colorSwatch}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setShowColorPicker(false);
                      }}
                    />
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove Color
                </button>
              </div>
            )}
          </div>

          <div className={styles.colorPickerContainer} ref={fontPickerRef}>
            <button type="button" onClick={() => setShowFontPicker(!showFontPicker)} className={styles.toolbarBtn}>
              <Type size={16} />
            </button>
            {showFontPicker && (
              <div className={styles.colorPickerPopover} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
                {FONTS.map(font => (
                  <button
                    key={font.name}
                    type="button"
                    style={{ fontFamily: font.value, textAlign: 'left', padding: '4px 8px', borderRadius: '4px' }}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                    onClick={() => {
                      editor.chain().focus().setFontFamily(font.value).run();
                      setShowFontPicker(false);
                    }}
                  >
                    {font.name}
                  </button>
                ))}
                <button type="button" onClick={() => { editor.chain().focus().unsetFontFamily().run(); setShowFontPicker(false); }} className="text-xs text-red-500 font-medium mt-1">Reset</button>
              </div>
            )}
          </div>

          <div className={styles.colorPickerContainer} ref={sizePickerRef}>
            <button type="button" onClick={() => setShowSizePicker(!showSizePicker)} className={styles.toolbarBtn}>
              <ArrowUpDown size={16} />
            </button>
            {showSizePicker && (
              <div className={styles.colorPickerPopover} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                {SIZES.map(size => (
                  <button
                    key={size.label}
                    type="button"
                    style={{ textAlign: 'left', padding: '4px 8px', borderRadius: '4px' }}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                    onClick={() => {
                      editor.chain().focus().setFontSize(size.value).run();
                      setShowSizePicker(false);
                    }}
                  >
                    {size.label}
                  </button>
                ))}
                <button type="button" onClick={() => { editor.chain().focus().unsetFontSize().run(); setShowSizePicker(false); }} className="text-xs text-red-500 font-medium mt-1">Reset</button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: 'left' }) ? styles.toolbarBtnActive : ''}`}>
            <AlignLeft size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: 'center' }) ? styles.toolbarBtnActive : ''}`}>
            <AlignCenter size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: 'right' }) ? styles.toolbarBtnActive : ''}`}>
            <AlignRight size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: 'justify' }) ? styles.toolbarBtnActive : ''}`}>
            <AlignJustify size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${styles.toolbarBtn} ${editor.isActive('bulletList') ? styles.toolbarBtnActive : ''}`}>
            <List size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${styles.toolbarBtn} ${editor.isActive('orderedList') ? styles.toolbarBtnActive : ''}`}>
            <ListOrdered size={16} />
          </button>
        </div>
      </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, onFocus }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: placeholder || 'Click Here to type',
        includeChildren: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: ({ editor }) => {
      if (onFocus) onFocus(editor);
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className={styles.editorContainer}>
      {/* Editor Content */}
      <div className={styles.editorContent}>
        <EditorContent editor={editor} />
      </div>

      {/* Footer / Status */}
      <div className={styles.footer}>
        <span>{editor.getText().trim().split(/\s+/).filter(w => w.length > 0).length} words</span>
      </div>
    </div>
  );
}

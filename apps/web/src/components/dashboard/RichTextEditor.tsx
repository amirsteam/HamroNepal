/**
 * Article body editor (Tiptap). The toolbar only offers what the server keeps
 * when it sanitizes on save: paragraphs, H2/H3, bold, italic, underline,
 * strike, lists, quotes, links, images and dividers. Output is HTML.
 */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { toNepaliDigits } from "@/lib/bs-date";

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

interface Props {
  id: string;
  value: string;
  onChange: (html: string) => void;
  /** Upload a picked image; returns its public URL. */
  onUploadImage: (file: File) => Promise<string>;
  placeholder?: string;
  /** Points at the visible label, for screen readers. */
  labelledBy?: string;
}

type Panel = { kind: "link"; value: string } | { kind: "alt"; value: string } | null;

function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`min-w-8 h-8 px-1.5 inline-flex items-center justify-center rounded text-sm transition-colors disabled:opacity-35 ${
        active ? "bg-secondary text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />;

function Icon({ d, className = "w-4 h-4" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
  openLink,
  html,
  onToggleHtml,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
  openLink: () => void;
  html: boolean;
  onToggleHtml: () => void;
}) {
  // Re-render only when these change (not on every keystroke).
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      p: e.isActive("paragraph"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const run = () => editor.chain().focus();
  const off = html; // formatting is unavailable while editing raw HTML

  return (
    <div role="toolbar" aria-label="सामग्री सम्पादन उपकरण" className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5 sticky top-0 z-10">
      <ToolButton label="अनुच्छेद" active={s.p} disabled={off} onClick={() => run().setParagraph().run()}>
        <span className="font-medium">अ</span>
      </ToolButton>
      <ToolButton label="उपशीर्षक" shortcut="Ctrl+Alt+2" active={s.h2} disabled={off} onClick={() => run().toggleHeading({ level: 2 }).run()}>
        <span className="font-bold">H2</span>
      </ToolButton>
      <ToolButton label="सानो उपशीर्षक" shortcut="Ctrl+Alt+3" active={s.h3} disabled={off} onClick={() => run().toggleHeading({ level: 3 }).run()}>
        <span className="font-bold text-xs">H3</span>
      </ToolButton>
      <Sep />
      <ToolButton label="बाक्लो" shortcut="Ctrl+B" active={s.bold} disabled={off} onClick={() => run().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton label="ढल्केको" shortcut="Ctrl+I" active={s.italic} disabled={off} onClick={() => run().toggleItalic().run()}>
        <span className="italic font-serif">I</span>
      </ToolButton>
      <ToolButton label="रेखाङ्कन" shortcut="Ctrl+U" active={s.underline} disabled={off} onClick={() => run().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolButton>
      <ToolButton label="काटिएको" shortcut="Ctrl+Shift+S" active={s.strike} disabled={off} onClick={() => run().toggleStrike().run()}>
        <span className="line-through">S</span>
      </ToolButton>
      <Sep />
      <ToolButton label="बुँदागत सूची" shortcut="Ctrl+Shift+8" active={s.bullet} disabled={off} onClick={() => run().toggleBulletList().run()}>
        <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </ToolButton>
      <ToolButton label="क्रमबद्ध सूची" shortcut="Ctrl+Shift+7" active={s.ordered} disabled={off} onClick={() => run().toggleOrderedList().run()}>
        <Icon d="M10 6h10M10 12h10M10 18h10M4 5v3M3 15h2l-2 3h2" />
      </ToolButton>
      <ToolButton label="उद्धरण" shortcut="Ctrl+Shift+B" active={s.quote} disabled={off} onClick={() => run().toggleBlockquote().run()}>
        <Icon d="M7 8h4v4H7c0 2 1 3 3 3M14 8h4v4h-4c0 2 1 3 3 3" />
      </ToolButton>
      <ToolButton label="विभाजक रेखा" disabled={off} onClick={() => run().setHorizontalRule().run()}>
        <Icon d="M4 12h16" />
      </ToolButton>
      <Sep />
      <ToolButton label={s.link ? "लिङ्क सम्पादन" : "लिङ्क थप्नुहोस्"} shortcut="Ctrl+K" active={s.link} disabled={off} onClick={openLink}>
        <Icon d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
      </ToolButton>
      <ToolButton label={uploading ? "तस्बिर अपलोड हुँदै…" : "तस्बिर थप्नुहोस्"} disabled={off || uploading} onClick={onPickImage}>
        {uploading ? <span className="text-xs">…</span> : <Icon d="M4 16l4-4 3 3 5-5 4 4M4 5h16v14H4zM9 9.5a1 1 0 11-2 0 1 1 0 012 0z" />}
      </ToolButton>
      <Sep />
      <ToolButton label="अघिल्लो अवस्था (Undo)" shortcut="Ctrl+Z" disabled={off || !s.canUndo} onClick={() => run().undo().run()}>
        <Icon d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" />
      </ToolButton>
      <ToolButton label="फेरि गर्नुहोस् (Redo)" shortcut="Ctrl+Shift+Z" disabled={off || !s.canRedo} onClick={() => run().redo().run()}>
        <Icon d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" />
      </ToolButton>
      <span className="flex-1" />
      <ToolButton label={html ? "सामान्य सम्पादनमा फर्कनुहोस्" : "HTML हेर्नुहोस्"} active={html} onClick={onToggleHtml}>
        <span className="text-xs font-mono">&lt;/&gt;</span>
      </ToolButton>
    </div>
  );
}

export function RichTextEditor({ id, value, onChange, onUploadImage, placeholder, labelledBy }: Props) {
  const lastHtml = useRef(value);
  const fileInput = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Code is not kept by the server's sanitizer, so it isn't offered.
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => SAFE_URL.test(url),
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      CharacterCount,
    ],
    content: value,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        id,
        class: "article-content rich-editor min-h-[22rem] px-5 py-4 outline-none",
        role: "textbox",
        "aria-multiline": "true",
        ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          openLink();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? "" : e.getHTML();
      lastHtml.current = html;
      onChange(html);
    },
  });

  // Content set from outside (article loaded, AI draft applied): show it.
  useEffect(() => {
    if (editor && value !== lastHtml.current) {
      lastHtml.current = value;
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const words = useEditorState({ editor, selector: ({ editor: e }) => e?.storage.characterCount.words() ?? 0 });

  function openLink() {
    if (!editor) return;
    setPanel({ kind: "link", value: editor.getAttributes("link").href ?? "https://" });
  }

  function applyLink(e: FormEvent) {
    e.preventDefault();
    if (!editor || panel?.kind !== "link") return;
    const url = panel.value.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url || url === "https://") chain.unsetLink().run();
    else if (SAFE_URL.test(url)) chain.setLink({ href: url }).run();
    else return; // the input shows the hint
    setPanel(null);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) return setUploadError("तस्बिर फाइल मात्र थप्न मिल्छ।");
    if (file.size > 5 * 1024 * 1024) return setUploadError("तस्बिर ५ MB भन्दा सानो हुनुपर्छ।");
    setUploading(true);
    try {
      const src = await onUploadImage(file);
      editor.chain().focus().setImage({ src, alt: "" }).run();
      setPanel({ kind: "alt", value: "" }); // ask for a short description
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "तस्बिर अपलोड हुन सकेन।");
    } finally {
      setUploading(false);
    }
  }

  function applyAlt(e: FormEvent) {
    e.preventDefault();
    if (!editor || panel?.kind !== "alt") return;
    editor.chain().focus().updateAttributes("image", { alt: panel.value.trim() }).run();
    setPanel(null);
  }

  function toggleHtml() {
    if (!editor) return;
    if (!htmlMode) {
      setHtmlDraft(editor.isEmpty ? "" : editor.getHTML());
      setPanel(null);
    } else {
      editor.commands.setContent(htmlDraft, { emitUpdate: true });
    }
    setHtmlMode(!htmlMode);
  }

  if (!editor) return <div className="h-96 rounded-lg border border-gray-300 bg-gray-50 animate-pulse" />;

  const inputClass = "flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary outline-none";

  return (
    <div className="rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
      <Toolbar
        editor={editor}
        onPickImage={() => fileInput.current?.click()}
        uploading={uploading}
        openLink={openLink}
        html={htmlMode}
        onToggleHtml={toggleHtml}
      />
      <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={onFile} />

      {panel?.kind === "link" && (
        <form onSubmit={applyLink} className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-blue-50 px-3 py-2">
          <label htmlFor={`${id}-link`} className="text-sm text-gray-700">
            लिङ्क
          </label>
          <input
            id={`${id}-link`}
            autoFocus
            type="url"
            value={panel.value}
            onChange={(e) => setPanel({ kind: "link", value: e.target.value })}
            onKeyDown={(e) => e.key === "Escape" && setPanel(null)}
            className={inputClass}
            placeholder="https://"
          />
          <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded text-sm">
            राख्नुहोस्
          </button>
          {editor.isActive("link") && (
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setPanel(null);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
            >
              लिङ्क हटाउनुहोस्
            </button>
          )}
          <button type="button" onClick={() => setPanel(null)} className="px-2 py-1.5 text-sm text-gray-600">
            रद्द
          </button>
          {panel.value && panel.value !== "https://" && !SAFE_URL.test(panel.value.trim()) && (
            <p className="w-full text-xs text-red-600">https:// वा mailto: बाट सुरु हुने लिङ्क मात्र।</p>
          )}
        </form>
      )}

      {panel?.kind === "alt" && (
        <form onSubmit={applyAlt} className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-blue-50 px-3 py-2">
          <label htmlFor={`${id}-alt`} className="text-sm text-gray-700">
            तस्बिरमा के छ? (छोटो विवरण)
          </label>
          <input
            id={`${id}-alt`}
            autoFocus
            value={panel.value}
            onChange={(e) => setPanel({ kind: "alt", value: e.target.value })}
            onKeyDown={(e) => e.key === "Escape" && setPanel(null)}
            className={inputClass}
            placeholder="जस्तै: पनौतीमा बाढीले भत्काएको पुल"
          />
          <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded text-sm">
            राख्नुहोस्
          </button>
          <button type="button" onClick={() => setPanel(null)} className="px-2 py-1.5 text-sm text-gray-600">
            पछि
          </button>
        </form>
      )}

      {uploadError && <p className="px-3 py-2 text-sm text-red-600 border-b border-gray-200">{uploadError}</p>}

      {htmlMode ? (
        <textarea
          aria-label="सामग्रीको HTML"
          value={htmlDraft}
          onChange={(e) => setHtmlDraft(e.target.value)}
          className="block w-full min-h-[22rem] px-5 py-4 font-mono text-sm outline-none resize-y rounded-b-lg"
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <div className="flex justify-between gap-2 border-t border-gray-100 px-3 py-1.5 text-xs text-gray-500">
        <span>{htmlMode ? "HTML सम्पादन: सामान्य सम्पादनमा फर्कँदा लागू हुन्छ।" : "Ctrl+B बाक्लो · Ctrl+K लिङ्क · Ctrl+Z पहिलेको अवस्था"}</span>
        <span>{toNepaliDigits(words)} शब्द</span>
      </div>
    </div>
  );
}

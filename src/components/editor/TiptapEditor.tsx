import { useEditor, EditorContent, ReactRenderer, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Dropcursor from "@tiptap/extension-dropcursor";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  Bold, Italic, Strikethrough, Code, Link as LinkIcon,
  Heading1, Heading2, Quote, List, ListOrdered,
} from "lucide-react";
import { entitiesApi, notesApi } from "@/lib/api";
import type { Entity } from "@/types";
import { MentionList, type MentionListRef, type MentionItem } from "./MentionList";
import { SlashCommands } from "./SlashCommands";

const lowlight = createLowlight(common);

const NoteMention = Mention.extend({
  name: "noteMention",
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: "NOTE",
        parseHTML: (el) => el.getAttribute("data-type") || "NOTE",
        renderHTML: () => ({ "data-type": "NOTE" }),
      },
    };
  },
});

/* ── Caches ── */
const TTL = 4000;
type Cache<T> = { token: string | null; at: number; data: T[]; pending: Promise<T[]> | null };
const entityCache: Cache<Entity> = { token: null, at: 0, data: [], pending: null };
const noteCache: Cache<{ id: string; title: string }> = { token: null, at: 0, data: [], pending: null };

const getToken = () => (typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null);

export const resetEditorCaches = () => {
  Object.assign(entityCache, { token: null, at: 0, data: [], pending: null });
  Object.assign(noteCache, { token: null, at: 0, data: [], pending: null });
};

const loadEntities = async (): Promise<Entity[]> => {
  const token = getToken();
  if (entityCache.token !== token) Object.assign(entityCache, { token, at: 0, data: [], pending: null });
  if (entityCache.pending) return entityCache.pending;
  if (entityCache.data.length && Date.now() - entityCache.at < TTL) return entityCache.data;
  entityCache.pending = entitiesApi.list()
    .then(({ data }) => { entityCache.data = Array.isArray(data) ? data : []; entityCache.at = Date.now(); return entityCache.data; })
    .catch(() => []) .finally(() => { entityCache.pending = null; });
  return entityCache.pending;
};

const loadNotes = async () => {
  const token = getToken();
  if (noteCache.token !== token) Object.assign(noteCache, { token, at: 0, data: [], pending: null });
  if (noteCache.pending) return noteCache.pending;
  if (noteCache.data.length && Date.now() - noteCache.at < TTL) return noteCache.data;
  noteCache.pending = notesApi.list()
    .then(({ data }) => {
      const arr = Array.isArray(data) ? data : [];
      noteCache.data = arr.map((n: any) => ({ id: n.id, title: n.title }));
      noteCache.at = Date.now();
      return noteCache.data;
    })
    .catch(() => []).finally(() => { noteCache.pending = null; });
  return noteCache.pending;
};

/* ── Suggestion factory ── */
const buildSuggestion = (variant: "entity" | "note", currentNoteId?: string) => ({
  char: variant === "entity" ? "@" : "#",
  allowSpaces: false,
  startOfLine: false,
  items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
    const q = query.toLowerCase().trim();
    if (variant === "entity") {
      const entities = await loadEntities();
      const matches: MentionItem[] = entities
        .filter((e) => e.title.toLowerCase().includes(q))
        .slice(0, 8)
        .map((e) => ({ id: e.id, title: e.title, type: e.type }));
      if (q && !matches.some((m) => m.title.toLowerCase() === q)) {
        matches.push({ id: `__create__${q}`, title: query, type: "TOPIC", isCreate: true, createKind: "entity" });
      }
      return matches;
    }
    const notes = await loadNotes();
    const matches: MentionItem[] = notes
      .filter((n) => n.id !== currentNoteId && n.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map((n) => ({ id: n.id, title: n.title, type: "NOTE" }));
    if (q && !matches.some((m) => m.title.toLowerCase() === q)) {
      matches.push({ id: `__create__${q}`, title: query, type: "NOTE", isCreate: true, createKind: "note" });
    }
    return matches;
  },
  command: ({ editor, range, props }: any) => {
    const item = props as MentionItem;
    const finalize = (id: string, label: string) => {
      const nodeName = variant === "entity" ? "mention" : "noteMention";
      const attrs = variant === "entity" ? { id, label } : { id, label, type: "NOTE" };
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([
          { type: nodeName, attrs },
          { type: "text", text: " " },
        ])
        .run();
    };

    if (item.isCreate) {
      const title = item.title.trim();
      if (!title) return;
      if (item.createKind === "entity") {
        entitiesApi.create(title, "TOPIC").then((res) => {
          const created = res.data as Entity;
          entityCache.data = [created, ...entityCache.data];
          finalize(created.id, created.title);
        });
        return;
      }
      notesApi.create(title, { type: "doc", content: [{ type: "paragraph" }] }).then((res) => {
        const created = res.data as { id: string; title: string };
        noteCache.data = [{ id: created.id, title: created.title }, ...noteCache.data];
        finalize(created.id, created.title);
      });
      return;
    }

    finalize(item.id, item.title);
  },
  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null;
    let popup: TippyInstance[] | null = null;
    return {
      onStart: (props: SuggestionProps<MentionItem>) => {
        component = new ReactRenderer(MentionList, {
          props: { ...props, query: props.query, variant },
          editor: props.editor,
        });
        if (!props.clientRect) return;
        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },
      onUpdate(props: SuggestionProps<MentionItem>) {
        component?.updateProps({ ...props, query: props.query, variant });
        if (props.clientRect) popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") { popup?.[0]?.hide(); return true; }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit() { popup?.[0]?.destroy(); component?.destroy(); },
    };
  },
});

/* ── Component API ── */
export interface TiptapEditorHandle {
  getJSON: () => any;
  getHTML: () => string;
  getText: () => string;
  getEditor: () => Editor | null;
}

interface Props {
  content?: any;
  onChange?: (json: any) => void;
  editable?: boolean;
  className?: string;
  currentNoteId?: string;
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(
  ({ content, onChange, editable = true, className, currentNoteId }, ref) => {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false,
          dropcursor: false,
        }),
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "heading") return "Heading";
            return "Type / for commands, @ for entities, # to link a note";
          },
          showOnlyWhenEditable: true,
          showOnlyCurrent: false,
        }),
        Typography,
        CharacterCount,
        Dropcursor.configure({ color: "hsl(var(--primary))", width: 2 }),
        LinkExtension.configure({
          openOnClick: true,
          autolink: true,
          HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" },
        }),
        Image.configure({ HTMLAttributes: { class: "rounded-lg my-4 max-w-full" } }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        CodeBlockLowlight.configure({ lowlight }),
        Mention.configure({
          HTMLAttributes: { class: "continuum-entity-mention" },
          suggestion: buildSuggestion("entity") as any,
        }),
        NoteMention.configure({
          HTMLAttributes: { class: "continuum-note-mention" },
          suggestion: buildSuggestion("note", currentNoteId) as any,
        }),
        SlashCommands,
      ],
      content: content || { type: "doc", content: [{ type: "paragraph" }] },
      editable,
      editorProps: {
        attributes: {
          class: `continuum-editor prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh] ${className || ""}`,
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (!file) continue;
              const reader = new FileReader();
              reader.onload = (e) => {
                const url = e.target?.result;
                if (typeof url === "string") {
                  view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src: url })));
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current?.(editor.getJSON());
      },
    });

    useImperativeHandle(ref, () => ({
      getJSON: () => editor?.getJSON(),
      getHTML: () => editor?.getHTML() || "",
      getText: () => editor?.getText() || "",
      getEditor: () => editor,
    }));

    useEffect(() => {
      if (!editor || !content) return;
      const a = JSON.stringify(editor.getJSON());
      const b = JSON.stringify(content);
      if (a !== b && typeof content === "object") editor.commands.setContent(content, { emitUpdate: false });
    }, [content, editor]);

    useEffect(() => { if (editor) editor.setEditable(editable); }, [editor, editable]);

    useEffect(() => {
      resetEditorCaches();
      const onFocus = () => resetEditorCaches();
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }, []);

    return (
      <>
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ placement: "top" }}
            className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-popover/95 backdrop-blur-md shadow-2xl px-1 py-1"
          >
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Bold" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Italic" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Strike" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleCode().run()} active={editor.isActive("code")} icon={Code} label="Code" />
            <div className="w-px h-5 bg-border/60 mx-0.5" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} icon={Heading1} label="H1" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} icon={Heading2} label="H2" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Quote" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Bullets" />
            <ToolbarBtn editor={editor} action={(e) => e.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Numbered" />
            <div className="w-px h-5 bg-border/60 mx-0.5" />
            <ToolbarBtn
              editor={editor}
              action={(e) => {
                const url = window.prompt("URL", e.getAttributes("link").href || "https://");
                if (url === null) return;
                if (url === "") { e.chain().focus().unsetLink().run(); return; }
                e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
              }}
              active={editor.isActive("link")} icon={LinkIcon} label="Link" />
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </>
    );
  }
);
TiptapEditor.displayName = "TiptapEditor";

function ToolbarBtn({
  editor, action, active, icon: Icon, label,
}: { editor: Editor; action: (e: Editor) => void; active: boolean; icon: typeof Bold; label: string }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => { e.preventDefault(); action(editor); }}
      className={`p-1.5 rounded-md transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

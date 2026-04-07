import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { entitiesApi } from "@/lib/api";
import type { Entity } from "@/types";

/* ── Mention suggestion list ── */
interface MentionListProps {
  items: Entity[];
  command: (attrs: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command({ id: item.id, label: item.title });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="rounded-lg border border-border bg-popover p-2 shadow-xl">
          <p className="px-2 py-1 text-xs text-muted-foreground">Nenhuma entidade encontrada</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-border bg-popover shadow-xl overflow-hidden min-w-[200px]">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => selectItem(index)}
            className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors ${
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "text-popover-foreground hover:bg-accent/50"
            }`}
          >
            <span className="text-xs opacity-60">
              {item.type === "HABIT" ? "🟢" : item.type === "PERSON" ? "🟡" : item.type === "PROJECT" ? "🔵" : item.type === "ORGANIZATION" ? "🟠" : "🟣"}
            </span>
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>
    );
  }
);
MentionList.displayName = "MentionList";

/* ── Suggestion plugin config ── */
interface EntityCacheState {
  token: string | null;
  fetchedAt: number;
  entities: Entity[];
  pending: Promise<Entity[]> | null;
}

const ENTITY_CACHE_TTL = 5000;

const entityCache: EntityCacheState = {
  token: null,
  fetchedAt: 0,
  entities: [],
  pending: null,
};

const resetEntityCache = () => {
  entityCache.token = null;
  entityCache.fetchedAt = 0;
  entityCache.entities = [];
  entityCache.pending = null;
};

const loadEntities = async () => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
  const now = Date.now();

  if (entityCache.token !== token) {
    resetEntityCache();
    entityCache.token = token;
  }

  if (entityCache.pending) {
    return entityCache.pending;
  }

  if (entityCache.entities.length > 0 && now - entityCache.fetchedAt < ENTITY_CACHE_TTL) {
    return entityCache.entities;
  }

  entityCache.pending = entitiesApi
    .list()
    .then(({ data }) => {
      const nextEntities = Array.isArray(data) ? data : [];
      entityCache.entities = nextEntities;
      entityCache.fetchedAt = Date.now();
      return nextEntities;
    })
    .catch(() => {
      entityCache.entities = [];
      entityCache.fetchedAt = 0;
      return [];
    })
    .finally(() => {
      entityCache.pending = null;
    });

  return entityCache.pending;
};

const mentionSuggestion = {
  char: "@",
  items: async ({ query }: { query: string }) => {
    const entities = await loadEntities();

    return entities
      .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  },
  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props: SuggestionProps<Entity>) => {
        component = new ReactRenderer(MentionList, {
          props,
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
      onUpdate(props: SuggestionProps<Entity>) {
        component?.updateProps(props);
        if (props.clientRect) {
          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        }
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};

/* ── Bracket link suggestion (same as mention but with [[) ── */
const bracketSuggestion = {
  ...mentionSuggestion,
  char: "[[",
};

/* ── Editor component ── */
export interface TiptapEditorHandle {
  getJSON: () => any;
  getHTML: () => string;
  getText: () => string;
  getEditor: () => Editor | null;
}

interface TiptapEditorProps {
  content?: any;
  onChange?: (json: any) => void;
  editable?: boolean;
  className?: string;
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  ({ content, onChange, editable = true, className }, ref) => {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({
          placeholder: "Comece a escrever... Use @ para mencionar entidades",
        }),
        LinkExtension.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention bg-primary/10 text-primary rounded px-1 py-0.5 font-medium text-sm",
          },
          suggestion: mentionSuggestion,
        }),
      ],
      content: content || "",
      editable,
      editorProps: {
        attributes: {
          class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh] ${className || ""}`,
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

    // Update content from outside
    useEffect(() => {
      if (!editor || !content) return;
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON && typeof content === "object") {
        editor.commands.setContent(content);
      }
    }, [content, editor]);

    useEffect(() => {
      if (editor) editor.setEditable(editable);
    }, [editor, editable]);

    // Invalidate entity cache periodically
    useEffect(() => {
      resetEntityCache();

      const handleFocus = () => resetEntityCache();
      window.addEventListener("focus", handleFocus);

      return () => {
        window.removeEventListener("focus", handleFocus);
      };
    }, []);

    return <EditorContent editor={editor} />;
  }
);
TiptapEditor.displayName = "TiptapEditor";

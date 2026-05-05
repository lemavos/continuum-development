import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import { Hash, AtSign, Plus, FileText, User, Folder, Building2, Tag, CircleDot } from "lucide-react";

export interface MentionItem {
  id: string;
  title: string;
  type: string;
  isCreate?: boolean;
  createKind?: "entity" | "note";
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
  query: string;
  variant: "entity" | "note";
}

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const iconFor = (type: string) => {
  switch (type) {
    case "NOTE":
      return FileText;
    case "PERSON":
      return User;
    case "PROJECT":
      return Folder;
    case "ORGANIZATION":
      return Building2;
    case "ACTIVITY":
      return CircleDot;
    default:
      return Tag;
  }
};

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command, query, variant }, ref) => {
    const [selected, setSelected] = useState(0);
    useEffect(() => setSelected(0), [items]);

    const select = (i: number) => {
      const item = items[i];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelected((s) => (s + items.length - 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    const Trigger = variant === "note" ? Hash : AtSign;

    return (
      <div className="rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-2xl overflow-hidden min-w-[260px] max-w-[320px] py-1">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
          <Trigger className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">
            {query ? `Searching "${query}"` : variant === "note" ? "Link a note" : "Mention an entity"}
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">No results</div>
          ) : (
            items.map((item, i) => {
              const Icon = item.isCreate ? Plus : iconFor(item.type);
              return (
                <button
                  key={`${item.id}-${i}`}
                  onMouseDown={(e) => { e.preventDefault(); select(i); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm transition-colors ${
                    i === selected
                      ? "bg-accent text-accent-foreground"
                      : "text-popover-foreground hover:bg-accent/50"
                  }`}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-md ${
                    item.isCreate ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    {item.isCreate && (
                      <div className="text-[10px] text-muted-foreground">
                        Create new {item.createKind}
                      </div>
                    )}
                    {!item.isCreate && (
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {item.type.toLowerCase()}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 rounded bg-muted">↑↓</kbd> nav</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted">↵</kbd> select</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted">esc</kbd> close</span>
        </div>
      </div>
    );
  }
);
MentionList.displayName = "MentionList";

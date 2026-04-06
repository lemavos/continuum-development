import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { notesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2, Check, PanelRight, PanelRightClose } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TiptapEditor, type TiptapEditorHandle } from "@/components/TiptapEditor";
import { BacklinksPanel } from "@/components/BacklinksPanel";

interface NoteData {
  id: string;
  title: string;
  content: string;
  folderId?: string;
  entityIds: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const editorRef = useRef<TiptapEditorHandle>(null);

  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showBacklinks, setShowBacklinks] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSON = useRef<string>("");
  const lastSavedTitle = useRef<string>("");
  const currentJSON = useRef<any>(null);

  // Load note
  useEffect(() => {
    if (!id) return;
    notesApi
      .get(id)
      .then(({ data }) => {
        setNote(data);
        setTitle(data.title);
        lastSavedTitle.current = data.title;
        // Try to parse content as JSON (Tiptap), fall back to wrapping text
        try {
          let parsed = JSON.parse(data.content);
          // Fix double-stringified content (backend may return "\"...\"")
          while (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          currentJSON.current = parsed;
          lastSavedJSON.current = JSON.stringify(parsed);
        } catch {
          // Legacy markdown content → convert to paragraph
          const doc = {
            type: "doc",
            content: data.content
              ? data.content.split("\n").map((line: string) => ({
                  type: "paragraph",
                  content: line ? [{ type: "text", text: line }] : [],
                }))
              : [{ type: "paragraph" }],
          };
          currentJSON.current = doc;
          lastSavedJSON.current = JSON.stringify(doc);
        }
      })
      .catch(() => {
        toast({ title: "Nota não encontrada", variant: "destructive" });
        navigate("/notes");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  // Extract entity IDs from Tiptap JSON
  const extractEntityIds = useCallback((json: any): string[] => {
    const ids: string[] = [];
    const walk = (node: any) => {
      if (!node) return;
      if (node.type === "mention" && node.attrs?.id) {
        ids.push(node.attrs.id);
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(walk);
      }
    };
    walk(json);
    return [...new Set(ids)];
  }, []);

  const doSave = useCallback(
    async (t: string, json: any) => {
      if (!id) return;
      const jsonStr = JSON.stringify(json);
      if (t === lastSavedTitle.current && jsonStr === lastSavedJSON.current) return;

      setSaveStatus("saving");
      try {
        const entityIds = extractEntityIds(json);
        await notesApi.update(id, {
          title: t,
          content: jsonStr,
          entityIds,
        });
        lastSavedTitle.current = t;
        lastSavedJSON.current = jsonStr;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error: any) {
        setSaveStatus("idle");
        if (error?.response?.status === 401) {
          toast({ title: "Sessão expirada", variant: "destructive" });
        } else {
          toast({ title: "Erro ao salvar nota", variant: "destructive" });
        }
      }
    },
    [id, extractEntityIds, toast]
  );

  const scheduleAutoSave = useCallback(
    (t: string, json: any) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => doSave(t, json), 1500);
    },
    [doSave]
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleAutoSave(val, currentJSON.current);
  };

  const handleEditorChange = useCallback(
    (json: any) => {
      currentJSON.current = json;
      scheduleAutoSave(title, json);
    },
    [title, scheduleAutoSave]
  );

  const handleManualSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const json = editorRef.current?.getJSON() || currentJSON.current;
    await doSave(title, json);
    toast({ title: "Nota salva!" });
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/notes")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <div className="flex items-center gap-2">
              {/* Save status */}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check className="w-3 h-3 text-primary" /> Salvo
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBacklinks(!showBacklinks)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showBacklinks ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRight className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleManualSave}
                disabled={saveStatus === "saving"}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto px-4 lg:px-16 py-6 max-w-3xl mx-auto w-full">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Título da nota..."
              className="text-2xl font-display font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent text-foreground mb-4 h-auto"
            />

            {currentJSON.current && (
              <TiptapEditor
                ref={editorRef}
                content={currentJSON.current}
                onChange={handleEditorChange}
              />
            )}
          </div>

          {/* Footer save status */}
          <div className="px-4 py-1.5 border-t border-border/30 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {note?.updatedAt
                ? `Última edição: ${new Date(note.updatedAt).toLocaleString("pt-BR")}`
                : ""}
            </span>
            <span className="flex items-center gap-1">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="w-2.5 h-2.5" /> Saved
                </>
              )}
              {saveStatus === "idle" && "Ready"}
            </span>
          </div>
        </div>

        {/* Backlinks panel (right column) */}
        {showBacklinks && id && (
          <div className="w-72 border-l border-border/50 bg-card/50 overflow-auto hidden lg:block shrink-0">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Backlinks
              </h3>
            </div>
            <BacklinksPanel noteId={id} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

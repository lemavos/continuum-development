import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi, notesApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Eye, Edit3, Check, AtSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NoteData { id: string; title: string; content: string; folderId?: string; entityIds: string[]; createdAt: string; updatedAt: string; }
interface MentionEntity { id: string; title: string; type: string; }

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [entities, setEntities] = useState<MentionEntity[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ title: "", content: "" });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([notesApi.get(id), entitiesApi.list()]).then(([noteRes, entitiesRes]) => {
      const data = noteRes.data;
      setNote(data); setTitle(data.title); setContent(data.content || "");
      setEntities(Array.isArray(entitiesRes.data) ? entitiesRes.data : []);
      lastSaved.current = { title: data.title, content: data.content || "" };
    }).catch(() => { toast({ title: "Nota não encontrada", variant: "destructive" }); navigate("/notes"); })
    .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  const doSave = useCallback(async (t: string, c: string) => {
    if (!id || (t === lastSaved.current.title && c === lastSaved.current.content)) return;
    setSaving(true);
    try { await notesApi.update(id, { title: t, content: c }); lastSaved.current = { title: t, content: c }; setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000); }
    catch {} finally { setSaving(false); }
  }, [id]);

  const scheduleAutoSave = useCallback((t: string, c: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(t, c), 1500);
  }, [doSave]);

  const handleTitleChange = (val: string) => { setTitle(val); scheduleAutoSave(val, content); };

  const syncMentionState = useCallback((value: string, caretPosition: number) => {
    const beforeCaret = value.slice(0, caretPosition);
    const match = beforeCaret.match(/(^|\s)@([^\s@]*)$/);

    if (!match) {
      setMentionOpen(false);
      setMentionQuery("");
      setMentionRange(null);
      return;
    }

    const atIndex = beforeCaret.lastIndexOf("@");
    if (atIndex === -1) return;

    setMentionOpen(true);
    setMentionQuery(match[2]?.toLowerCase() ?? "");
    setMentionRange({ start: atIndex, end: caretPosition });
  }, []);

  const handleContentChange = (val: string, caretPosition?: number) => {
    setContent(val);
    scheduleAutoSave(title, val);
    syncMentionState(val, caretPosition ?? val.length);
  };

  const filteredMentions = useMemo(() => {
    if (!mentionOpen) return [];

    return entities
      .filter((entity) => entity.title.toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [entities, mentionOpen, mentionQuery]);

  const linkedEntities = useMemo(() => {
    if (!note?.entityIds?.length) return [];

    const labels = new Map(entities.map((entity) => [entity.id, entity]));
    return note.entityIds.map((entityId) => labels.get(entityId) ?? { id: entityId, title: entityId, type: "ENTITY" });
  }, [note?.entityIds, entities]);

  const insertMention = (entity: MentionEntity) => {
    if (!mentionRange) return;

    const nextMention = `[@${entity.title}](/entities/${entity.id}) `;
    const nextContent = `${content.slice(0, mentionRange.start)}${nextMention}${content.slice(mentionRange.end)}`;
    const nextCaret = mentionRange.start + nextMention.length;

    setContent(nextContent);
    scheduleAutoSave(title, nextContent);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionRange(null);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleManualSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (!id) return;
    setSaving(true);
    try { await notesApi.update(id, { title, content }); lastSaved.current = { title, content }; toast({ title: "Nota salva!" }); }
    catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  useEffect(() => { return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }; }, []);

  if (loading) {
    return <AppLayout><div className="flex justify-center items-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/notes")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            {autoSaved && <span className="text-xs text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Salvo</span>}
            {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>}
            <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)} className="text-muted-foreground">
              {preview ? <Edit3 className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {preview ? "Editar" : "Preview"}
            </Button>
            <Button size="sm" onClick={handleManualSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </div>
        </div>

        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Título da nota..."
          className="text-xl font-display font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent text-foreground"
        />

        {preview ? (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith("/")) {
                    return <Link to={href} className="text-primary underline underline-offset-4">{children}</Link>;
                  }

                  return <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">{children}</a>;
                },
              }}
            >
              {content || "*Nenhum conteúdo ainda...*"}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="relative space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AtSign className="w-3.5 h-3.5" /> Digite @ para mencionar entidades no texto.
            </div>

            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value, e.target.selectionStart)}
              onClick={(e) => syncMentionState(e.currentTarget.value, e.currentTarget.selectionStart)}
              onKeyUp={(e) => syncMentionState(e.currentTarget.value, e.currentTarget.selectionStart)}
              placeholder="Comece a escrever em Markdown..."
              className="min-h-[60vh] border-0 px-0 focus-visible:ring-0 bg-transparent resize-none text-sm leading-relaxed font-mono text-foreground/80"
            />

            {mentionOpen && filteredMentions.length > 0 && (
              <div className="absolute left-0 top-10 z-20 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                {filteredMentions.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(entity);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">@{entity.title}</p>
                      <p className="text-xs text-muted-foreground">{entity.type}</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-primary">Inserir</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {linkedEntities.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {linkedEntities.map((entity) => (
              <Link key={entity.id} to={`/entities/${entity.id}`} className="bento-tag text-xs">
                @{entity.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

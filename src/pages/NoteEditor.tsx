import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi, notesApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, Eye, Edit3, Check, AtSign, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EntityMentionSelector } from "@/components/EntityMentionSelector";
import { SideInspector } from "@/components/SideInspector";
import { MentionBadge } from "@/components/MentionBadge";
import { useEntityStore } from "@/contexts/EntityContext";
import type { Entity } from "@/types";

interface NoteData { id: string; title: string; content: string; folderId?: string; entityIds: string[]; createdAt: string; updatedAt: string; }

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Zustand store
  const { 
    activeMention, 
    setActiveMention, 
    inspectorOpen, 
    inspectorEntity, 
    openInspector, 
    closeInspector,
    entitiesInNote,
    setEntitiesInNote,
  } = useEntityStore();
  
  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [entities, setEntities] = useState<Entity[]>([]);
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
      const allEntities = Array.isArray(entitiesRes.data) ? entitiesRes.data : [];
      setNote(data); 
      setTitle(data.title); 
      setContent(data.content || "");
      setEntities(allEntities);
      
      // Sync Zustand store with linked entities
      if (data.entityIds?.length) {
        const linkedEntities = data.entityIds
          .map((entityId: string) => allEntities.find(e => e.id === entityId))
          .filter((e): e is Entity => e !== undefined);
        setEntitiesInNote(linkedEntities);
      }
      
      lastSaved.current = { title: data.title, content: data.content || "" };
    }).catch(() => { toast({ title: "Nota não encontrada", variant: "destructive" }); navigate("/notes"); })
    .finally(() => setLoading(false));
  }, [id, navigate, toast, setEntitiesInNote]);

  const extractEntityIds = useCallback((text: string): string[] => {
    const matches = text.match(/\[@[^\]]+\]\(\/entities\/([^\)]+)\)/g) || [];
    return matches.map(match => {
      const idMatch = match.match(/\/entities\/([^)]+)/);
      return idMatch ? idMatch[1] : "";
    }).filter(Boolean);
  }, []);

  const doSave = useCallback(async (t: string, c: string) => {
    if (!id || (t === lastSaved.current.title && c === lastSaved.current.content)) return;
    setSaving(true);
    try {
      const entityIds = extractEntityIds(c);
      await notesApi.update(id, { title: t, content: c, entityIds });
      lastSaved.current = { title: t, content: c };
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
      // Update local note
      setNote(prev => prev ? { ...prev, entityIds } : null);
    }
    catch {} finally { setSaving(false); }
  }, [id, extractEntityIds]);

  const scheduleAutoSave = useCallback((t: string, c: string) => {
    if (!autoSaveEnabled) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(t, c), 1500);
  }, [doSave, autoSaveEnabled]);

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
    return entitiesInNote;
  }, [entitiesInNote]);

  const insertMention = (entity: Entity) => {
    if (!mentionRange) return;

    const nextMention = `[@${entity.title}](/entities/${entity.id}) `;
    const nextContent = `${content.slice(0, mentionRange.start)}${nextMention}${content.slice(mentionRange.end)}`;
    const nextCaret = mentionRange.start + nextMention.length;

    setContent(nextContent);
    scheduleAutoSave(title, nextContent);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionRange(null);
    
    // Update Zustand store and open inspector
    setActiveMention({
      id: entity.id,
      title: entity.title,
      type: entity.type,
    });
    openInspector(entity);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleManualSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (!id) return;
    setSaving(true);
    try {
      const entityIds = extractEntityIds(content);
      await notesApi.update(id, { title, content, entityIds });
      lastSaved.current = { title, content };
      setNote(prev => prev ? { ...prev, entityIds } : null);
      toast({ title: "Nota salva!" });
    }
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Configurações da Nota</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autosave">Salvamento automático</Label>
                    <Switch id="autosave" checked={autoSaveEnabled} onCheckedChange={setAutoSaveEnabled} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 last:mb-0 pl-6 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 last:mb-0 pl-6 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
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

            <div className="relative">
              {/* Mention dropdown anchored above textarea */}
              {mentionOpen && (
                <div className="absolute left-0 bottom-full z-50 mb-1 w-72">
                  <EntityMentionSelector
                    isOpen={mentionOpen}
                    query={mentionQuery}
                    entities={entities}
                    onEntitySelect={insertMention}
                    onQueryChange={setMentionQuery}
                  />
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value, e.target.selectionStart)}
                onClick={(e) => syncMentionState(e.currentTarget.value, e.currentTarget.selectionStart)}
                onKeyUp={(e) => syncMentionState(e.currentTarget.value, e.currentTarget.selectionStart)}
                placeholder="Comece a escrever em Markdown..."
                className="min-h-[60vh] border-0 px-0 focus-visible:ring-0 bg-transparent resize-none text-sm leading-relaxed font-mono text-foreground/80"
              />
            </div>
          </div>
        )}

        {linkedEntities.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-muted-foreground font-medium">Entidades mencionadas:</span>
            {linkedEntities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => openInspector(entity)}
                className="hover:z-40 transition-all"
              >
                <MentionBadge
                  title={entity.title}
                  type={entity.type}
                />
              </button>
            ))}
          </div>
        )}

        {/* SideInspector Component */}
        <SideInspector
          isOpen={inspectorOpen}
          entity={inspectorEntity}
          onClose={closeInspector}
        />
      </div>
    </AppLayout>
  );
}

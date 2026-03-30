import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { notesApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Eye, Edit3, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NoteData { id: string; title: string; content: string; folderId?: string; entityIds: string[]; createdAt: string; updatedAt: string; }

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
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ title: "", content: "" });

  useEffect(() => {
    if (!id) return;
    notesApi.get(id).then(({ data }) => {
      setNote(data); setTitle(data.title); setContent(data.content || "");
      lastSaved.current = { title: data.title, content: data.content || "" };
    }).catch(() => { toast({ title: "Nota não encontrada", variant: "destructive" }); navigate("/notes"); })
    .finally(() => setLoading(false));
  }, [id]);

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
  const handleContentChange = (val: string) => { setContent(val); scheduleAutoSave(title, val); };

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
          <div className="prose prose-sm prose-invert max-w-none min-h-[60vh] text-foreground/90">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nenhum conteúdo ainda...*"}</ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Comece a escrever em Markdown..."
            className="min-h-[60vh] border-0 px-0 focus-visible:ring-0 bg-transparent resize-none text-sm leading-relaxed font-mono text-foreground/80"
          />
        )}

        {note?.entityIds && note.entityIds.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {note.entityIds.map((eId) => <span key={eId} className="bento-tag text-xs">@{eId}</span>)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

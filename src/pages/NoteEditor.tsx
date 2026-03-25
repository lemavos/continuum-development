import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { notesApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    notesApi.get(id).then(({ data }) => {
      setNote(data);
      setTitle(data.title);
      setContent(data.content || "");
    }).catch(() => {
      toast({ title: "Nota não encontrada", variant: "destructive" });
      navigate("/notes");
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await notesApi.update(id, { title, content });
      toast({ title: "Nota salva!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/notes")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Salvar
          </Button>
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da nota..."
          className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
        />

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comece a escrever..."
          className="min-h-[60vh] border-0 px-0 focus-visible:ring-0 bg-transparent resize-none text-sm leading-relaxed"
        />

        {note?.entityIds && note.entityIds.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {note.entityIds.map((eId) => (
              <span key={eId} className="bento-tag text-xs">@{eId}</span>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

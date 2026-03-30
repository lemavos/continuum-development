import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { notesApi, foldersApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, StickyNote, Folder, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NoteSummary { id: string; title: string; folderId?: string; createdAt: string; updatedAt: string; }
interface FolderItem { id: string; name: string; parentId?: string; }

export default function Notes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreateNote, getLimitMessage, refresh } = usePlanGate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, foldersRes] = await Promise.all([notesApi.list(), foldersApi.list()]);
      setNotes(notesRes.data);
      setFolders(foldersRes.data);
    } catch { toast({ title: "Erro ao carregar notas", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateNote = async () => {
    if (!canCreateNote) { setUpgradeOpen(true); return; }
    try {
      const { data } = await notesApi.create("Nova Nota", "", selectedFolder || undefined);
      await refresh();
      navigate(`/notes/${data.id}`);
    } catch (err: any) {
      if (err.response?.status === 403) setUpgradeOpen(true);
      else toast({ title: "Erro", description: err.response?.data?.message || "Limite atingido?", variant: "destructive" });
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await notesApi.delete(id); setNotes((prev) => prev.filter((n) => n.id !== id)); await refresh(); }
    catch { toast({ title: "Erro ao deletar", variant: "destructive" }); }
  };

  const filtered = notes.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchFolder = selectedFolder ? n.folderId === selectedFolder : true;
    return matchSearch && matchFolder;
  });

  const limitMsg = getLimitMessage("notes");

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Notas</h1>
            {limitMsg && <p className="text-xs text-muted-foreground mt-1">{limitMsg}</p>}
          </div>
          <Button onClick={handleCreateNote} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={!canCreateNote && canCreateNote !== undefined}>
            <Plus className="w-4 h-4 mr-1" /> Nova Nota
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-44 lg:shrink-0 space-y-0.5">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              <button
                onClick={() => setSelectedFolder(null)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-all shrink-0",
                  !selectedFolder ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <StickyNote className="w-3.5 h-3.5" /> Todas
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-all shrink-0",
                    selectedFolder === f.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Folder className="w-3.5 h-3.5" /> {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar notas..." className="pl-9 bg-accent border-border/50" />
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <StickyNote className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">Nenhuma nota encontrada</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all hover:bg-accent border border-transparent hover:border-border/50"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{note.title || "Sem título"}</h3>
                      <p className="text-xs text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="Você atingiu o limite de notas do seu plano." />
    </AppLayout>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { notesApi, foldersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  StickyNote,
  Folder,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NoteSummary {
  id: string;
  title: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
}

export default function Notes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, foldersRes] = await Promise.all([notesApi.list(), foldersApi.list()]);
      setNotes(notesRes.data);
      setFolders(foldersRes.data);
    } catch {
      toast({ title: "Erro ao carregar notas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateNote = async () => {
    try {
      const { data } = await notesApi.create("Nova Nota", "", selectedFolder || undefined);
      navigate(`/notes/${data.id}`);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.response?.data?.message || "Limite de notas atingido?",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notesApi.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const filtered = notes.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchFolder = selectedFolder ? n.folderId === selectedFolder : true;
    return matchSearch && matchFolder;
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notas</h1>
          <Button onClick={handleCreateNote} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova Nota
          </Button>
        </div>

        <div className="flex gap-3">
          {/* Folders sidebar */}
          <div className="w-48 shrink-0 space-y-1">
            <button
              onClick={() => setSelectedFolder(null)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                !selectedFolder ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent"
              )}
            >
              <StickyNote className="w-4 h-4" /> Todas
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolder(f.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedFolder === f.id ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Folder className="w-4 h-4" /> {f.name}
              </button>
            ))}
          </div>

          {/* Notes list */}
          <div className="flex-1 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar notas..."
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma nota encontrada
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="bento-card group p-4 cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground text-sm truncate">{note.title || "Sem título"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

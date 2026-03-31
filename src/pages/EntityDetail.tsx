import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Flame, CheckCircle, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { HeatmapData, EntityStats } from "@/types";

interface EntityData { id: string; title: string; type: string; description?: string; trackingDates?: string[]; createdAt: string; }

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [stats, setStats] = useState<EntityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([entitiesApi.get(id), entitiesApi.heatmap(id), entitiesApi.stats(id)])
      .then(([eRes, hRes, sRes]) => {
        setEntity(eRes.data);
        setHeatmap(hRes.data && typeof hRes.data === 'object' ? hRes.data : {});
        setStats(sRes.data);
      }).catch(() => { toast({ title: "Entidade não encontrada", variant: "destructive" }); navigate("/entities"); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleTrack = async () => {
    if (!id) return;
    try {
      const { data } = await entitiesApi.track(id);
      setEntity(data);
      const [sRes, hRes] = await Promise.all([entitiesApi.stats(id), entitiesApi.heatmap(id)]);
      setStats(sRes.data);
      setHeatmap(hRes.data && typeof hRes.data === 'object' ? hRes.data : {});
      toast({ title: "Registrado! 🔥" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const handleSaveTitle = async () => {
    if (!id || !newTitle.trim()) return;
    try {
      const { data } = await entitiesApi.update(id, { title: newTitle.trim() });
      setEntity(data);
      setEditingTitle(false);
      toast({ title: "Nome atualizado!" });
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
  };

  const getLast90Days = () => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(d.toISOString().split("T")[0]); }
    return days;
  };

  const getHeatmapColor = (val: number) => {
    if (val === 0) return "bg-accent";
    if (val === 1) return "bg-primary/20";
    if (val <= 3) return "bg-primary/50";
    return "bg-primary";
  };

  if (loading) return <AppLayout><div className="flex justify-center items-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!entity) return null;

  const days = getLast90Days();
  const isHabit = entity.type === "HABIT";
  const today = new Date().toISOString().split("T")[0];
  const trackedToday = entity.trackingDates?.includes(today);
  const streak = stats?.currentStreak ?? 0;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/entities")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="space-y-3">
          {editingTitle ? (
            <div className="flex gap-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Novo nome..." className="flex-1" />
              <Button size="sm" onClick={handleSaveTitle}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingTitle(false); setNewTitle(entity?.title || ""); }}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{entity.title}</h1>
              <Button variant="ghost" size="sm" onClick={() => { setEditingTitle(true); setNewTitle(entity?.title || ""); }}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <span className="bento-tag">{entity.type}</span>
            {isHabit && <span className="bento-tag flex items-center gap-1 text-primary"><Flame className="w-3 h-3" /> Streak: {streak} dias</span>}
            {stats && <span className="bento-tag">Total: {stats.totalCompletions}</span>}
          </div>
          {entity.description && <p className="text-sm text-muted-foreground">{entity.description}</p>}
        </div>

        {isHabit && (
          <>
            <Button onClick={handleTrack} disabled={!!trackedToday} className={trackedToday ? "bg-accent text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"}>
              <CheckCircle className="w-4 h-4 mr-1" /> {trackedToday ? "Feito hoje ✓" : "Registrar hoje"}
            </Button>

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Últimos 90 dias</h2>
              <div className="flex flex-wrap gap-1">
                {days.map((day) => (
                  <div key={day} title={`${day}: ${heatmap[day] || 0}`} className={cn("w-3 h-3 rounded-sm transition-colors", getHeatmapColor(heatmap[day] || 0))} />
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="w-3 h-3 rounded-sm bg-accent" />
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <div className="w-3 h-3 rounded-sm bg-primary/50" />
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span>Mais</span>
              </div>
            </div>
          </>
        )}

        <div className="bento-card p-4">
          <p className="text-xs text-muted-foreground">Criado em {new Date(entity.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>
    </AppLayout>
  );
}

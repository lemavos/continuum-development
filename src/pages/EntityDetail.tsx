import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Flame, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { HeatmapData, EntityStats } from "@/types";

interface EntityData {
  id: string;
  title: string;
  type: string;
  description?: string;
  trackingDates?: string[];
  createdAt: string;
}

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [stats, setStats] = useState<EntityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      entitiesApi.get(id),
      entitiesApi.heatmap(id),
      entitiesApi.stats(id),
    ]).then(([eRes, hRes, sRes]) => {
      setEntity(eRes.data);
      setHeatmap(hRes.data || {});
      setStats(sRes.data);
    }).catch(() => {
      toast({ title: "Entidade não encontrada", variant: "destructive" });
      navigate("/entities");
    }).finally(() => setLoading(false));
  }, [id]);

  const handleTrack = async () => {
    if (!id) return;
    try {
      const { data } = await entitiesApi.track(id);
      setEntity(data);
      // Refresh stats from backend
      const [sRes] = await Promise.all([entitiesApi.stats(id)]);
      setStats(sRes.data);
      toast({ title: "Registrado! 🔥" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const getLast90Days = () => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  };

  const getHeatmapColor = (val: number) => {
    if (val === 0) return "bg-accent";
    if (val === 1) return "bg-success/30";
    if (val <= 3) return "bg-success/60";
    return "bg-success";
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

  if (!entity) return null;

  const days = getLast90Days();
  const isHabit = entity.type === "HABIT";
  const today = new Date().toISOString().split("T")[0];
  const trackedToday = entity.trackingDates?.includes(today);

  // Use backend streak instead of calculating locally
  const streak = stats?.currentStreak ?? 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/entities")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{entity.title}</h1>
          <div className="flex gap-2">
            <span className="bento-tag">{entity.type}</span>
            {isHabit && (
              <span className="bento-tag flex items-center gap-1">
                <Flame className="w-3 h-3" /> Streak: {streak} dias
              </span>
            )}
            {stats && (
              <span className="bento-tag">
                Total: {stats.totalCompletions}
              </span>
            )}
          </div>
          {entity.description && (
            <p className="text-sm text-muted-foreground">{entity.description}</p>
          )}
        </div>

        {isHabit && (
          <>
            <Button onClick={handleTrack} disabled={!!trackedToday} variant={trackedToday ? "secondary" : "default"}>
              <CheckCircle className="w-4 h-4 mr-1" />
              {trackedToday ? "Feito hoje ✓" : "Registrar hoje"}
            </Button>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-foreground">Últimos 90 dias</h2>
              <div className="flex flex-wrap gap-1">
                {days.map((day) => {
                  const val = heatmap[day] || 0;
                  return (
                    <div
                      key={day}
                      title={`${day}: ${val}`}
                      className={cn(
                        "w-3 h-3 rounded-sm transition-colors",
                        getHeatmapColor(val)
                      )}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="w-3 h-3 rounded-sm bg-accent" />
                <div className="w-3 h-3 rounded-sm bg-success/30" />
                <div className="w-3 h-3 rounded-sm bg-success/60" />
                <div className="w-3 h-3 rounded-sm bg-success" />
                <span>Mais</span>
              </div>
            </div>
          </>
        )}

        <div className="bento-card p-4">
          <p className="text-xs text-muted-foreground">
            Criado em {new Date(entity.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

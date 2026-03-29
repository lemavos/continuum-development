import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import { metricsApi, trackingApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import {
  StickyNote,
  Network,
  Flame,
  CheckCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import type { Plan } from "@/types";
import { PLAN_LIMITS } from "@/types";

interface DashboardMetrics {
  totalNotes?: number;
  totalEntities?: number;
  totalHabits?: number;
  notesThisWeek?: number;
  currentStreak?: number;
  completedToday?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const { usage } = usePlanGate();

  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    metricsApi.dashboard().then((r) => setMetrics(r.data || {})).catch(() => {});
    trackingApi.today().then((r) => setTodayEvents(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const bentoItems: BentoItem[] = [
    {
      title: "Notas",
      meta: `${metrics.totalNotes ?? "—"} notas`,
      description: "Gerencie suas notas, ideias e journaling com busca inteligente",
      icon: <StickyNote className="w-4 h-4 text-info" />,
      status: metrics.notesThisWeek ? `+${metrics.notesThisWeek} esta semana` : "Journal",
      tags: ["Escrita", "Ideias"],
      colSpan: 2,
      hasPersistentHover: true,
      onClick: () => navigate("/notes"),
    },
    {
      title: "Hábitos do Dia",
      meta: `${todayEvents.length} feitos`,
      description: "Acompanhe seus hábitos diários e mantenha sua sequência",
      icon: <CheckCircle className="w-4 h-4 text-success" />,
      status: "Hoje",
      tags: ["Streaks", "Diário"],
      onClick: () => navigate("/entities?type=HABIT"),
    },
    {
      title: "Entidades",
      meta: `${metrics.totalEntities ?? "—"} total`,
      description: "Pessoas, projetos, tópicos e organizações conectados",
      icon: <Network className="w-4 h-4 text-info" />,
      tags: ["Grafo", "Conexões"],
      colSpan: 2,
      onClick: () => navigate("/entities"),
    },
    {
      title: "Streak Atual",
      meta: `${metrics.currentStreak ?? 0} dias`,
      description: "Sua sequência de produtividade contínua",
      icon: <Flame className="w-4 h-4 text-warning" />,
      status: "Em andamento",
      tags: ["Foco"],
      onClick: () => navigate("/entities?type=HABIT"),
    },
  ];

  const usageBar = (current: number, max: number, label: string) => {
    const isUnlimited = max === -1;
    const pct = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
    const isNearLimit = !isUnlimited && pct >= 80;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={isNearLimit ? "text-warning font-medium" : "text-muted-foreground"}>
            {isUnlimited ? `${current} / ∞` : `${current} / ${max}`}
          </span>
        </div>
        <Progress value={isUnlimited ? 100 : pct} className="h-1.5" />
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Olá, {user?.username || "Usuário"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Aqui está o resumo da sua atividade
          </p>
        </div>

        <BentoGrid items={bentoItems} />

        {/* Plan Usage */}
        {usage && (
          <div className="bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Uso do Plano {plan}</h2>
              <button
                onClick={() => navigate("/subscription")}
                className="text-xs text-info hover:underline"
              >
                Gerenciar plano →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {usageBar(usage.notesCount, limits.maxNotes, "Notas")}
              {usageBar(usage.entitiesCount, limits.maxEntities, "Entidades")}
              {usageBar(usage.habitsCount, limits.maxHabits, "Hábitos")}
              {usageBar(usage.vaultSizeMB, limits.maxVaultSizeMB, "Vault (MB)")}
            </div>
          </div>
        )}

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bento-card p-4 text-center">
            <TrendingUp className="w-5 h-5 text-info mx-auto mb-2" />
            <p className="text-2xl font-semibold text-foreground">{metrics.totalNotes ?? 0}</p>
            <p className="text-xs text-muted-foreground">Notas</p>
          </div>
          <div className="bento-card p-4 text-center">
            <Network className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-semibold text-foreground">{metrics.totalEntities ?? 0}</p>
            <p className="text-xs text-muted-foreground">Entidades</p>
          </div>
          <div className="bento-card p-4 text-center">
            <Calendar className="w-5 h-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-semibold text-foreground">{todayEvents.length}</p>
            <p className="text-xs text-muted-foreground">Feitos hoje</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

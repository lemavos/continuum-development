import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi, entitiesApi, trackingApi, graphApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, HardDrive, FileText, Plus, Share2, Activity, FolderOpen, CheckCircle2
} from "lucide-react";
import type { Plan, DashboardSummaryDTO, Entity } from "@/types";
import { PLAN_LIMITS } from "@/types";

// ==========================================
// SKELETON
// ==========================================
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div className="h-8 w-64 bg-zinc-900 rounded-md animate-pulse"></div>
        <div className="h-10 w-32 bg-zinc-900 rounded-md animate-pulse"></div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 h-[380px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
        <div className="col-span-12 lg:col-span-4 h-[380px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
        <div className="col-span-12 lg:col-span-7 h-[280px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
        <div className="col-span-12 lg:col-span-5 h-[280px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
      </div>
    </div>
  </AppLayout>
);

// ==========================================
// DASHBOARD PRINCIPAL
// ==========================================
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { usage, applyUsageDelta } = usePlanGate();
  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  // Fetch summary
  useEffect(() => {
    dashboardApi.summary()
      .then((r) => setSummary(r.data))
      .catch((err) => console.error("Erro ao buscar summary:", err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch habits
  const { data: habits } = useQuery({
    queryKey: ["entities", "HABIT"],
    queryFn: async () => {
      const response = await entitiesApi.list();
      return response.data.filter((entity: Entity) => entity.type === "HABIT");
    },
  });

  // Fetch today's tracking
  const { data: todayTracking } = useQuery({
    queryKey: ["tracking", "today"],
    queryFn: () => trackingApi.today().then(r => r.data),
  });

  // Fetch graph data for preview
  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then(r => r.data),
  });

  useEffect(() => {
    if (!summary?.storageUsage || usage == null) return;
    const storageMB = Number((summary.storageUsage.usedBytes / (1024 * 1024)).toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [summary?.storageUsage, usage, applyUsageDelta]);

  // Get pending habits today
  const getPendingHabits = () => {
    if (!habits || !todayTracking) return [];
    const today = new Date().toISOString().split('T')[0];
    return habits.filter((habit: Entity) => {
      const tracked = todayTracking.find((t: any) => t.entityId === habit.id && t.date === today);
      return !tracked;
    });
  };

  const pendingHabits = getPendingHabits();

  if (loading) return <DashboardSkeleton />;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-500">Visão geral do seu cofre.</p>
          </div>
          <button 
            onClick={() => navigate("/notes")}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Nota
          </button>
        </header>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-12 gap-6">

          {/* 1. PREVIEW DO GRAFO */}
          <div className="col-span-12 lg:col-span-8 bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-4 z-10">
              <h2 className="text-white font-medium flex items-center gap-2">
                <Share2 className="w-4 h-4 text-zinc-400" /> Knowledge Graph
              </h2>
              <span className="text-xs text-zinc-500">{graphData?.nodes?.length || summary?.stats?.totalNotes || 0} nós ativos</span>
            </div>
            
            {/* Placeholder para o grafo - pode ser substituído por ForceGraph2D */}
            <div className="flex-1 min-h-[280px] bg-zinc-950/50 rounded-xl border border-white/5 flex items-center justify-center cursor-pointer hover:bg-zinc-950/70 transition-colors" onClick={() => navigate("/graph")}>
               <div className="text-center">
                 <Share2 className="w-8 h-8 text-zinc-700 mx-auto mb-2 opacity-50" />
                 <p className="text-sm text-zinc-500">Clique para explorar o grafo de conhecimento</p>
               </div>
            </div>
          </div>

          {/* 2. LIMITES DO PLANO E STORAGE */}
          <div className="col-span-12 lg:col-span-4 bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-400" /> System Usage
                </h2>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400 tracking-widest uppercase">
                  {plan}
                </span>
              </div>

              {usage ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Notas</span>
                      <span className="text-zinc-200">{usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}</span>
                    </div>
                    <Progress value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1.5 bg-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Entidades</span>
                      <span className="text-zinc-200">{usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}</span>
                    </div>
                    <Progress value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1.5 bg-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Hábitos</span>
                      <span className="text-zinc-200">{usage.habitsCount} / {limits.maxHabits === -1 ? "∞" : limits.maxHabits}</span>
                    </div>
                    <Progress value={limits.maxHabits === -1 ? 0 : Math.min((usage.habitsCount / limits.maxHabits) * 100, 100)} className="h-1.5 bg-zinc-800" />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Carregando limites...</div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                    <HardDrive className="w-3 h-3" /> Storage Vault
                  </div>
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {summary?.storageUsage?.formattedUsed || "0 MB"}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  / {summary?.storageUsage?.formattedLimit || "∞"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. HÁBITOS PENDENTES */}
          <div className="col-span-12 lg:col-span-7 bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h2 className="text-white font-medium">Para Hoje</h2>
              </div>
              {pendingHabits.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 bg-orange-500/10 text-orange-500 rounded uppercase tracking-widest">
                  {pendingHabits.length} Pendentes
                </span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {pendingHabits.length > 0 ? (
                pendingHabits.map((habit: Entity) => (
                  <div 
                    key={habit.id} 
                    className="flex justify-between items-center p-3 bg-zinc-950/50 rounded-lg border border-transparent hover:border-white/5 transition-all group"
                  >
                    <span className="text-sm text-zinc-200 group-hover:text-white transition-colors">{habit.title}</span>
                    <button 
                      onClick={() => navigate(`/entities/${habit.id}`)}
                      className="w-5 h-5 rounded-full border border-zinc-600 flex items-center justify-center group-hover:border-orange-500 transition-colors"
                      title="Fazer check-in"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-orange-500 transition-colors" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3 opacity-80" />
                  <p className="text-sm text-zinc-300 font-medium">Tudo limpo por hoje!</p>
                  <p className="text-xs text-zinc-500 mt-1">Nenhum hábito pendente.</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. NOTAS RECENTES */}
          <div className="col-span-12 lg:col-span-5 bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-zinc-400" /> Notas Recentes
              </h2>
              <button onClick={() => navigate("/notes")} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition-colors">
                Ver Todas
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              {summary?.recentNotes && summary.recentNotes.length > 0 ? (
                summary.recentNotes.slice(0, 4).map((note: any) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group flex flex-col p-3 bg-zinc-950/50 rounded-lg border border-transparent hover:border-white/10 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-zinc-200 truncate pr-4 group-hover:text-purple-400 transition-colors">
                        {note.title}
                      </span>
                      <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                        {new Date(note.updatedAtTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {note.preview && (
                      <span className="text-xs text-zinc-500 truncate">{note.preview}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <FileText className="w-6 h-6 text-zinc-800 mb-2" />
                  <p className="text-xs text-zinc-500">Nenhuma nota recente.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

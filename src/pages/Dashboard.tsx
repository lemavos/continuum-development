import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import {
  Flame,
  HardDrive,
  FileText,
  BarChart3,
  Plus,
  ArrowRight,
  FolderOpen,
  Activity
} from "lucide-react";
import type { Plan, DashboardSummaryDTO } from "@/types";
import { PLAN_LIMITS } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const { usage, applyUsageDelta } = usePlanGate();

  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    dashboardApi.summary()
      .then((r) => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!summary?.storageUsage || usage == null) return;

    const storageMB = Number((summary.storageUsage.usedBytes / (1024 * 1024)).toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [summary?.storageUsage, usage, applyUsageDelta]);

  const formatDate = (value: string | number) => {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-zinc-900 border border-zinc-800/50";
    if (count === 1) return "bg-purple-900/50 border border-purple-800/50";
    if (count === 2) return "bg-purple-700/70 border border-purple-600/50";
    if (count === 3) return "bg-purple-500 border border-purple-400";
    return "bg-purple-400 border border-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]";
  };

  const generateHeatmap = () => {
    if (!summary?.habitActivity.dailyCompletions) return null;

    const today = new Date();
    const weeks: { date: string; count: number }[][] = [];
    const days = [];

    for (let i = 34; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = summary.habitActivity.dailyCompletions[dateStr] || 0;
      days.push({ date: dateStr, count, dow: date.getDay() });
    }

    for (let w = 0; w < 5; w++) {
      weeks[w] = [];
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d;
        if (idx < days.length) {
          weeks[w].push(days[idx]);
        }
      }
    }

    return (
      <div className="flex items-end gap-3 mt-2">
        <div className="flex gap-1.5">
          {weeks.map((week, w) => (
            <div key={w} className="flex flex-col gap-1.5">
              {week.map((day, d) => (
                <div
                  key={`${w}-${d}`}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[3px] cursor-pointer transition-all duration-200 hover:scale-110 ${getHeatmapColor(day.count)}`}
                  title={`${day.date}: ${day.count} completions`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex-1 ml-4 space-y-2 hidden md:block">
           <div className="text-xs text-muted-foreground flex items-center gap-2">
             <Activity className="w-3 h-3" /> Contribuições
           </div>
           <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
             <span>Menos</span>
             {[0, 1, 2, 3, 4].map((i) => (
               <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${getHeatmapColor(i)}`} />
             ))}
             <span>Mais</span>
           </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
          <div className="h-10 bg-zinc-900 rounded w-64 animate-pulse mb-8"></div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4 h-40 bg-zinc-900 rounded-xl animate-pulse"></div>
            <div className="col-span-12 md:col-span-8 h-40 bg-zinc-900 rounded-xl animate-pulse"></div>
            <div className="col-span-12 md:col-span-7 h-64 bg-zinc-900 rounded-xl animate-pulse"></div>
            <div className="col-span-12 md:col-span-5 h-64 bg-zinc-900 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* Header Compacto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
              Overview
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Bem-vindo de volta, {user?.username || "User"}. Aqui está o seu resumo.
            </p>
          </div>
          <button 
            onClick={() => navigate("/notes")}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors w-fit"
          >
            <Plus className="w-4 h-4" /> Nova Nota
          </button>
        </div>

        {/* BENTO GRID - 12 COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

          {/* 1. Storage & Welcome (Ocupa 4 colunas) */}
          <div className="col-span-12 md:col-span-4 flex flex-col justify-between p-6 rounded-xl border border-white/5 bg-[#0a0a0a] hover:border-white/10 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
              <HardDrive className="w-24 h-24 text-zinc-500 translate-x-4 -translate-y-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <HardDrive className="w-4 h-4" /> Storage
              </div>
              <h2 className="text-2xl font-semibold text-white mb-6">
                {summary?.storageUsage?.formattedUsed || "0 MB"}
                <span className="text-sm text-zinc-500 font-normal ml-1">/ {summary?.storageUsage?.formattedLimit || "∞"}</span>
              </h2>
            </div>
            
            {summary?.storageUsage && (
              <div className="space-y-2 relative z-10">
                <Progress value={summary.storageUsage.percentageUsed} className="h-1.5 bg-zinc-800" />
                <p className="text-xs text-zinc-500">
                  {summary.storageUsage.isUnlimited ? "Unlimited storage plan" : `${summary.storageUsage.percentageUsed.toFixed(1)}% utilizado do cofre`}
                </p>
              </div>
            )}
          </div>

          {/* 2. Heatmap de Hábitos (Ocupa 8 colunas) */}
          <div className="col-span-12 md:col-span-8 p-6 rounded-xl border border-white/5 bg-[#0a0a0a] hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-medium text-white">Habit Activity</h3>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-md border border-orange-500/20">
                  {summary?.habitActivity?.currentStreak || 0} dias seguidos
                </span>
              </div>
            </div>
            
            {summary?.habitActivity ? generateHeatmap() : (
               <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-4">
                 <p className="text-sm">Nenhum hábito rastreado ainda.</p>
               </div>
            )}
          </div>

          {/* 3. Notas Recentes (Ocupa 7 colunas) */}
          <div className="col-span-12 md:col-span-7 p-6 rounded-xl border border-white/5 bg-[#0a0a0a] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-white">Notas Recentes</h3>
              </div>
              <button onClick={() => navigate("/notes")} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              {summary?.recentNotes && summary.recentNotes.length > 0 ? (
                summary.recentNotes.slice(0, 4).map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-zinc-900 border border-white/5 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{note.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{note.preview}</p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap pl-4">
                      {formatDate(note.updatedAtTimestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-lg py-8">
                  <FileText className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-sm text-zinc-400">O cofre está vazio</p>
                  <button onClick={() => navigate("/notes")} className="text-xs text-purple-400 mt-2 hover:underline">
                    Criar primeira nota
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Quick Stats (Ocupa 5 colunas) */}
          <div className="col-span-12 md:col-span-5 p-6 rounded-xl border border-white/5 bg-[#0a0a0a]">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-white">Visão Geral</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                <span className="text-xs text-zinc-500 block mb-1">Total de Notas</span>
                <span className="text-2xl font-semibold text-white">{summary?.stats?.totalNotes || 0}</span>
              </div>
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                <span className="text-xs text-zinc-500 block mb-1">Entidades</span>
                <span className="text-2xl font-semibold text-white">{summary?.stats?.totalEntities || 0}</span>
              </div>
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                <span className="text-xs text-zinc-500 block mb-1">Hábitos Ativos</span>
                <span className="text-2xl font-semibold text-orange-400">{summary?.stats?.activeHabits || 0}</span>
              </div>
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                <span className="text-xs text-zinc-500 block mb-1">Total de Hábitos</span>
                <span className="text-2xl font-semibold text-zinc-300">{summary?.stats?.totalHabits || 0}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 5. Plan Usage Strip (Rodapé compacto, ocupa as 12 colunas) */}
        {usage && (
          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-max">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 tracking-wider">
                {plan}
              </span>
              <span className="text-sm text-zinc-400">Limites do plano</span>
            </div>
            
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
              {/* Notas */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                  <span>Notas</span>
                  <span>{usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}</span>
                </div>
                <Progress value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1 bg-zinc-800" />
              </div>
              {/* Entidades */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                  <span>Entidades</span>
                  <span>{usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}</span>
                </div>
                <Progress value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1 bg-zinc-800" />
              </div>
              {/* Hábitos */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                  <span>Hábitos</span>
                  <span>{usage.habitsCount} / {limits.maxHabits === -1 ? "∞" : limits.maxHabits}</span>
                </div>
                <Progress value={limits.maxHabits === -1 ? 0 : Math.min((usage.habitsCount / limits.maxHabits) * 100, 100)} className="h-1 bg-zinc-800" />
              </div>
              {/* Storage */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                  <span>Storage MB</span>
                  <span>{usage.vaultSizeMB} / {limits.maxVaultSizeMB}</span>
                </div>
                <Progress value={Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)} className="h-1 bg-zinc-800" />
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
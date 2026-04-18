import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, HardDrive, FileText, Plus, Share2, Activity, FolderOpen, CheckCircle2, ChevronRight 
} from "lucide-react";
import { PLAN_LIMITS } from "@/types";

// ==========================================
// SKELETON (Para não dar flash de tela branca)
// ==========================================
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 animate-pulse">
      <div className="flex justify-between items-center"><div className="h-10 w-48 bg-zinc-900 rounded-lg" /><div className="h-10 w-32 bg-zinc-900 rounded-lg" /></div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 h-80 bg-zinc-900 rounded-2xl" />
        <div className="col-span-12 lg:col-span-4 h-80 bg-zinc-900 rounded-2xl" />
        <div className="col-span-12 lg:col-span-7 h-64 bg-zinc-900 rounded-2xl" />
        <div className="col-span-12 lg:col-span-5 h-64 bg-zinc-900 rounded-2xl" />
      </div>
    </div>
  </AppLayout>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // SEUS LIMITES REAIS (Vêm do seu Hook)
  const { usage } = usePlanGate();
  const plan = (user?.plan as keyof typeof PLAN_LIMITS) || "FREE";
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    dashboardApi.summary()
      .then(r => setSummary(r.data))
      .catch(err => console.error("Erro na API:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER LIMPO */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Intelligence Command</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Vault Protocol v1.0</p>
          </div>
          <button 
            onClick={() => navigate("/notes")}
            className="group flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-purple-50 transition-all"
          >
            <Plus className="w-4 h-4" /> Nova Nota
          </button>
        </header>

        <div className="grid grid-cols-12 gap-6">

          {/* 1. PREVIEW DO GRAFO (ÁREA NOBRE) */}
          <div 
            onClick={() => navigate("/graph")}
            className="col-span-12 lg:col-span-8 bg-[#09090b] border border-white/5 rounded-3xl p-8 relative overflow-hidden group cursor-pointer hover:border-purple-500/40 transition-all"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 blur-[120px] -z-10 group-hover:bg-purple-600/20 transition-all" />
            
            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-purple-500" /> Knowledge Graph
                </h2>
                <p className="text-zinc-500 text-sm mt-1">Sua rede neural de notas e conexões.</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white">{summary?.stats?.totalNotes || 0}</span>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Nós Ativos</p>
              </div>
            </div>

            {/* Visual Teaser do Grafo (Não pesa nada) */}
            <div className="relative h-40 flex items-center justify-center">
               <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="w-64 h-64 border border-dashed border-zinc-700 rounded-full animate-[spin_20s_linear_infinite]" />
                  <div className="absolute w-48 h-48 border border-dashed border-zinc-800 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
               </div>
               <BrainIcon className="w-16 h-16 text-purple-500/50 group-hover:text-purple-400 group-hover:scale-110 transition-all duration-500" />
               <div className="absolute bottom-0 right-0 flex items-center gap-2 text-xs font-bold text-purple-400 opacity-0 group-hover:opacity-100 transition-all">
                  EXPLORAR CONEXÕES <ChevronRight className="w-4 h-4" />
               </div>
            </div>
          </div>

          {/* 2. LIMITES DO PLANO (LENDO DO SEU HOOK) */}
          <div className="col-span-12 lg:col-span-4 bg-zinc-950 border border-white/5 rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-zinc-500" /> Recursos
                </h2>
                <span className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-[10px] font-black text-zinc-400">
                  {plan} PLAN
                </span>
              </div>

              <div className="space-y-6">
                <LimitBar label="Notas" current={usage?.notesCount} max={limits.maxNotes} />
                <LimitBar label="Entidades" current={usage?.entitiesCount} max={limits.maxEntities} />
                <LimitBar label="Hábitos" current={usage?.habitsCount} max={limits.maxHabits} />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Storage Vault</p>
                  <p className="text-2xl font-bold text-white tracking-tighter">{summary?.storageUsage?.formattedUsed || "0 MB"}</p>
                </div>
                <p className="text-[10px] text-zinc-600 mb-1">/{summary?.storageUsage?.formattedLimit}</p>
              </div>
            </div>
          </div>

          {/* 3. HABITS NÃO CONCLUÍDOS */}
          <div className="col-span-12 lg:col-span-7 bg-zinc-950 border border-white/5 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" /> Foco de Hoje
              </h2>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pendentes</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {summary?.habitActivity?.pendingHabits?.length > 0 ? (
                summary.habitActivity.pendingHabits.map((habit: any) => (
                  <div key={habit.id} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group">
                    <span className="text-sm font-medium text-zinc-300">{habit.name}</span>
                    <button 
                      onClick={() => navigate(`/entities?id=${habit.id}`)}
                      className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-orange-500/50 transition-all"
                    >
                      <Plus className="w-4 h-4 text-zinc-500 group-hover:text-orange-500" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
                  <p className="text-sm text-zinc-500">Nenhum hábito pendente.</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. NOTAS RECENTES */}
          <div className="col-span-12 lg:col-span-5 bg-zinc-950 border border-white/5 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-bold flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-zinc-500" /> Recentes
              </h2>
              <button onClick={() => navigate("/notes")} className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">VER TUDO</button>
            </div>
            <div className="space-y-4">
              {summary?.recentNotes?.slice(0, 4).map((note: any) => (
                <div 
                  key={note.id} 
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className="group cursor-pointer flex justify-between items-center pb-4 border-b border-white/5 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-300 group-hover:text-purple-400 transition-colors truncate max-w-[200px]">{note.title}</p>
                    <p className="text-[10px] text-zinc-600">{new Date(note.updatedAtTimestamp).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-zinc-400 transition-all" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

// Sub-componentes auxiliares para limpar o código principal
function LimitBar({ label, current, max }: { label: string, current: number, max: number }) {
  const percentage = max === -1 ? 0 : Math.min((current / max) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <span className="text-zinc-300">{current} / {max === -1 ? "∞" : max}</span>
      </div>
      <Progress value={percentage} className="h-1 bg-zinc-900" />
    </div>
  );
}

function BrainIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .52 8.208 4 4 0 0 0 6.974 2.602 4 4 0 0 0 7.072-2.602 4 4 0 0 0 .52-8.208 4 4 0 0 0-2.526-5.77A3 3 0 1 0 12 5z" />
      <path d="M12 13V5" /><path d="M12 18v-2" /><path d="M12 8v1" />
    </svg>
  );
}
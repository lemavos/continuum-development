import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, HardDrive, FileText, Plus, Share2, Activity, FolderOpen, CheckCircle2, Circle
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary()
      .then(r => setSummary(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-zinc-500">Sincronizando Continuum...</div>;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">System Dashboard</h1>
          <button onClick={() => navigate("/notes")} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-200">
            + Nova Nota
          </button>
        </header>

        <div className="grid grid-cols-12 gap-6">

          {/* 1. PREVIEW DO GRAFO (Clicável para /graph) */}
          <div 
            onClick={() => navigate("/graph")}
            className="col-span-12 lg:col-span-8 bg-zinc-950 border border-white/5 rounded-2xl p-6 cursor-pointer hover:border-purple-500/30 transition-all group overflow-hidden relative min-h-[350px]"
          >
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h2 className="text-white font-medium flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" /> Neural Network Preview
              </h2>
              <span className="text-[10px] text-zinc-500 uppercase font-bold group-hover:text-purple-400">Abrir Mapa Completo →</span>
            </div>

            {/* Visual Minimalista do Grafo (Gerado via dados) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
              <svg width="100%" height="100%" className="absolute inset-0">
                {/* Linhas de conexão simplificadas */}
                {summary?.graphPreview?.links?.slice(0, 15).map((link: any, i: number) => (
                  <line key={i} x1={`${30 + (i * 5) % 40}%`} y1={`${20 + (i * 7) % 60}%`} x2={`${50 + (i * 3) % 30}%`} y2={`${40 + (i * 2) % 50}%`} stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
                ))}
              </svg>
              <div className="relative w-full h-full">
                {summary?.graphPreview?.nodes?.slice(0, 12).map((node: any, i: number) => (
                  <div 
                    key={node.id}
                    className="absolute p-2 bg-zinc-900 border border-white/10 rounded-lg text-[10px] text-zinc-400 whitespace-nowrap"
                    style={{ 
                      left: `${20 + (i * 13) % 60}%`, 
                      top: `${15 + (i * 17) % 70}%`,
                      transform: `scale(${1 - (i * 0.02)})`
                    }}
                  >
                    {node.label}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute bottom-6 left-6 text-xs text-zinc-600 italic">
              Explore {summary?.stats?.totalNotes} conexões no seu cérebro digital.
            </div>
          </div>

          {/* 2. LIMITES DO PLANO */}
          <div className="col-span-12 lg:col-span-4 bg-zinc-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-zinc-400" /> Recursos do Sistema
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500">
                  <span>Notas</span>
                  <span>{summary?.stats?.totalNotes || 0} / 500</span>
                </div>
                <Progress value={(summary?.stats?.totalNotes / 500) * 100} className="h-1 bg-zinc-900" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500">
                  <span>Vault Storage</span>
                  <span>{summary?.storageUsage?.formattedUsed}</span>
                </div>
                <Progress value={summary?.storageUsage?.percentageUsed} className="h-1 bg-zinc-900" />
              </div>
            </div>
            <div className="mt-8 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
               <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">Dica do Continuum</p>
               <p className="text-xs text-zinc-400 leading-relaxed">Conecte notas para gerar novos insights automáticos.</p>
            </div>
          </div>

          {/* 3. HABITS NÃO CONCLUÍDOS (O que você pediu!) */}
          <div className="col-span-12 lg:col-span-7 bg-zinc-950 border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h2 className="text-white font-medium">Hábitos Pendentes Hoje</h2>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Ação Necessária</span>
            </div>

            <div className="space-y-3">
              {summary?.habitActivity?.pendingHabits?.length > 0 ? (
                summary.habitActivity.pendingHabits.map((habit: any) => (
                  <div 
                    key={habit.id} 
                    onClick={() => navigate(`/entities?id=${habit.id}`)}
                    className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all">
                        <Flame className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-zinc-300">{habit.name}</span>
                    </div>
                    <Circle className="w-5 h-5 text-zinc-700 group-hover:text-orange-500 transition-colors" />
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-zinc-500">Tudo em dia! Você concluiu todos os hábitos de hoje.</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. NOTAS RECENTES */}
          <div className="col-span-12 lg:col-span-5 bg-zinc-950 border border-white/5 rounded-2xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6">
              <FolderOpen className="w-4 h-4 text-zinc-400" /> Entradas Recentes
            </h2>
            <div className="space-y-4">
              {summary?.recentNotes?.slice(0, 5).map((note: any) => (
                <div 
                  key={note.id} 
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className="flex flex-col gap-1 cursor-pointer group border-b border-white/5 pb-3 last:border-0"
                >
                  <span className="text-sm text-zinc-300 group-hover:text-purple-400 transition-colors truncate">{note.title}</span>
                  <span className="text-[10px] text-zinc-600 uppercase">{new Date(note.updatedAtTimestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
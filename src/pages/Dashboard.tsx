import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line 
} from "recharts";
import { 
  Flame, HardDrive, FileText, BarChart3, Plus, CheckCircle2, Circle, 
  ArrowUpRight, Target, Zap
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary()
      .then((r) => setSummary(r.data))
      .finally(() => setLoading(false));
  }, []);

  // LÓGICA FRONT-END: Transforma o mapa de datas em uma lista de "Últimos 7 dias"
  const getLast7DaysStatus = () => {
    const status = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      // Verifica se houve alguma completude global naquela data no mapa do back
      status.push(!!summary?.habitActivity?.dailyCompletions?.[str]);
    }
    return status;
  };

  // Mock de histórico para o gráfico (já que o back não manda, simulamos p/ UX)
  const chartData = [
    { name: "Seg", notes: 4 }, { name: "Ter", notes: 7 }, { name: "Qua", notes: 5 },
    { name: "Qui", notes: 8 }, { name: "Sex", notes: 12 }, { name: "Sab", notes: 9 }, { name: "Dom", notes: 6 }
  ];

  if (loading) return <div className="p-20 text-center text-white">Carregando interface de elite...</div>;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER COM QUICK ACTIONS */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Continuum <span className="text-purple-500">Command</span></h1>
            <p className="text-zinc-500 text-sm italic">"O que não é medido não é gerenciado."</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/notes")} className="p-2.5 bg-zinc-900 border border-white/10 rounded-lg hover:bg-zinc-800 transition-all">
              <Plus className="w-5 h-5 text-white" />
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
              PRO UPGRADE
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          
          {/* CARD PRINCIPAL: HABIT TRACKER VISUAL */}
          <div className="col-span-12 md:col-span-8 bg-[#09090b] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[100px] -z-10" />
            
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" /> 
                  Consistência Semanal
                </h2>
                <p className="text-zinc-500 text-sm">Baseado em todas as suas atividades registradas.</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-white">{summary?.habitActivity?.currentStreak || 0}</span>
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Day Streak</p>
              </div>
            </div>

            {/* A MÁGICA: Transformamos o dado chato em algo visual */}
            <div className="grid grid-cols-7 gap-4">
              {getLast7DaysStatus().map((done, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className={`w-full aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                    done 
                    ? "bg-purple-600/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]" 
                    : "bg-zinc-900/50 border-zinc-800"
                  }`}>
                    {done ? (
                      <CheckCircle2 className="w-8 h-8 text-purple-400" />
                    ) : (
                      <Circle className="w-8 h-8 text-zinc-700" />
                    )}
                  </div>
                  <span className={`text-xs font-bold ${done ? "text-purple-400" : "text-zinc-600"}`}>
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CARD LATERAL: STORAGE RADIAL (SIMULADO) */}
          <div className="col-span-12 md:col-span-4 bg-zinc-950 border border-white/5 rounded-3xl p-8 flex flex-col justify-between hover:border-purple-500/30 transition-all">
            <div className="space-y-1">
              <h3 className="text-zinc-400 text-sm font-medium flex items-center gap-2">
                <HardDrive className="w-4 h-4" /> Vault Capacity
              </h3>
              <p className="text-2xl font-bold text-white tracking-tighter">
                {summary?.storageUsage?.formattedUsed || "0 MB"}
              </p>
            </div>

            <div className="py-6">
               <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className="text-zinc-800" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className="text-purple-500" strokeDasharray={`${summary?.storageUsage?.percentageUsed || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">
                    {Math.round(summary?.storageUsage?.percentageUsed || 0)}%
                  </div>
               </div>
            </div>

            <button className="w-full py-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 text-xs font-bold hover:text-white transition-all">
              CLEAN VAULT
            </button>
          </div>

          {/* GRÁFICO DE ENGAJAMENTO (Notas por dia) */}
          <div className="col-span-12 md:col-span-7 bg-zinc-950 border border-white/5 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-white font-bold flex items-center gap-2">
                 <BarChart3 className="w-5 h-5 text-zinc-500" /> Velocity
               </h3>
               <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded-full font-bold">+24% vs last week</span>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Tooltip cursor={{fill: 'transparent'}} content={({active, payload}) => {
                    if (active) return <div className="bg-white text-black p-2 rounded-md font-bold text-xs">{payload?.[0].value} notas</div>;
                    return null;
                  }} />
                  <Bar dataKey="notes" radius={[6, 6, 6, 6]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={index === 4 ? "#a855f7" : "#18181b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QUICK STATS - GRID PEQUENO */}
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-4">
             {[
               { label: "Total Notes", val: summary?.stats?.totalNotes, icon: <FileText/>, color: "text-blue-500" },
               { label: "Entities", val: summary?.stats?.totalEntities, icon: <Target/>, color: "text-emerald-500" },
               { label: "Habits", val: summary?.stats?.totalHabits, icon: <Flame/>, color: "text-orange-500" },
               { label: "Uptime", val: "99.9%", icon: <ArrowUpRight/>, color: "text-zinc-500" },
             ].map((s, i) => (
               <div key={i} className="bg-zinc-950 border border-white/5 rounded-3xl p-6 hover:bg-zinc-900 transition-colors cursor-default">
                  <div className={`w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center mb-4 ${s.color}`}>
                    {s.icon}
                  </div>
                  <p className="text-zinc-500 text-xs font-medium">{s.label}</p>
                  <p className="text-2xl font-bold text-white tracking-tighter">{s.val || 0}</p>
               </div>
             ))}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
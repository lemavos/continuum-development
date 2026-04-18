import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi, entitiesApi, trackingApi, graphApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, HardDrive, FileText, Plus, Share2, Activity, FolderOpen, CheckCircle2, ChevronRight
} from "lucide-react";
import type { Plan, DashboardSummaryDTO, Entity } from "@/types";
import { PLAN_LIMITS } from "@/types";
import { ForceGraph2D } from "react-force-graph-2d";

// ==========================================
// SKELETON
// ==========================================
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div className="h-10 w-64 bg-zinc-900 rounded-lg animate-pulse"></div>
        <div className="h-10 w-32 bg-zinc-900 rounded-lg animate-pulse"></div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 h-[400px] bg-zinc-900/50 border border-white/5 rounded-3xl animate-pulse"></div>
        <div className="col-span-12 lg:col-span-4 h-[400px] bg-zinc-900/50 border border-white/5 rounded-3xl animate-pulse"></div>
        <div className="col-span-12 lg:col-span-7 h-[300px] bg-zinc-900/50 border border-white/5 rounded-3xl animate-pulse"></div>
        <div className="col-span-12 lg:col-span-5 h-[300px] bg-zinc-900/50 border border-white/5 rounded-3xl animate-pulse"></div>
      </div>
    </div>
  </AppLayout>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(500);
  
  const { usage, applyUsageDelta } = usePlanGate();
  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  // Fetch initial summary
  useEffect(() => {
    dashboardApi.summary()
      .then((r) => setSummary(r.data))
      .catch((err) => console.error("Error fetching summary:", err))
      .finally(() => setLoading(false));
  }, []);

  // Update container width for the graph
  useEffect(() => {
    if (graphContainerRef.current) {
      setContainerWidth(graphContainerRef.current.clientWidth);
    }
  }, [loading]);

  // Sync Storage Usage (Fixed logic to avoid infinite loop)
  useEffect(() => {
    if (!summary?.storageUsage || !usage) return;
    const storageMB = Number((summary.storageUsage.usedBytes / (1024 * 1024)).toFixed(2));
    
    // Only update if there is a significant difference to prevent loops
    if (Math.abs(storageMB - usage.vaultSizeMB) > 0.01) {
      applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
    }
  }, [summary?.storageUsage?.usedBytes]); // Remove 'usage' from dependencies

  // Queries
  const { data: habits } = useQuery({
    queryKey: ["entities", "HABIT"],
    queryFn: async () => {
      const response = await entitiesApi.list();
      return response.data.filter((entity: Entity) => entity.type === "HABIT");
    },
  });

  const { data: todayTracking } = useQuery({
    queryKey: ["tracking", "today"],
    queryFn: () => trackingApi.today().then(r => r.data),
  });

  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then(r => r.data),
  });

  // Memoized Data Processing
  const pendingHabits = useMemo(() => {
    if (!habits || !todayTracking) return [];
    const today = new Date().toISOString().split('T')[0];
    return habits.filter((habit: Entity) => {
      return !todayTracking.find((t: any) => t.entityId === habit.id && t.date === today);
    });
  }, [habits, todayTracking]);

  const graphPreviewData = useMemo(() => {
    if (!graphData?.nodes) return null;
    const limitedNodes = graphData.nodes.slice(0, 40);
    const nodeIds = new Set(limitedNodes.map(n => n.id));
    const rawLinks = graphData.links || graphData.edges || [];
    const limitedLinks = rawLinks.filter((l: any) => nodeIds.has(l.source) && nodeIds.has(l.target));

    return {
      nodes: limitedNodes.map((n: any) => ({ id: n.id, name: n.label, type: n.type, val: 2 })),
      links: limitedLinks.map((l: any) => ({ source: l.source, target: l.target }))
    };
  }, [graphData]);

  if (loading) return <DashboardSkeleton />;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Intelligence Command</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mt-1">Vault Protocol v1.0</p>
          </div>
          <button 
            onClick={() => navigate("/notes")}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all"
          >
            <Plus className="w-4 h-4" /> New Note
          </button>
        </header>

        <div className="grid grid-cols-12 gap-6">

          {/* 1. GRAPH PREVIEW */}
          <div className="col-span-12 lg:col-span-8 bg-[#09090b] border border-white/5 rounded-3xl p-6 flex flex-col relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-500" /> Knowledge Graph
              </h2>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {graphData?.nodes?.length || 0} Nodes Connected
              </span>
            </div>
            
            <div 
              ref={graphContainerRef}
              className="flex-1 min-h-[300px] bg-zinc-950/40 rounded-2xl border border-white/5 overflow-hidden cursor-pointer relative"
              onClick={() => navigate("/graph")}
            >
              {graphPreviewData ? (
                <ForceGraph2D
                  graphData={graphPreviewData}
                  width={containerWidth}
                  height={300}
                  backgroundColor="transparent"
                  nodeColor={(n: any) => ({
                    NOTE: "#ffffff", HABIT: "#22c55e", PERSON: "#eab308",
                    PROJECT: "#3b82f6", TOPIC: "#a855f7"
                  }[n.type] || "#64748b")}
                  linkColor={() => "rgba(255,255,255,0.08)"}
                  nodeRelSize={3.5}
                  enableNodeDrag={false}
                  enableZoomPanInteraction={false}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
                  Initialize Neural Engine...
                </div>
              )}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-bold text-purple-400">
                EXPAND VIEW <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* 2. PLAN & STORAGE */}
          <div className="col-span-12 lg:col-span-4 bg-zinc-950 border border-white/5 rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-zinc-500" /> Resources
                </h2>
                <span className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-[10px] font-black text-zinc-400 uppercase">
                  {plan}
                </span>
              </div>

              <div className="space-y-6">
                <UsageItem label="Notes" current={usage?.notesCount} max={limits.maxNotes} />
                <UsageItem label="Entities" current={usage?.entitiesCount} max={limits.maxEntities} />
                <UsageItem label="Habits" current={usage?.habitsCount} max={limits.maxHabits} />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Vault Storage</p>
                <p className="text-2xl font-bold text-white tracking-tighter">
                  {summary?.storageUsage?.formattedUsed || "0 MB"}
                </p>
              </div>
              <p className="text-[10px] text-zinc-600 font-medium mb-1">
                / {summary?.storageUsage?.formattedLimit || "∞"}
              </p>
            </div>
          </div>

          {/* 3. PENDING HABITS */}
          <div className="col-span-12 lg:col-span-7 bg-zinc-950 border border-white/5 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Today's Focus
              </h2>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {pendingHabits.length} Pending
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {pendingHabits.length > 0 ? (
                pendingHabits.map((habit: Entity) => (
                  <div key={habit.id} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group">
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{habit.title}</span>
                    <button 
                      onClick={() => navigate(`/entities/${habit.id}`)}
                      className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center hover:border-orange-500/50 transition-all"
                    >
                      <Plus className="w-4 h-4 text-zinc-500 group-hover:text-orange-500" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">All protocols completed.</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. RECENT NOTES */}
          <div className="col-span-12 lg:col-span-5 bg-zinc-950 border border-white/5 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-bold flex items-center gap-2 text-sm">
                <FolderOpen className="w-4 h-4 text-zinc-500" /> Recent Activity
              </h2>
              <button onClick={() => navigate("/notes")} className="text-[10px] font-bold text-zinc-600 hover:text-white transition-colors">VIEW ALL</button>
            </div>

            <div className="space-y-4">
              {summary?.recentNotes?.slice(0, 4).map((note: any) => (
                <div
                  key={note.id}
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className="group cursor-pointer flex justify-between items-center pb-4 border-b border-white/5 last:border-0 last:pb-0"
                >
                  <div className="space-y-1 truncate pr-4">
                    <p className="text-sm font-medium text-zinc-300 group-hover:text-purple-400 transition-colors truncate">
                      {note.title || "Untitled Note"}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono uppercase">
                      {new Date(note.updatedAtTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
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

function UsageItem({ label, current, max }: { label: string, current: number, max: number }) {
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
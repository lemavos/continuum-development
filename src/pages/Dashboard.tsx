import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi, entitiesApi, graphApi, notesApi, trackingApi, timeTrackingApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getPlanLimits } from "@/lib/plan";
import { Progress } from "@/components/ui/progress";
import { ChartContainer } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Share2,
  Activity,
  FolderOpen,
  ArrowRight,
  HardDrive,
} from "lucide-react";
import type { DashboardSummaryDTO, Entity } from "@/types";

const formatNoteDate = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map((value) => String(value).padStart(2, "0")).join(":");
};

const DashboardSkeleton = () => (
  <AppLayout>
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="h-11 rounded-3xl bg-zinc-900 animate-pulse" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7 h-[420px] rounded-3xl bg-zinc-900 animate-pulse" />
        <div className="col-span-12 xl:col-span-5 h-[420px] rounded-3xl bg-zinc-900 animate-pulse" />
        <div className="col-span-12 xl:col-span-7 h-[320px] rounded-3xl bg-zinc-900 animate-pulse" />
        <div className="col-span-12 xl:col-span-5 space-y-6">
          <div className="h-[160px] rounded-3xl bg-zinc-900 animate-pulse" />
          <div className="h-[260px] rounded-3xl bg-zinc-900 animate-pulse" />
        </div>
      </div>
    </div>
  </AppLayout>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { usage, applyUsageDelta } = usePlanGate();
  const limits = getPlanLimits(user);

  const [selectedTimer, setSelectedTimer] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", "list"],
    queryFn: () => notesApi.list().then((r) => r.data),
  });

  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then((r) => r.data),
  });

  const { data: activities } = useQuery({
    queryKey: ["entities", "activities"],
    queryFn: async () => {
      const response = await entitiesApi.list();
      return (response.data as Entity[]).filter((entity) => entity.type === "ACTIVITY");
    },
  });

  const { data: todayTracking } = useQuery({
    queryKey: ["tracking", "today"],
    queryFn: () => trackingApi.today().then((r) => r.data),
  });

  const { data: timerSummaries } = useQuery({
    queryKey: ["timeTracking", "summaries"],
    queryFn: () => timeTrackingApi.getAllSummaries().then((r) => r.data),
  });

  const { data: selectedTimerBreakdown } = useQuery({
    queryKey: ["timeTracking", "breakdown", selectedTimer],
    queryFn: () => selectedTimer ? timeTrackingApi.getDailyBreakdown(selectedTimer).then((r) => r.data) : Promise.resolve([]),
    enabled: Boolean(selectedTimer),
  });

  useEffect(() => {
    if (!selectedTimer && Array.isArray(timerSummaries) && timerSummaries.length > 0) {
      setSelectedTimer(timerSummaries[0].entityId);
    }
  }, [selectedTimer, timerSummaries]);

  useEffect(() => {
    if (!summary?.storageUsage || usage == null) return;
    const storageMB = Number((summary.storageUsage.usedBytes / (1024 * 1024)).toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [summary?.storageUsage, usage, applyUsageDelta]);

  const noteTimeline = useMemo(() => {
    if (!Array.isArray(notes)) return [];
    const counts: Record<string, number> = {};
    notes.forEach((note: any) => {
      if (!note.createdAt) return;
      const date = note.createdAt.split("T")[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const iso = date.toISOString().split("T")[0];
      return {
        date: iso,
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: counts[iso] || 0,
      };
    });
  }, [notes]);

  const recentNotes = useMemo(() => {
    if (summary?.recentNotes && summary.recentNotes.length > 0) {
      return summary.recentNotes.slice(0, 6);
    }
    if (!Array.isArray(notes)) return [];
    return [...notes]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((note: any) => ({
        id: note.id,
        title: note.title,
        createdAtTimestamp: new Date(note.createdAt).getTime(),
      }));
  }, [summary?.recentNotes, notes]);

  const todayActivities = useMemo(() => {
    if (!Array.isArray(activities) || !Array.isArray(todayTracking)) return [];
    return todayTracking
      .map((entry: any) => {
        const entity = activities.find((activity) => activity.id === entry.entityId);
        return {
          id: entry.entityId,
          title: entity?.title ?? entry.entityId,
          time: entry.durationSeconds ? formatTime(entry.durationSeconds) : entry.duration || "00:00",
        };
      })
      .slice(0, 6);
  }, [activities, todayTracking]);

  const timerChartData = useMemo(() => {
    if (!Array.isArray(selectedTimerBreakdown)) return [];
    return selectedTimerBreakdown.map((point: any) => ({
      name: point.date ? point.date.slice(5) : "",
      value: point.durationSeconds ?? point.duration ?? 0,
    }));
  }, [selectedTimerBreakdown]);

  const graphNodeCount = graphData?.nodes?.length ?? 0;
  const totalNotes = summary?.stats?.totalNotes ?? 0;
  const totalEntities = summary?.stats?.totalEntities ?? 0;

  if (summaryLoading) return <DashboardSkeleton />;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">A fixed sidebar with quick insights and live summaries.</p>
          </div>
          <button
            onClick={() => navigate("/notes")}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" /> New Note
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-7 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Share2 className="h-4 w-4 text-accent" /> Notes Over Time
              </div>
              <span className="text-xs text-zinc-500">Click the graph area to explore</span>
            </div>
            <div
              onClick={() => navigate("/graph")}
              className="h-[320px] rounded-3xl bg-slate-900/70 p-4 cursor-pointer transition hover:bg-slate-900"
            >
              <ChartContainer config={{}} className="h-full">
                <LineChart data={noteTimeline} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#324152" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "rgb(15, 23, 42)", borderColor: "#374151" }} />
                  <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={3} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
          </section>

          <aside className="xl:col-span-5 grid gap-6">
            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Activity className="h-4 w-4 text-emerald-400" /> System Usage
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-purple-400">
                  {user?.plan || "FREE"}
                </span>
              </div>

              {usage ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Notes</span>
                      <span className="text-zinc-200">{usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}</span>
                    </div>
                    <Progress value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-2 rounded-full bg-zinc-800" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Entities</span>
                      <span className="text-zinc-200">{usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}</span>
                    </div>
                    <Progress value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-2 rounded-full bg-zinc-800" />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Loading usage...</div>
              )}

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                      <HardDrive className="h-3 w-3" /> Storage Vault
                    </div>
                    <p className="text-2xl font-semibold text-white">{summary?.storageUsage?.formattedUsed ?? "0 MB"}</p>
                  </div>
                  <span className="text-xs text-zinc-500">/ {summary?.storageUsage?.formattedLimit ?? "∞"}</span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FolderOpen className="h-4 w-4 text-sky-400" /> Recent Notes
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/notes")}
                  className="text-xs uppercase text-zinc-500 hover:text-white"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                {recentNotes.length > 0 ? (
                  recentNotes.map((note, index) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => navigate(`/notes/${note.id}`)}
                      className={`w-full rounded-3xl border px-4 py-4 text-left transition-colors ${index % 2 === 0 ? "bg-slate-950/70" : "bg-slate-950/60"} hover:border-white/10 hover:bg-white/5`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white truncate">{note.title}</p>
                        <ArrowRight className="h-4 w-4 text-zinc-500" />
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{formatNoteDate(note.createdAtTimestamp)}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/60 p-8 text-center text-sm text-zinc-500">
                    No recent notes available.
                  </div>
                )}
              </div>
            </section>
          </aside>

          <section className="xl:col-span-7 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 text-emerald-400" /> Today's Activities
              </div>
              <button
                type="button"
                onClick={() => navigate("/activities")}
                className="text-xs uppercase text-zinc-500 hover:text-white"
              >
                Open
              </button>
            </div>
            <div className="space-y-3">
              {todayActivities.length > 0 ? (
                todayActivities.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        <p className="text-xs text-zinc-500">Tracked today</p>
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">{item.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/60 p-8 text-center text-sm text-zinc-500">
                  No activities tracked for today.
                </div>
              )}
            </div>
          </section>

          <aside className="xl:col-span-5 grid gap-6">
            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-white mb-4">Summary Counters</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-3xl bg-slate-950/70 p-4 text-center">
                  <p className="text-3xl font-semibold text-accent">{graphNodeCount}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-zinc-500">Total Nodes</p>
                </div>
                <div className="rounded-3xl bg-slate-950/70 p-4 text-center">
                  <p className="text-3xl font-semibold text-sky-400">{totalNotes}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-zinc-500">Total Notas</p>
                </div>
                <div className="rounded-3xl bg-slate-950/70 p-4 text-center">
                  <p className="text-3xl font-semibold text-emerald-400">{totalEntities}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-zinc-500">Total Entidades</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-white">Timers</h2>
                  <p className="text-xs text-zinc-500">Select a timer to inspect trends.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/activities")}
                  className="text-xs uppercase text-zinc-500 hover:text-white"
                >
                  Open
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-3 mb-4">
                {Array.isArray(timerSummaries) && timerSummaries.length > 0 ? (
                  timerSummaries.slice(0, 5).map((timer: any) => (
                    <button
                      key={timer.entityId}
                      type="button"
                      onClick={() => setSelectedTimer(timer.entityId)}
                      className={`min-w-[120px] rounded-3xl border px-4 py-3 text-left transition ${selectedTimer === timer.entityId ? "border-accent bg-accent/10 text-white" : "border-white/10 bg-slate-950/70 text-zinc-300 hover:border-white/20"}`}
                    >
                      <p className="text-sm font-medium truncate">{timer.entityTitle}</p>
                      <p className="mt-2 text-xs text-zinc-500">{timer.formattedTotal ?? formatTime(timer.totalSeconds ?? 0)}</p>
                    </button>
                  ))
                ) : (
                  <div className="min-w-full rounded-3xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-sm text-zinc-500">
                    No timers found.
                  </div>
                )}
              </div>
              <div className="h-[260px] rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                {selectedTimer && timerChartData.length > 0 ? (
                  <ChartContainer config={{}} className="h-full">
                    <LineChart data={timerChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#324152" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "rgb(15, 23, 42)", borderColor: "#374151" }} />
                      <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">Select a timer to view its 7-day activity.</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

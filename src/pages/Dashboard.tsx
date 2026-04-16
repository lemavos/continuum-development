import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import { dashboardApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import {
  Flame,
  HardDrive,
  FileText,
  BarChart3,
  Plus,
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
    return new Date(value).toLocaleDateString();
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-slate-800";
    if (count <= 2) return "bg-cyan-900";
    if (count <= 4) return "bg-cyan-700";
    return "bg-cyan-500";
  };

  const generateHeatmap = () => {
    if (!summary?.habitActivity.dailyCompletions) return null;

    const today = new Date();
    const days = [];
    // Generate last 30 days to match backend data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = summary.habitActivity.dailyCompletions[dateStr] || 0;
      days.push({ date: dateStr, count });
    }

    return (
      <div className="grid grid-cols-10 gap-1 mt-4">
        {days.map((day, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.count)}`}
            title={`${day.date}: ${day.count} completions`}
          />
        ))}
      </div>
    );
  };

  const bentoItems: BentoItem[] = [
    // Welcome/Storage Widget
    {
      title: `Welcome back, ${user?.username || "User"}`,
      meta: summary?.storageUsage ? `${summary.storageUsage.formattedUsed} of ${summary.storageUsage.formattedLimit}` : "Loading...",
      description: "Your storage usage and quick overview",
      icon: <HardDrive className="w-4 h-4 text-cyan-400" />,
      status: summary?.storageUsage
        ? summary.storageUsage.isUnlimited
          ? "Unlimited storage"
          : `${summary.storageUsage.percentageUsed.toFixed(1)}% used`
        : "",
      colSpan: 2,
      hasPersistentHover: true,
      customContent: summary?.storageUsage ? (
        <div className="mt-4">
          <Progress value={summary.storageUsage.percentageUsed} className="h-2" />
        </div>
      ) : null,
    },

    // Heatmap Widget
    {
      title: "Habit Activity",
      meta: summary?.habitActivity ? `${summary.habitActivity.currentStreak} day streak` : "—",
      description: "Your daily habit completion heatmap",
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      status: summary?.habitActivity ? `Longest dry spell: ${summary.habitActivity.longestInactive} days` : "",
      tags: ["Streaks", "Activity"],
      colSpan: 2,
      customContent: summary?.habitActivity ? generateHeatmap() : (
        <div className="mt-4 text-center text-muted-foreground">
          <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No habit activity yet</p>
          <p className="text-xs">Start tracking habits to see your progress</p>
          <button
            onClick={() => navigate("/entities?type=HABIT")}
            className="mt-2 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Create habit
          </button>
        </div>
      ),
      onClick: () => navigate("/entities?type=HABIT"),
    },

    // Quick Access Widget
    {
      title: "Recent Notes",
      meta: summary?.recentNotes ? `${summary.recentNotes.length} recent` : "—",
      description: "Quick access to your latest notes",
      icon: <FileText className="w-4 h-4 text-cyan-400" />,
      status: "Recently updated",
      tags: ["Notes", "Recent"],
      colSpan: 2,
      customContent: summary?.recentNotes && summary.recentNotes.length > 0 ? (
        <div className="mt-4 space-y-2">
          {summary.recentNotes.slice(0, 3).map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between p-2 rounded-md bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{note.title}</p>
                <p className="text-xs text-muted-foreground truncate">{note.preview}</p>
              </div>
              <div className="text-xs text-muted-foreground ml-2">
                {formatDate(note.updatedAtTimestamp)}
              </div>
            </div>
          ))}
          {summary.recentNotes.length > 3 && (
            <button
              onClick={() => navigate("/notes")}
              className="w-full text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View all notes →
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notes yet</p>
          <p className="text-xs">Create your first note to get started</p>
          <button
            onClick={() => navigate("/notes")}
            className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Create note
          </button>
        </div>
      ),
      onClick: () => navigate("/notes"),
    },

    // Stats Widget
    {
      title: "Quick Stats",
      meta: summary?.stats ? `${summary.stats.totalNotes} notes` : "—",
      description: "Overview of your content and activity",
      icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
      status: "Your activity",
      tags: ["Stats", "Overview"],
      colSpan: 1,
      customContent: summary?.stats ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Notes</span>
            <span className="text-sm font-medium">{summary.stats.totalNotes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Entities</span>
            <span className="text-sm font-medium">{summary.stats.totalEntities}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Habits</span>
            <span className="text-sm font-medium">{summary.stats.totalHabits}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active</span>
            <span className="text-sm font-medium text-orange-400">{summary.stats.activeHabits}</span>
          </div>
        </div>
      ) : null,
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <div className="space-y-1 mb-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50">
              Hello, {user?.username || "User"}
            </h1>
            <p className="text-sm text-slate-400">Loading your dashboard...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bento-card p-5 animate-pulse">
                <div className="h-4 bg-slate-700 rounded mb-2"></div>
                <div className="h-3 bg-slate-700 rounded mb-4"></div>
                <div className="h-20 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50">
            Hello, {user?.username || "User"}
          </h1>
          <p className="text-sm text-slate-400">
            Here's a summary of your activity
          </p>
        </div>

        <BentoGrid items={bentoItems} />

        {/* Plan Usage */}
        {usage && (
          <div className="bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">
                Plan <span className="text-cyan-400">{plan}</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="text-muted-foreground">
                    {usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}
                  </span>
                </div>
                <Progress
                  value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)}
                  className="h-1"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Entities</span>
                  <span className="text-muted-foreground">
                    {usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}
                  </span>
                </div>
                <Progress
                  value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)}
                  className="h-1"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Habits</span>
                  <span className="text-muted-foreground">
                    {usage.habitsCount} / {limits.maxHabits === -1 ? "∞" : limits.maxHabits}
                  </span>
                </div>
                <Progress
                  value={limits.maxHabits === -1 ? 0 : Math.min((usage.habitsCount / limits.maxHabits) * 100, 100)}
                  className="h-1"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="text-muted-foreground">
                    {usage.vaultSizeMB}MB / {limits.maxVaultSizeMB}MB
                  </span>
                </div>
                <Progress
                  value={Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)}
                  className="h-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

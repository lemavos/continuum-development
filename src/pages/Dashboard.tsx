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
    // Cores em escala de roxo/verde neon
    if (count === 0) return "bg-gray-900 border border-gray-700";
    if (count === 1) return "bg-purple-900 border border-purple-700";
    if (count === 2) return "bg-purple-700 border border-purple-500";
    if (count === 3) return "bg-purple-600 border border-purple-400";
    if (count === 4) return "bg-purple-500 border border-purple-400";
    return "bg-purple-400 border border-purple-300 shadow-lg shadow-purple-500/50";
  };

  const generateHeatmap = () => {
    if (!summary?.habitActivity.dailyCompletions) return null;

    const today = new Date();
    const weeks: { date: string; count: number }[][] = [];
    const days = [];

    // Generate 35 days (5 weeks x 7 days)
    for (let i = 34; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = summary.habitActivity.dailyCompletions[dateStr] || 0;
      days.push({ date: dateStr, count, dow: date.getDay() });
    }

    // Group into weeks (Sunday to Saturday)
    for (let w = 0; w < 5; w++) {
      weeks[w] = [];
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d;
        if (idx < days.length) {
          weeks[w].push(days[idx]);
        }
      }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="mt-6">
        <div className="flex items-start gap-2">
          {/* Day labels */}
          <div className="flex flex-col gap-1.5">
            {dayNames.map((d, i) => (
              <div key={i} className="h-4 w-6 flex items-center justify-center">
                <span className="text-[10px] text-gray-500 font-medium">{d}</span>
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1.5">
            {weeks.map((week, w) => (
              <div key={w} className="flex flex-col gap-1.5">
                {week.map((day, d) => (
                  <div
                    key={`${w}-${d}`}
                    className={`w-5 h-5 rounded-sm cursor-pointer transition-transform hover:scale-110 ${getHeatmapColor(day.count)}`}
                    title={`${day.date}: ${day.count} completions`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${
                  i === 0 ? "bg-gray-900 border border-gray-700" :
                  i === 1 ? "bg-purple-900 border border-purple-700" :
                  i === 2 ? "bg-purple-600 border border-purple-400" :
                  i === 3 ? "bg-purple-500 border border-purple-400" :
                  "bg-purple-400 border border-purple-300 shadow-lg shadow-purple-500/50"
                }`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    );
  };

  const bentoItems: BentoItem[] = [
    // Welcome/Storage Widget
    {
      title: `Welcome back, ${user?.username || "User"}`,
      meta: summary?.storageUsage ? `${summary.storageUsage.formattedUsed} of ${summary.storageUsage.formattedLimit}` : "Loading...",
      description: "Your storage usage and quick overview",
      icon: <HardDrive className="w-4 h-4 text-gray-400" />,
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
      icon: <FileText className="w-4 h-4 text-gray-400" />,
      status: "Recently updated",
      tags: ["Notes", "Recent"],
      colSpan: 2,
      customContent: summary?.recentNotes && summary.recentNotes.length > 0 ? (
        <div className="mt-4 space-y-2">
          {summary.recentNotes.slice(0, 3).map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between p-2 rounded-md bg-card/50 hover:bg-card cursor-pointer transition-colors"
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
              className="w-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
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
            className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
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
      icon: <BarChart3 className="w-4 h-4 text-gray-400" />,
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
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="space-y-2 mb-8">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500">Loading your dashboard...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bento-card p-6 animate-pulse">
                <div className="h-4 bg-gray-800 rounded mb-3"></div>
                <div className="h-3 bg-gray-800 rounded mb-4 w-2/3"></div>
                <div className="h-24 bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
            Welcome back, {user?.username || "User"}
          </h1>
          <p className="text-sm text-gray-500">
            Here's a snapshot of your activity and progress
          </p>
        </div>

        <BentoGrid items={bentoItems} />

        {/* Plan Usage */}
        {usage && (
          <div className="bento-card p-6 space-y-4 border border-white/5 glow-primary">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">
                Plan Usage
              </h2>
              <span className="text-xs font-medium px-2 py-1 rounded bg-white/10 text-gray-300">
                {plan}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Notes</span>
                  <span className="text-gray-300 font-medium">
                    {usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}
                  </span>
                </div>
                <Progress
                  value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)}
                  className="h-1.5"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Entities</span>
                  <span className="text-gray-300 font-medium">
                    {usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}
                  </span>
                </div>
                <Progress
                  value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)}
                  className="h-1.5"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Habits</span>
                  <span className="text-gray-300 font-medium">
                    {usage.habitsCount} / {limits.maxHabits === -1 ? "∞" : limits.maxHabits}
                  </span>
                </div>
                <Progress
                  value={limits.maxHabits === -1 ? 0 : Math.min((usage.habitsCount / limits.maxHabits) * 100, 100)}
                  className="h-1.5"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Storage</span>
                  <span className="text-gray-300 font-medium">
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

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
      title: "Notes",
      meta: `${metrics.totalNotes ?? "—"} notes`,
      description: "Manage your notes, ideas and journaling with smart search",
      icon: <StickyNote className="w-4 h-4 text-primary" />,
      status: metrics.notesThisWeek ? `+${metrics.notesThisWeek} this week` : "Journal",
      tags: ["Writing", "Ideas"],
      colSpan: 2,
      hasPersistentHover: true,
      onClick: () => navigate("/notes"),
    },
    {
      title: "Daily Habits",
      meta: `${todayEvents.length} completed`,
      description: "Track your daily habits and maintain your streak",
      icon: <CheckCircle className="w-4 h-4 text-primary" />,
      status: "Today",
      tags: ["Streaks", "Daily"],
      onClick: () => navigate("/entities?type=HABIT"),
    },
    {
      title: "Entities",
      meta: `${metrics.totalEntities ?? "—"} total`,
      description: "People, projects, topics and connected organizations",
      icon: <Network className="w-4 h-4 text-primary" />,
      tags: ["Graph", "Connections"],
      colSpan: 2,
      onClick: () => navigate("/entities"),
    },
    {
      title: "Current Streak",
      meta: `${metrics.currentStreak ?? 0} days`,
      description: "Your continuous productivity streak",
      icon: <Flame className="w-4 h-4 text-warning" />,
      status: "In progress",
      tags: ["Focus"],
      onClick: () => navigate("/entities?type=HABIT"),
    },
  ];

  const usageBar = (current: number, max: number, label: string) => {
    const isUnlimited = max === -1;
    const pct = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
    const isNearLimit = !isUnlimited && pct >= 80;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={isNearLimit ? "text-warning font-medium" : "text-muted-foreground"}>
            {isUnlimited ? `${current} / ∞` : `${current} / ${max}`}
          </span>
        </div>
        <Progress value={isUnlimited ? 100 : pct} className="h-1" />
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Hello, {user?.username || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's a summary of your activity
          </p>
        </div>

        <BentoGrid items={bentoItems} />

        {/* Plan Usage */}
        {usage && (
          <div className="bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">
                Plan <span className="text-primary">{plan}</span>
              </h2>
              {/* <button onClick={() => navigate("/subscription")} className="text-xs text-primary/70 hover:text-primary transition-colors">
                Manage →
              </button> */}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {usageBar(usage.notesCount, limits.maxNotes, "Notes")}
              {usageBar(usage.entitiesCount, limits.maxEntities, "Entities")}
              {usageBar(usage.habitsCount, limits.maxHabits, "Habits")}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, value: metrics.totalNotes ?? 0, label: "Notes" },
            { icon: Network, value: metrics.totalEntities ?? 0, label: "Entities" },
            { icon: Calendar, value: todayEvents.length, label: "Completed today" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="bento-card p-4 text-center space-y-2">
              <Icon className="w-5 h-5 text-primary mx-auto" />
              <p className="text-2xl font-display font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

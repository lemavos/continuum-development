import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Flame, CheckCircle, Edit, StickyNote, Network, Calendar, Tag, Clock, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { HeatmapData, EntityStats } from "@/types";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PLAN_LIMITS, type Plan } from "@/types";

interface EntityData { id: string; title: string; type: string; description?: string; trackingDates?: string[]; createdAt: string; }

interface RelatedNote { id: string; title: string; createdAt: string; updatedAt: string; }

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [stats, setStats] = useState<EntityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [relatedEntities, setRelatedEntities] = useState<EntityData[]>([]);

  // Time tracking
  const { getTotalTime, getActiveTimer, startTimer, stopTimer, formatSeconds, activeTimers, isTimerActive, getElapsedSeconds, isStarting, isStopping } = useTimeTracking();
  const { data: timeSummary } = getTotalTime(id!);
  const { data: activeTimer } = getActiveTimer(id!);

  // Plan limits for heatmap
  const { user } = useAuth();
  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];
  const historyDays = limits.historyDays === -1 ? 365 : limits.historyDays;

  const handleStartTimer = async () => {
    if (!id) return;
    await startTimer(id);
  };

  const handleStopTimer = async () => {
    if (!id) return;
    const activeTimerData = activeTimers.get(id);
    if (activeTimerData) {
      await stopTimer({ sessionId: activeTimerData.timerId });
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadEntity = async () => {
      setLoading(true);

      try {
        const { data } = await entitiesApi.get(id);

        if (cancelled) {
          return;
        }

        setEntity(data);

        if (data?.type === "HABIT") {
          const [hRes, sRes] = await Promise.all([entitiesApi.heatmap(id), entitiesApi.stats(id)]);

          if (cancelled) {
            return;
          }

          // Try API heatmap first, fallback to trackingDates
          const apiHeatmap = normalizeHeatmapData(hRes.data);
          const trackingHeatmap = buildHeatmapFromTrackingDates(data.trackingDates || []);
          const finalHeatmap = Object.keys(apiHeatmap).length > 0 ? apiHeatmap : trackingHeatmap;
          
          setHeatmap(finalHeatmap);
          setStats({
            ...sRes.data,
            totalCompletions: Array.isArray(data.trackingDates) ? data.trackingDates.length : sRes.data?.totalCompletions,
          });
        } else {
          setHeatmap({});
          setStats(null);
        }

        // Load related notes and connections
        const [notesRes, connectionsRes] = await Promise.all([
          entitiesApi.getNotes(id),
          entitiesApi.getConnections(id),
        ]);

        if (cancelled) {
          return;
        }

        setRelatedNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
        setRelatedEntities(
          (Array.isArray(connectionsRes.data) ? connectionsRes.data : []).filter(
            (item: EntityData) => item.id !== id
          )
        );
      } catch {
        if (!cancelled) {
          toast({ title: "Entity not found", variant: "destructive" });
          navigate("/entities");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadEntity();

    return () => {
      cancelled = true;
    };
  }, [id, navigate, toast]);

  const normalizeHeatmapData = (payload: unknown): HeatmapData => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
    return Object.entries(payload).reduce<HeatmapData>((normalized, [key, value]) => {
      // Handle both "2026-04-12" and "2026-04-12T00:00:00.000Z" formats
      const dateKey = key.includes("T") ? key.split("T")[0] : key;
      const count = typeof value === "number" ? value : parseInt(String(value), 10);
      if (!Number.isNaN(count) && count >= 0) {
        normalized[dateKey] = (normalized[dateKey] || 0) + count;
      }
      return normalized;
    }, {});
  };

  const buildHeatmapFromTrackingDates = (dates: unknown[]): HeatmapData => {
    if (!Array.isArray(dates)) return {};
    
    const heatmap: HeatmapData = {};
    dates.forEach((date) => {
      try {
        // Handle both Date objects and ISO strings
        const dateObj = typeof date === "string" ? new Date(date) : date instanceof Date ? date : new Date(String(date));
        const dateKey = dateObj.toISOString().split("T")[0];
        heatmap[dateKey] = (heatmap[dateKey] || 0) + 1;
      } catch {
        // Skip invalid dates
      }
    });
    return heatmap;
  };

  const handleTrack = async () => {
    if (!id) return;
    const today = new Date().toISOString().split("T")[0];

    try {
      // Optimistically update tracking dates and heatmap
      setEntity((prev) => {
        if (!prev) return prev;
        const normalizedDates = Array.from(
          new Set([...(prev.trackingDates || []).map((date) => date.split("T")[0]), today])
        );
        return {
          ...prev,
          trackingDates: normalizedDates,
        };
      });

      setHeatmap((prev) => ({
        ...prev,
        [today]: (prev[today] || 0) + 1,
      }));

      await entitiesApi.track(id);

      const [eRes, sRes, hRes] = await Promise.all([
        entitiesApi.get(id),
        entitiesApi.stats(id),
        entitiesApi.heatmap(id),
      ]);

      const freshData = eRes.data;
      const freshHeatmap = normalizeHeatmapData(hRes.data);
      if (!freshHeatmap[today]) {
        freshHeatmap[today] = 1;
      }

      setEntity(freshData);
      setStats(sRes.data);
      setHeatmap(freshHeatmap);
      toast({ title: "Registered! 🔥" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSaveTitle = async () => {
    if (!id || !newTitle.trim()) return;
    try {
      const { data } = await entitiesApi.update(id, { title: newTitle.trim() });
      setEntity(data);
      setEditingTitle(false);
      toast({ title: "Name updated!" });
    } catch { toast({ title: "Error updating", variant: "destructive" }); }
  };

  const handleSaveDescription = async () => {
    if (!id) return;
    try {
      const { data } = await entitiesApi.update(id, { description: newDescription.trim() });
      setEntity(data);
      setEditingDescription(false);
      toast({ title: "Description updated!" });
    } catch { toast({ title: "Error updating description", variant: "destructive" }); }
  };

  // Generate heatmap organized by days of the week (Sunday to Saturday)
  const generateWeeklyHeatmap = (heatmapData: HeatmapData): Record<string, Record<number, { date: string; count: number }>> => {
    const today = new Date();
    const weeks: Record<string, Record<number, { date: string; count: number }>> = {};
    
    // Calculate start date based on plan limits
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - historyDays + 1);
    
    // Generate all dates within the history limit
    for (let i = 0; i < historyDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Calculate week key (YYYY-MM-DD of Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - dayOfWeek);
      const weekKey = weekStart.toISOString().split("T")[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {};
      }
      
      weeks[weekKey][dayOfWeek] = {
        date: dateStr,
        count: heatmapData[dateStr] || 0
      };
    }
    
    return weeks;
  };

  const getHeatmapColor = (val: number) => {
    if (val === 0) return "bg-zinc-900";
    if (val === 1) return "bg-[#00BFC0]/30";
    if (val === 2) return "bg-[#00BFC0]/60";
    if (val === 3) return "bg-[#00BFC0]/80";
    return "bg-[#00BFC0]";
  };

  if (loading) return <AppLayout><div className="flex justify-center items-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!entity) return null;

  const isHabit = entity.type === "HABIT";
  const today = new Date().toISOString().split("T")[0];
  const trackedToday = entity.trackingDates?.some((date) => date.startsWith(today));
  const streak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const totalCompletions = entity.trackingDates?.length ?? stats?.totalCompletions ?? 0;

  return (
    <AppLayout>
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/entities")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="space-y-3">
          {editingTitle ? (
            <div className="flex gap-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New name..." className="flex-1" />
              <Button size="sm" onClick={handleSaveTitle}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingTitle(false); setNewTitle(entity?.title || ""); }}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50">{entity.title}</h1>
              <Button variant="ghost" size="sm" onClick={() => { setEditingTitle(true); setNewTitle(entity?.title || ""); }}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <span className="bento-tag">{entity.type}</span>
            {isHabit && <span className="bento-tag flex items-center gap-1 text-gray-400"><Flame className="w-3 h-3" /> Streak: {streak} days</span>}
            {isHabit && <span className="bento-tag">Max: {longestStreak}</span>}
            {isHabit && <span className="bento-tag">Total: {totalCompletions}</span>}
          </div>
          {editingDescription ? (
            <div className="flex flex-col gap-2">
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Add description..." className="text-sm" rows={3} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingDescription(false); setNewDescription(entity?.description || ""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 group">
              {entity.description ? (
                <p className="text-sm text-slate-400 flex-1">{entity.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description</p>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setEditingDescription(true); setNewDescription(entity?.description || ""); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {entity?.type === "PROJECT" && (
          <>
            <div className="flex items-center gap-3">
              {isTimerActive(id) ? (
                <Button onClick={handleStopTimer} disabled={isStopping} className="bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30">
                  <Pause className="w-4 h-4 mr-2" />
                  {isStopping ? "Stopping..." : `Stop Timer (${formatSeconds(getElapsedSeconds(id))})`}
                </Button>
              ) : (
                <Button onClick={handleStartTimer} disabled={isStarting} className="bg-green-500/20 text-green-200 border border-green-500/30 hover:bg-green-500/30">
                  <Play className="w-4 h-4 mr-2" />
                  {isStarting ? "Starting..." : "Start Timer"}
                </Button>
              )}
            </div>

            {/* Time Summary */}
            {timeSummary && (
              <div className="bento-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Tracking Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Time:</span>
                    <span className="ml-2 font-semibold text-foreground">{timeSummary.formattedTotal}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sessions:</span>
                    <span className="ml-2 font-semibold text-foreground">{timeSummary.entriesCount}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {entity?.type === "HABIT" && (
          <>
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-50 tracking-tight">Activity Heatmap (Last {historyDays} days)</h2>
              <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-white/10 overflow-x-auto">
                {/* Day labels */}
                <div className="flex mb-2 min-w-max">
                  <div className="w-8"></div> {/* Space for week labels */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="flex-1 text-center text-xs text-slate-400 font-medium min-w-[2.5rem]">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Heatmap grid */}
                <div className="space-y-1 min-w-max">
                  {Object.entries(generateWeeklyHeatmap(heatmap))
                    .sort(([a], [b]) => a.localeCompare(b)) // Sort weeks chronologically
                    .map(([weekKey, weekData]) => (
                      <div key={weekKey} className="flex items-center">
                        {/* Week label - show month/day */}
                        <div className="w-8 text-xs text-slate-500 mr-2 text-right">
                          {new Date(weekKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        
                        {/* Day cells */}
                        {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                          const dayData = weekData[dayOfWeek] || { date: '', count: 0 };
                          
                          return (
                            <div
                              key={dayOfWeek}
                              title={dayData.date ? `${dayData.date}: ${dayData.count} completion${dayData.count !== 1 ? 's' : ''}` : 'No data'}
                              className={cn(
                                "flex-1 aspect-square rounded-sm border border-white/5 transition-all hover:scale-110 cursor-pointer min-w-[2.5rem]",
                                getHeatmapColor(dayData.count),
                                dayData.count > 0 ? "shadow-sm" : ""
                              )}
                            />
                          );
                        })}
                      </div>
                    ))}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-medium">Less</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-sm bg-zinc-900 border border-white/5"></div>
                      <div className="w-3 h-3 rounded-sm bg-[#00BFC0]/30 border border-white/5"></div>
                      <div className="w-3 h-3 rounded-sm bg-[#00BFC0]/60 border border-white/5"></div>
                      <div className="w-3 h-3 rounded-sm bg-[#00BFC0]/80 border border-white/5"></div>
                      <div className="w-3 h-3 rounded-sm bg-[#00BFC0] border border-white/5"></div>
                    </div>
                    <span className="font-medium">More</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {historyDays === -1 ? 'Unlimited history' : `${historyDays} days history`}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bento-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Entity Metadata</h3>
          <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground">
            <div className="rounded-md border border-border/50 bg-card/60 p-3">
              <div className="mb-1 inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Created At
              </div>
              <div className="text-sm font-semibold text-foreground">{new Date(entity.createdAt).toLocaleDateString("en-US")}</div>
            </div>
            <div className="rounded-md border border-border/50 bg-card/60 p-3">
              <div className="mb-1 inline-flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5" />
                Number of Connections
              </div>
              <div className="text-sm font-semibold text-foreground">{relatedEntities.length}</div>
            </div>
            <div className="rounded-md border border-border/50 bg-card/60 p-3">
              <div className="mb-1 inline-flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Entity Type
              </div>
              <div className="text-sm font-semibold text-foreground">{entity.type}</div>
            </div>
          </div>
        </div>

        <div className="bento-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Connected Notes</h3>
          <div className="space-y-2">
            {relatedNotes.length > 0 ? (
              relatedNotes.slice(0, 5).map((note) => (
                <button
                  key={note.id}
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className="flex w-full items-start gap-2 rounded-md border border-border/40 px-3 py-2 text-left transition-colors hover:bg-accent hover:border-white/20"
                >
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{note.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(note.updatedAt).toLocaleDateString("en-US")}
                    </p>
                  </div>
                </button>
              ))
            ) : (
                  <p className="text-sm text-muted-foreground">No connected notes yet.</p>
            )}
          </div>
        </div>

        <div className="bento-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Connected Entities</h3>
          <div className="space-y-2">
            {relatedEntities.length > 0 ? (
              relatedEntities.slice(0, 5).map((ent) => (
                <button
                  key={ent.id}
                  onClick={() => navigate(`/entities/${ent.id}`)}
                  className="flex w-full items-start gap-2 rounded-md border border-border/40 px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{ent.title}</p>
                    <p className="text-xs text-muted-foreground">{ent.type}</p>
                  </div>
                </button>
              ))
            ) : (
                  <p className="text-sm text-muted-foreground">No connected entities yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}

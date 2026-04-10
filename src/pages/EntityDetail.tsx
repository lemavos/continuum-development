import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Flame, CheckCircle, Edit, StickyNote, Network, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { HeatmapData, EntityStats } from "@/types";

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
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [relatedEntities, setRelatedEntities] = useState<EntityData[]>([]);

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

          setHeatmap(normalizeHeatmapData(hRes.data));
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
      const dateKey = key.split("T")[0];
      const count = typeof value === "number" ? value : parseInt(String(value), 10);
      if (!Number.isNaN(count) && count >= 0) {
        normalized[dateKey] = (normalized[dateKey] || 0) + count;
      }
      return normalized;
    }, {});
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

  const getLast90Days = () => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(d.toISOString().split("T")[0]); }
    return days;
  };

  const getHeatmapColor = (val: number) => {
    if (val === 0) return "bg-accent";
    if (val === 1) return "bg-primary/20";
    if (val <= 3) return "bg-primary/50";
    return "bg-primary";
  };

  if (loading) return <AppLayout><div className="flex justify-center items-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!entity) return null;

  const days = getLast90Days();
  const isHabit = entity.type === "HABIT";
  const today = new Date().toISOString().split("T")[0];
  const trackedToday = entity.trackingDates?.some((date) => date.startsWith(today));
  const streak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const totalCompletions = entity.trackingDates?.length ?? stats?.totalCompletions ?? 0;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
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
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{entity.title}</h1>
              <Button variant="ghost" size="sm" onClick={() => { setEditingTitle(true); setNewTitle(entity?.title || ""); }}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <span className="bento-tag">{entity.type}</span>
            {isHabit && <span className="bento-tag flex items-center gap-1 text-primary"><Flame className="w-3 h-3" /> Streak: {streak} days</span>}
            {isHabit && <span className="bento-tag">Max: {longestStreak}</span>}
            {isHabit && <span className="bento-tag">Total: {totalCompletions}</span>}
          </div>
          {entity.description && <p className="text-sm text-muted-foreground">{entity.description}</p>}
        </div>

        {isHabit && (
          <>
            <Button onClick={handleTrack} disabled={!!trackedToday} className={trackedToday ? "bg-accent text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"}>
              <CheckCircle className="w-4 h-4 mr-1" /> {trackedToday ? "Done today ✓" : "Track today"}
            </Button>

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Last 90 days</h2>
              <div className="flex flex-wrap gap-1">
                {days.map((day) => (
                  <div key={day} title={`${day}: ${heatmap[day] || 0}`} className={cn("w-3 h-3 rounded-sm transition-colors", getHeatmapColor(heatmap[day] || 0))} />
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-accent" />
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <div className="w-3 h-3 rounded-sm bg-primary/50" />
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span>More</span>
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
                  className="flex w-full items-start gap-2 rounded-md border border-border/40 px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
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

        <div className="bento-card p-4">
          <p className="text-xs text-muted-foreground">Created on {new Date(entity.createdAt).toLocaleDateString("en-US")}</p>
        </div>
      </div>
    </AppLayout>
  );
}

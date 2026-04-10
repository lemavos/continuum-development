import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi, trackingApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Network, User, Briefcase, Hash, Building, Flame, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EntityType } from "@/types";

interface Entity { id: string; title: string; type: EntityType; description?: string; createdAt: string; trackingDates?: string[]; }

const typeIcons: Record<string, any> = { PERSON: User, PROJECT: Briefcase, TOPIC: Hash, ORGANIZATION: Building, HABIT: Flame };
const typeLabels: Record<string, string> = { PERSON: "Person", PROJECT: "Project", TOPIC: "Topic", ORGANIZATION: "Organization", HABIT: "Habit" };

export default function Entities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreateEntity, canCreateHabit, getLimitMessage, refresh: refreshUsage, applyUsageDelta } = usePlanGate();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("TOPIC");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, tRes] = await Promise.all([entitiesApi.list(), trackingApi.today()]);
      setEntities(Array.isArray(eRes.data) ? eRes.data : []);
      setTodayEvents(Array.isArray(tRes.data) ? tRes.data : []);
    } catch { toast({ title: "Error loading entities", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (newType === "HABIT" && !canCreateHabit) { setCreateOpen(false); setUpgradeOpen(true); return; }
    if (!canCreateEntity) { setCreateOpen(false); setUpgradeOpen(true); return; }
    setCreating(true);
    try {
      const { data } = await entitiesApi.create(newTitle, newType, newDesc || undefined);
      setEntities((prev) => [...prev, data]);
      setCreateOpen(false); setNewTitle(""); setNewDesc("");
      applyUsageDelta({ entitiesCount: newType === "HABIT" ? 0 : 1, habitsCount: newType === "HABIT" ? 1 : 0 });
      void refreshUsage();
    } catch (err: any) {
      if (err.response?.status === 403) { setCreateOpen(false); setUpgradeOpen(true); }
      else toast({ title: "Error", description: err.response?.data?.message || "Limit reached?", variant: "destructive" });
    } finally { setCreating(false); }
  };

  const handleTrack = async (entityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const today = new Date().toISOString().split("T")[0];

      await entitiesApi.track(entityId);

      setEntities((prev) =>
        prev.map((ent) =>
          ent.id === entityId
            ? {
                ...ent,
                trackingDates: Array.from(
                  new Set([...(ent.trackingDates || []).map((date) => date.split("T")[0]), today])
                ),
              }
            : ent
        )
      );

      toast({ title: "Habit tracked! 🔥" });
    } catch {
      toast({ title: "Error registering", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const entity = entities.find((item) => item.id === id);
      await entitiesApi.delete(id);
      setEntities((prev) => prev.filter((en) => en.id !== id));
      applyUsageDelta({ entitiesCount: entity?.type === "HABIT" ? 0 : -1, habitsCount: entity?.type === "HABIT" ? -1 : 0 });
      void refreshUsage();
    }
    catch { toast({ title: "Error deleting", variant: "destructive" }); }
  };

  const today = new Date().toISOString().split("T")[0];
  const isTrackedToday = (entity: Entity) => entity.trackingDates?.some((date) => date.startsWith(today)) ?? false;

  const filtered = entities.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter ? e.type === typeFilter : true;
    return matchSearch && matchType;
  });

  const types = ["PERSON", "PROJECT", "TOPIC", "ORGANIZATION", "HABIT"];
  const entitiesLimit = getLimitMessage("entities");
  const habitsLimit = getLimitMessage("habits");

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Entities</h1>
            {entitiesLimit && <p className="text-xs text-muted-foreground mt-1">{entitiesLimit}</p>}
            {habitsLimit && <p className="text-xs text-muted-foreground mt-1">{habitsLimit}</p>}
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> New Entity</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-foreground">Create Entity</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Entity name" className="bg-accent border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="bg-accent border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {types.map((t) => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description (optional)</Label>
                  <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="bg-accent border-border/50" />
                </div>
                <Button onClick={handleCreate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={creating || !newTitle}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSearchParams({})} className={cn("bento-tag", !typeFilter && "bg-primary/10 text-primary font-medium")}>All</button>
          {types.map((t) => {
            const Icon = typeIcons[t];
            return (
              <button key={t} onClick={() => setSearchParams({ type: t })} className={cn("bento-tag flex items-center gap-1", typeFilter === t && "bg-primary/10 text-primary font-medium")}>
                <Icon className="w-3 h-3" /> {typeLabels[t]}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entities..." className="pl-9 bg-accent border-border/50" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Network className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">No entities found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((entity) => {
              const Icon = typeIcons[entity.type] || Network;
              const tracked = isTrackedToday(entity);
              return (
                <div key={entity.id} className="bento-card group cursor-pointer" onClick={() => navigate(`/entities/${entity.id}`)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="bento-icon-box"><Icon className="w-4 h-4 text-primary" /></div>
                    <span className="bento-status">{typeLabels[entity.type]}</span>
                  </div>
                  <h3 className="font-medium text-foreground text-[15px] tracking-tight">{entity.title}</h3>
                  {entity.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entity.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1">
                      {entity.type === "HABIT" && (
                        <button onClick={(e) => handleTrack(entity.id, e)} className={cn("bento-tag flex items-center gap-1 transition-colors", tracked && "bg-primary/20 text-primary")}>
                          <CheckCircle className="w-3 h-3" /> {tracked ? "Done" : "Track"}
                        </button>
                      )}
                      {entity.trackingDates && entity.trackingDates.length > 0 && (
                        <span className="bento-tag flex items-center gap-1"><Flame className="w-3 h-3" /> {entity.trackingDates.length}</span>
                      )}
                    </div>
                    <button onClick={(e) => handleDelete(entity.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={typeFilter === "HABIT" ? "You've reached the habits limit for your plan." : "You've reached the entities limit for your plan."} />
    </AppLayout>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi, trackingApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Network,
  User,
  Briefcase,
  Hash,
  Building,
  Flame,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EntityType } from "@/types";

interface Entity {
  id: string;
  title: string;
  type: EntityType;
  description?: string;
  createdAt: string;
  trackingDates?: string[];
}

const typeIcons: Record<string, any> = {
  PERSON: User,
  PROJECT: Briefcase,
  TOPIC: Hash,
  ORGANIZATION: Building,
  HABIT: Flame,
};

const typeLabels: Record<string, string> = {
  PERSON: "Pessoa",
  PROJECT: "Projeto",
  TOPIC: "Tópico",
  ORGANIZATION: "Organização",
  HABIT: "Hábito",
};

const typeColors: Record<string, string> = {
  PERSON: "text-info",
  PROJECT: "text-warning",
  TOPIC: "text-muted-foreground",
  ORGANIZATION: "text-success",
  HABIT: "text-destructive",
};

export default function Entities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreateEntity, canCreateHabit, getLimitMessage, refresh: refreshUsage } = usePlanGate();

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
    } catch {
      toast({ title: "Erro ao carregar entidades", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    // Check plan limits
    if (newType === "HABIT" && !canCreateHabit) {
      setCreateOpen(false);
      setUpgradeOpen(true);
      return;
    }
    if (!canCreateEntity) {
      setCreateOpen(false);
      setUpgradeOpen(true);
      return;
    }

    setCreating(true);
    try {
      const { data } = await entitiesApi.create(newTitle, newType, newDesc || undefined);
      setEntities((prev) => [...prev, data]);
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      await refreshUsage();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setCreateOpen(false);
        setUpgradeOpen(true);
      } else {
        toast({
          title: "Erro",
          description: err.response?.data?.message || "Limite atingido?",
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleTrack = async (entityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await entitiesApi.track(entityId);
      await fetchData();
      toast({ title: "Hábito registrado! 🔥" });
    } catch {
      toast({ title: "Erro ao registrar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await entitiesApi.delete(id);
      setEntities((prev) => prev.filter((en) => en.id !== id));
      await refreshUsage();
    } catch {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const isTrackedToday = (entityId: string) =>
    todayEvents.some((e: any) => e.entityId === entityId);

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
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Entidades</h1>
            {entitiesLimit && <p className="text-xs text-muted-foreground">{entitiesLimit}</p>}
            {habitsLimit && <p className="text-xs text-muted-foreground">{habitsLimit}</p>}
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Entidade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Entidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nome da entidade" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição" />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={creating || !newTitle}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Criar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSearchParams({})}
            className={cn("bento-tag", !typeFilter && "bg-foreground/10 font-medium")}
          >
            Todas
          </button>
          {types.map((t) => {
            const Icon = typeIcons[t];
            return (
              <button
                key={t}
                onClick={() => setSearchParams({ type: t })}
                className={cn("bento-tag flex items-center gap-1", typeFilter === t && "bg-foreground/10 font-medium")}
              >
                <Icon className="w-3 h-3" /> {typeLabels[t]}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar entidades..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma entidade encontrada</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((entity) => {
              const Icon = typeIcons[entity.type] || Network;
              const tracked = isTrackedToday(entity.id);
              return (
                <div
                  key={entity.id}
                  className="bento-card group p-4 cursor-pointer"
                  onClick={() => navigate(`/entities/${entity.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="bento-icon-box">
                      <Icon className={cn("w-4 h-4", typeColors[entity.type])} />
                    </div>
                    <span className="bento-status">{typeLabels[entity.type]}</span>
                  </div>
                  <h3 className="font-medium text-foreground text-[15px] tracking-tight">{entity.title}</h3>
                  {entity.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entity.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1">
                      {entity.type === "HABIT" && (
                        <button
                          onClick={(e) => handleTrack(entity.id, e)}
                          className={cn(
                            "bento-tag flex items-center gap-1 transition-colors",
                            tracked && "bg-success/20 text-success"
                          )}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {tracked ? "Feito" : "Registrar"}
                        </button>
                      )}
                      {entity.trackingDates && entity.trackingDates.length > 0 && (
                        <span className="bento-tag flex items-center gap-1">
                          <Flame className="w-3 h-3" /> {entity.trackingDates.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(entity.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={typeFilter === "HABIT" ? "Você atingiu o limite de hábitos do seu plano." : "Você atingiu o limite de entidades do seu plano."}
      />
    </AppLayout>
  );
}

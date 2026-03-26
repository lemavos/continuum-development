import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS, type Plan, type UserUsage } from "@/types";
import { usageApi } from "@/lib/api";

interface PlanGateResult {
  usage: UserUsage | null;
  loading: boolean;
  canCreateNote: boolean;
  canCreateEntity: boolean;
  canCreateHabit: boolean;
  canUploadVault: (fileSizeMB: number) => boolean;
  refresh: () => Promise<void>;
  getLimitMessage: (resource: "notes" | "entities" | "habits" | "vault") => string;
}

export function usePlanGate(): PlanGateResult {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  const refresh = useCallback(async () => {
    try {
      const { data } = await usageApi.get();
      setUsage(data);
    } catch {
      // fallback: allow actions if usage endpoint fails
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setLoading(false);
  }, [user, refresh]);

  const isUnlimited = (limit: number) => limit === -1;

  const canCreateNote = !usage ? true :
    isUnlimited(limits.maxNotes) || usage.notesCount < limits.maxNotes;

  const canCreateEntity = !usage ? true :
    isUnlimited(limits.maxEntities) || usage.entitiesCount < limits.maxEntities;

  const canCreateHabit = !usage ? true :
    isUnlimited(limits.maxHabits) || usage.habitsCount < limits.maxHabits;

  const canUploadVault = (fileSizeMB: number) => {
    if (!usage) return true;
    if (isUnlimited(limits.maxVaultSizeMB)) return true;
    return (usage.vaultSizeMB + fileSizeMB) <= limits.maxVaultSizeMB;
  };

  const getLimitMessage = (resource: "notes" | "entities" | "habits" | "vault") => {
    const map = {
      notes: { current: usage?.notesCount ?? 0, max: limits.maxNotes, label: "notas" },
      entities: { current: usage?.entitiesCount ?? 0, max: limits.maxEntities, label: "entidades" },
      habits: { current: usage?.habitsCount ?? 0, max: limits.maxHabits, label: "hábitos" },
      vault: { current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, label: "MB de armazenamento" },
    };
    const r = map[resource];
    if (isUnlimited(r.max)) return "";
    return `${r.current}/${r.max} ${r.label} utilizados`;
  };

  return { usage, loading, canCreateNote, canCreateEntity, canCreateHabit, canUploadVault, refresh, getLimitMessage };
}

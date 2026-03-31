import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PLAN_LIMITS, type Plan } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, CreditCard, Loader2, Moon, Sun } from "lucide-react";

const formatLimitValue = (value: number, suffix = "") => (value === -1 ? "Ilimitado" : `${value}${suffix}`);

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { usage, loading: usageLoading } = usePlanGate();
  const { theme, setTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const currentPlan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[currentPlan];

  const resources = useMemo(() => ([
    { label: "Notas", current: usage?.notesCount ?? 0, max: limits.maxNotes },
    { label: "Entidades", current: usage?.entitiesCount ?? 0, max: limits.maxEntities },
    { label: "Hábitos", current: usage?.habitsCount ?? 0, max: limits.maxHabits },
    { label: "Vault", current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, suffix: " MB" },
  ]), [usage, limits]);

  const handleSave = async () => {
    setSaving(true);

    try {
      await authApi.updateMe({
        username,
        name: username,
        email,
      });

      await refreshUser();
      toast({ title: "Perfil atualizado" });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar perfil",
        description: err.response?.data?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Perfil</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta, tema e limites do plano.</p>
          </div>

          <Button variant="outline" className="border-border" onClick={() => navigate("/subscription")}>
            <CreditCard className="w-4 h-4 mr-2" /> Gerenciar assinatura
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="bento-card p-5 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-foreground">Dados da conta</h2>
              <p className="text-sm text-muted-foreground">Atualize suas informações principais.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-username">Nome de usuário</Label>
                <Input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-accent border-border" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-accent border-border" />
              </div>
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-accent/50 p-3">
                <p className="text-xs uppercase tracking-[0.18em]">Plano atual</p>
                <p className="mt-2 text-foreground font-medium">{currentPlan}</p>
              </div>
              <div className="rounded-lg border border-border bg-accent/50 p-3">
                <p className="text-xs uppercase tracking-[0.18em]">Membro desde</p>
                <p className="mt-2 text-foreground font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "—"}</p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !username.trim() || !email.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </section>

          <section className="bento-card p-5 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-foreground">Preferências</h2>
              <p className="text-sm text-muted-foreground">Escolha o tema da interface.</p>
            </div>

            <div className="rounded-lg border border-border bg-accent/50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Dark mode</p>
                  <p className="text-xs text-muted-foreground">Alterne entre o visual claro e escuro.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  <Switch
                    checked={mounted ? theme !== "light" : true}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    disabled={!mounted}
                  />
                  <Moon className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-accent/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-foreground">
                <BadgeCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Status da conta</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Email {user?.emailVerified ? "verificado" : "pendente de verificação"}
              </p>
            </div>
          </section>
        </div>

        <section className="bento-card p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-foreground">Limites do plano</h2>
              <p className="text-sm text-muted-foreground">Uso atual sincronizado com sua conta.</p>
            </div>
            <span className="text-xs text-muted-foreground">Histórico: {formatLimitValue(limits.historyDays, " dias")}</span>
          </div>

          {usageLoading && !usage ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {resources.map((resource) => {
                const unlimited = resource.max === -1;
                const percent = unlimited ? 100 : Math.min((resource.current / resource.max) * 100, 100);

                return (
                  <div key={resource.label} className="rounded-xl border border-border bg-accent/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{resource.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {unlimited ? "Ilimitado" : `${resource.current.toFixed(resource.suffix ? 1 : 0)} / ${resource.max}${resource.suffix ?? ""}`}
                      </span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { subscriptionApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PLAN_LIMITS, type Plan } from "@/types";
import { Loader2, Crown, Zap, Rocket, Gem, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";

const planMeta: Record<string, { icon: any; color: string }> = {
  FREE: { icon: Crown, color: "text-muted-foreground" },
  PLUS: { icon: Zap, color: "text-primary" },
  PRO: { icon: Rocket, color: "text-warning" },
  GOLD: { icon: Gem, color: "text-warning" },
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface SubInfo { plan: string; status: string; currentPeriodEnd?: string; }

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => { subscriptionApi.me().then(({ data }) => setSub(data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const { data } = await subscriptionApi.checkout(planId);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.response?.data?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = async () => {
    try { await subscriptionApi.cancel(); toast({ title: "Assinatura cancelada" }); const { data } = await subscriptionApi.me(); setSub(data); }
    catch { toast({ title: "Erro ao cancelar", variant: "destructive" }); }
  };

  const currentPlan = (user?.plan as Plan) || "FREE";
  const allPlans: Plan[] = ["FREE", "PLUS", "PRO", "GOLD"];
  const formatLimit = (val: number, suffix = "") => val === -1 ? "Ilimitado" : `${val}${suffix}`;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Assinatura</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seu plano e limites</p>
        </div>

        {sub && (
          <div className="bento-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => { const M = planMeta[currentPlan]; const I = M.icon; return <I className={cn("w-5 h-5", M.color)} />; })()}
                <div>
                  <p className="font-semibold text-foreground">Plano <span className="text-primary">{currentPlan}</span></p>
                  <p className="text-xs text-muted-foreground">
                    Status: {sub.status} {sub.currentPeriodEnd && `· Renova em ${new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              {currentPlan !== "FREE" && (
                <Button variant="outline" size="sm" onClick={handleCancel} className="border-border/50 text-muted-foreground hover:text-foreground">Cancelar</Button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {allPlans.map((plan) => {
              const limits = PLAN_LIMITS[plan];
              const meta = planMeta[plan];
              const Icon = meta.icon;
              const isCurrent = plan === currentPlan;
              const prices: Record<Plan, string> = { FREE: "Grátis", PLUS: "R$ 19,90/mês", PRO: "R$ 39,90/mês", GOLD: "R$ 79,90/mês" };
              return (
                <div key={plan} className={cn("bento-card p-5 space-y-4", isCurrent && "border-primary/30")}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", meta.color)} />
                    <span className="font-semibold text-foreground">{plan}</span>
                  </div>
                  <p className="text-xl font-display font-bold text-foreground">{prices[plan]}</p>
                  <ul className="space-y-2 text-sm">
                    {[
                      `${formatLimit(limits.maxEntities)} entidades`,
                      `${formatLimit(limits.maxNotes)} notas`,
                      `${formatLimit(limits.maxHabits)} hábitos`,
                      `${formatLimit(limits.historyDays, " dias")} histórico`,
                      `${formatLimit(limits.maxVaultSizeMB, "MB")} Vault`,
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" size="sm" disabled>Plano Atual</Button>
                  ) : plan === "FREE" ? (
                    <Button variant="outline" className="w-full border-border/50" size="sm" disabled>Plano Base</Button>
                  ) : (
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="sm" onClick={() => handleCheckout(plan)} disabled={!!checkoutLoading}>
                      {checkoutLoading === plan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assinar"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

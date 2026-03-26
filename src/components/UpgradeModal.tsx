import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { subscriptionApi } from "@/lib/api";
import { Loader2, Crown, Zap, Rocket, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

const plans = [
  {
    id: "PLUS",
    name: "Plus",
    price: "R$ 19,90/mês",
    icon: Zap,
    color: "text-info",
    features: ["100 entidades", "500 notas", "10 hábitos", "180 dias de histórico", "1GB Vault"],
  },
  {
    id: "PRO",
    name: "Pro",
    icon: Rocket,
    price: "R$ 39,90/mês",
    color: "text-warning",
    popular: true,
    features: ["Entidades ilimitadas", "Notas ilimitadas", "Hábitos ilimitados", "2 anos de histórico", "2GB Vault"],
  },
  {
    id: "GOLD",
    name: "Gold",
    icon: Gem,
    price: "R$ 79,90/mês",
    color: "text-yellow-400",
    features: ["Tudo ilimitado", "4GB Vault", "Suporte prioritário", "Acesso antecipado"],
  },
];

export default function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { data } = await subscriptionApi.createSession(planId);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-warning" />
            Faça upgrade do seu plano
          </DialogTitle>
          <DialogDescription>
            {reason || "Você atingiu o limite do seu plano atual. Faça upgrade para continuar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={cn(
                  "bento-card p-4 space-y-3 relative",
                  plan.popular && "ring-1 ring-warning/50"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-warning text-warning-foreground px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", plan.color)} />
                  <span className="font-semibold text-foreground text-sm">{plan.name}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{plan.price}</p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-success mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  size="sm"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!loadingPlan}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Assinar"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

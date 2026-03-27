import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens, refreshUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      toast({ title: "Código OAuth não encontrado", variant: "destructive" });
      navigate("/login");
      return;
    }

    authApi
      .googleCallback(code)
      .then(async ({ data }) => {
        setTokens(data.accessToken, data.refreshToken);
        await refreshUser();
        navigate("/");
      })
      .catch((err) => {
        toast({
          title: "Erro na autenticação Google",
          description: err.response?.data?.message || "Tente novamente",
          variant: "destructive",
        });
        navigate("/login");
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Autenticando com Google...</p>
      </div>
    </div>
  );
}

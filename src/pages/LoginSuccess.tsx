import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const vaultId = searchParams.get("vaultId");

    if (!token) {
      setError("Token não fornecido");
      setLoading(false);
      setTimeout(() => navigate("/", { replace: true }), 2000);
      return;
    }

    try {
      // Armazenar tokens
      localStorage.setItem("access_token", token);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }
      if (vaultId) {
        localStorage.setItem("vaultId", vaultId);
      }

      // Usar o setTokens do contexto para sincronizar
      if (typeof setTokens === 'function') {
        setTokens(token, refreshToken || "");
      }

      // Pequeno delay para mostrar o loading
      setTimeout(() => {
        setLoading(false);
        navigate("/", { replace: true });
      }, 500);
    } catch (err) {
      console.error("Erro ao processar token de sucesso:", err);
      setError("Erro ao processar autenticação");
      setLoading(false);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
  }, [searchParams, navigate, setTokens]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Finalizando autenticação...</p>
      </div>
    </div>
  );
};

export default LoginSuccess;
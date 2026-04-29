import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const vaultId = searchParams.get("vaultId");

    setDebugInfo(`Token: ${token ? 'present' : 'missing'}, RefreshToken: ${refreshToken ? 'present' : 'missing'}, VaultId: ${vaultId || 'none'}`);

    if (!token) {
      setError("Token de autenticação não encontrado nos parâmetros da URL. Verifique se o login foi concluído corretamente.");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 3000);
      return;
    }

    try {
      localStorage.setItem("access_token", token);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }
      if (vaultId) {
        localStorage.setItem("vaultId", vaultId);
      }

      // Pequeno delay para mostrar o loading
      setTimeout(() => {
        setLoading(false);
        navigate("/", { replace: true });
      }, 1000);
    } catch (err) {
      setError("Erro ao salvar dados de autenticação. Verifique as permissões do navegador.");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 3000);
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-sm">
            <p>Erro: {error}</p>
            <p className="text-xs text-muted-foreground mt-2">Debug: {debugInfo}</p>
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Redirecionando em alguns segundos...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Processando autenticação...</p>
          <p className="text-xs text-muted-foreground">{debugInfo}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginSuccess;
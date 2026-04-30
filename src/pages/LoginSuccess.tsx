import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const LoginSuccess = () => {
  const navigate = useNavigate();
  const { setTokens, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rawHash = window.location.hash.replace(/^#/, "");
    const hashQuery = rawHash.startsWith("/") ? rawHash.slice(1) : rawHash;
    const hashParams = new URLSearchParams(hashQuery);
    const getValue = (key: string) => searchParams.get(key) ?? hashParams.get(key);

    const accessToken = getValue("access_token") ?? getValue("login_token") ?? getValue("token") ?? getValue("jwt");
    const refreshToken = getValue("refresh_token");
    const vaultId = getValue("vault_id") ?? getValue("vaultId");

    setDebugInfo(`Token: ${accessToken ? "present" : "missing"}, VaultId: ${vaultId || "none"}`);

    if (!accessToken) {
      setError("Token de autenticação não encontrado nos parâmetros da URL. Verifique se o login foi concluído corretamente.");
      setTimeout(() => navigate("/", { replace: true }), 3000);
      return;
    }

    try {
      setTokens(accessToken, refreshToken || "");
      if (vaultId) {
        localStorage.setItem("vaultId", vaultId);
      }

      window.history.replaceState({}, "", "/");

      refreshUser()
        .then(() => navigate("/", { replace: true }))
        .catch(() => navigate("/", { replace: true }))
        .finally(() => setLoading(false));
    } catch (err) {
      setError("Erro ao salvar dados de autenticação. Verifique as permissões do navegador.");
      setTimeout(() => navigate("/", { replace: true }), 3000);
    }
  }, [navigate, refreshUser, setTokens]);

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
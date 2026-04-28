import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get("token");
    const vaultId = searchParams.get("vaultId");

    if (token) {
      localStorage.setItem("access_token", token);
      if (vaultId) {
        localStorage.setItem("vaultId", vaultId);
      }
    }

    // Pequeno delay para mostrar o loading
    setTimeout(() => {
      setLoading(false);
      navigate("/", { replace: true });
    }, 1000);
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Autenticando...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginSuccess;
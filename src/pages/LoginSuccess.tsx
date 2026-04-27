import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const vaultId = searchParams.get("vaultId");

    if (token) {
      localStorage.setItem("access_token", token);
      if (vaultId) {
        localStorage.setItem("vaultId", vaultId);
      }
      
      // Redirect immediately
      navigate("/", { replace: true });
    } else {
      // Se não tem token, vai direto pra home
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  // While redirecting, show loading
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  );
};

export default LoginSuccess;
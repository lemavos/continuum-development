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
    const parseRedirectTokens = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const getValue = (key: string) => searchParams.get(key) ?? hashParams.get(key);

      return {
        accessToken: getValue("access_token") ?? getValue("token") ?? getValue("jwt"),
        refreshToken: getValue("refresh_token"),
        code: getValue("code"),
        state: getValue("state"),
      };
    };

    const { accessToken, refreshToken, code, state } = parseRedirectTokens();

    if (accessToken) {
      setTokens(accessToken, refreshToken || "");
      window.history.replaceState({}, "", "/");
      refreshUser()
        .then(() => navigate("/"))
        .catch(() => navigate("/"));
      return;
    }

    if (!code) {
      toast({ title: "OAuth code not found", variant: "destructive" });
      navigate("/");
      return;
    }

    authApi
      .googleCallback(code, state)
      .then(async ({ data }) => {
        setTokens(data.accessToken, data.refreshToken);
        await refreshUser();
        navigate("/");
      })
      .catch((err) => {
        toast({
          title: "Error authenticating with Google",
          description: err.response?.data?.message || "Try again",
          variant: "destructive",
        });
        navigate("/");
      });
  }, [navigate, refreshUser, setTokens, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Authenticating with Google...</p>
      </div>
    </div>
  );
}

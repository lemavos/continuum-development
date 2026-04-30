import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { Plan } from "@/types";

// Lê em tempo de execução, não de build
const getAPIBaseURL = () => {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "http://localhost:8080")
  );
};

interface User {
  id: string;
  username: string;
  email: string;
  plan: Plan;
  emailVerified: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data } = await authApi.me();
      if (data) {
        setUser({
          id: data.id ?? data.userId,
          username: data.username ?? data.name ?? "",
          email: data.email ?? "",
          plan: data.plan ?? data.effectivePlan ?? "FREE",
          emailVerified: data.emailVerified ?? true,
          createdAt: data.createdAt,
        });
      }
    } catch (error: unknown) {
      if ([401, 403].includes((error as any)?.response?.status)) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
  };

  const login = async (email: string, password: string) => {
    const API_BASE_URL = getAPIBaseURL();
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  };

  const register = async (username: string, email: string, password: string) => {
    await authApi.register(username, email, password);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setTokens, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

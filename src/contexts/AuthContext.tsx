import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { Plan } from "@/types";

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
          ...data,
          id: data.id ?? data.userId,
          username: data.username ?? data.name ?? "",
          createdAt: data.createdAt,
        });
      }
    } catch (error: unknown) {
      if ((error as any)?.response?.status === 401) {
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
    const { data } = await authApi.login(email, password);
    setTokens(data.accessToken, data.refreshToken);
    // Use user data directly from login response, prefer backend id field
    setUser({
      id: data.id ?? data.userId,
      username: data.username ?? data.name ?? "",
      email: data.email,
      plan: data.plan || "FREE",
      emailVerified: data.emailVerified ?? true,
      createdAt: data.createdAt,
    });
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

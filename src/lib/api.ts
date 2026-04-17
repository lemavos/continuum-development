import axios from "axios";
import { parseTiptapContent } from "@/lib/tiptap-content";

// Lê em tempo de execução, não de build
const getAPIBaseURL = () => {
  return import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');
};

const API_BASE_URL = getAPIBaseURL();

export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

export const setAuthTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearAuthTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const parseTokensFromUrl = () => {
  if (typeof window === "undefined") return null;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const getValue = (key: string) => searchParams.get(key) ?? hashParams.get(key);
  const accessToken = getValue("access_token") ?? getValue("token") ?? getValue("jwt");
  const refreshToken = getValue("refresh_token");

  if (!accessToken) return null;

  return { accessToken, refreshToken };
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeNoteContent = (content: unknown) => parseTiptapContent(content);

const normalizeSearchResults = (payload: unknown) => {
  if (!isRecord(payload)) {
    return [];
  }

  const notes = Array.isArray(payload.notes) ? payload.notes : [];
  const entities = Array.isArray(payload.entities) ? payload.entities : [];

  return [
    ...notes.flatMap((note) =>
      isRecord(note) && typeof note.id === "string" && typeof note.title === "string"
        ? [{ id: note.id, type: "NOTE" as const, title: note.title }]
        : []
    ),
    ...entities.flatMap((entity) =>
      isRecord(entity) && typeof entity.id === "string" && typeof entity.title === "string"
        ? [{
            id: entity.id,
            type: "ENTITY" as const,
            title: entity.title,
            snippet: typeof entity.description === "string" ? entity.description : undefined,
          }]
        : []
    ),
  ];
};

const buildTrackPayload = (data?: { date?: string; value?: number; decimalValue?: number; note?: string }) => {
  if (data && Object.values(data).some((value) => value !== undefined && value !== "")) {
    return data;
  }

  return {
    date: new Date().toISOString().slice(0, 10),
  };
};

// Interceptor: attach JWT (skip only login and registration endpoints)
api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const skipAuth =
    url === "/api/auth/login" ||
    url === "/api/auth/register" ||
    url === "/api/auth/refresh" ||
    url === "/api/auth/google/callback";
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor: refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if ((error.response?.status === 401 || error.response?.status === 403) && !original._retry) {
      original._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });
          setAuthTokens(data.accessToken, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          // Refresh failed — clear and redirect
        }
      }
      clearAuthTokens();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  register: (username: string, email: string, password: string) =>
    api.post("/api/auth/register", { username, email, password }),
  googleCallback: (code: string) =>
    api.post("/api/auth/google/callback", { code }),
  logout: () => {
    const refreshToken = localStorage.getItem("refresh_token");
    return api.post("/api/auth/logout", { refreshToken });
  },
  me: () => api.get("/api/auth/me"),
  updateMe: (data: Record<string, string>) => api.patch("/api/account/me", data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/account/password/change", { currentPassword, newPassword }),
  forgotPassword: (email: string) =>
    api.post("/api/account/password/forgot", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/api/account/password/reset", { token, password }),
  verifyEmail: (token: string) =>
    api.get("/api/auth/verify-email", { params: { token } }),
  resendVerification: (email: string) =>
    api.post("/api/auth/resend-verification", { email }),
  exportData: () => api.get("/api/account/export"),
};

// Notes
export const notesApi = {
  list: () => api.get("/api/notes"),
  get: (id: string) => api.get(`/api/notes/${id}`),
  create: (title: string, content: unknown, folderId?: string, _entityIds?: string[], type?: string) =>
    api.post("/api/notes", {
      title,
      content: normalizeNoteContent(content),
      folderId,
      type,
    }),
  update: (id: string, data: { title?: string; content?: unknown; folderId?: string; entityIds?: string[]; type?: string }) => {
    const payload: Record<string, unknown> = {};

    if (typeof data.title === "string") {
      payload.title = data.title;
    }

    if (typeof data.folderId === "string") {
      payload.folderId = data.folderId;
    }

    if (typeof data.type === "string") {
      payload.type = data.type;
    }

    if (Object.prototype.hasOwnProperty.call(data, "content")) {
      payload.content = normalizeNoteContent(data.content);
    }

    return api.put(`/api/notes/${id}`, payload);
  },
  delete: (id: string) => api.delete(`/api/notes/${id}`),
  getBacklinks: (id: string) => api.get(`/api/notes/${id}/backlinks`),
  getTypes: () => api.get("/api/notes/types"),
};

// Folders
export const foldersApi = {
  list: () => api.get("/api/folders"),
  create: (name: string, parentId?: string) =>
    api.post("/api/folders", { name, parentId }),
  rename: (id: string, name: string) =>
    api.patch(`/api/folders/${id}/rename`, { name }),
  delete: (id: string) => api.delete(`/api/folders/${id}`),
};

// Entities
export const entitiesApi = {
  list: () => api.get("/api/entities"),
  get: (id: string) => api.get(`/api/entities/${id}`),
  create: (title: string, type: string, description?: string) =>
    api.post("/api/entities", { title, type, description }),
  update: (id: string, data: { title?: string; type?: string; description?: string }) =>
    api.put(`/api/entities/${id}`, data),
  delete: (id: string) => api.delete(`/api/entities/${id}`),
  getNotes: (id: string) => api.get(`/api/entities/${id}/notes`),
  getConnections: (id: string) => api.get(`/api/entities/${id}/connections`),
  getContext: (id: string) => api.get(`/api/entities/${id}/context`),
  track: (entityId: string) =>
    api.post(`/api/entities/${entityId}/track-habit`),
  untrack: (entityId: string, date: string) =>
    api.delete(`/api/entities/${entityId}/track`, { params: { date } }),
  stats: (entityId: string) => api.get(`/api/entities/${entityId}/stats`),
  heatmap: (entityId: string, from?: string, to?: string) =>
    api.get(`/api/entities/${entityId}/heatmap`, { params: { from, to } }),
};

// Metrics
export const metricsApi = {
  dashboard: () => api.get("/api/metrics/dashboard"),
  timeline: (entityId: string) => api.get(`/api/metrics/entities/${entityId}/timeline`),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get("/api/dashboard/summary"),
};

// Search
export const searchApi = {
  search: (q: string) =>
    api.get("/api/search", { params: { q } }).then((response) => {
      response.data = normalizeSearchResults(response.data);
      return response;
    }),
};

// Graph
export const graphApi = {
  data: () => api.get("/api/graph/data"),
};

// Tracking
export const trackingApi = {
  today: () => api.get("/api/tracking/today"),
};

// Subscription
export const subscriptionApi = {
  me: () => api.get("/api/subscriptions/me"),
  checkout: (planId: string) => api.post("/api/subscriptions/checkout", { planId }),
  cancel: () => api.post("/api/subscriptions/cancel"),
};

// Plans
export const plansApi = {
  list: () => api.get("/api/plans"),
};

// Vault
export const vaultApi = {
  list: () => api.get("/api/vault/files"),
  entityIndex: () => api.get("/api/vault/entity-index"),
};

export default api;

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor: attach JWT (skip auth endpoints)
api.interceptors.request.use((config) => {
  const isAuthRoute = config.url?.startsWith("/api/auth/");
  if (!isAuthRoute) {
    const token = localStorage.getItem("access_token");
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
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem("access_token", data.accessToken);
          localStorage.setItem("refresh_token", data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          // Refresh failed — clear and redirect
        }
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
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
  create: (title: string, content: string, folderId?: string, relatedEntityIds?: string[]) =>
    api.post("/api/notes", { title, content, folderId, relatedEntityIds: relatedEntityIds || [] }),
  update: (id: string, data: { title?: string; content?: string; folderId?: string; entityIds?: string[] }) =>
    api.put(`/api/notes/${id}`, { 
      ...data,
      relatedEntityIds: data.entityIds || [],
    }),
  delete: (id: string) => api.delete(`/api/notes/${id}`),
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
  track: (entityId: string, data?: { date?: string; value?: number; decimalValue?: number; note?: string }) =>
    api.post(`/api/entities/${entityId}/track`, data || {}),
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

// Search
export const searchApi = {
  search: (q: string) => api.get("/api/search", { params: { q } }),
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

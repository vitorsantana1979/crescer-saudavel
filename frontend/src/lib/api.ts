import axios from "axios";

export interface AuthInfo {
  token: string;
  roles: string[];
  tenantId?: string;
  tenantIds: string[];
  grupoSaudeId?: string;
  nome?: string;
  email?: string;
  principalTenantId?: string;
}

const AUTH_STORAGE_KEY = "auth-info";

// const baseURL = "http://localhost:5001/api";

const baseURL = import.meta.env.VITE_API_BASE || "/api";

export const api = axios.create({
  baseURL,
});

export const loadAuth = (): AuthInfo | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthInfo;
  } catch {
    return null;
  }
};

export const saveAuth = (auth: AuthInfo | null) => {
  if (!auth) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem("token");
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  localStorage.setItem("token", auth.token);
};

export const clearAuth = () => saveAuth(null);

api.interceptors.request.use((config) => {
  const auth = loadAuth();
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  if (auth?.tenantId) {
    config.headers["X-Tenant-Id"] = auth.tenantId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/") {
      clearAuth();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;

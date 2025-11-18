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

// Determinar a URL base da API
function getApiBaseURL(): string {
  // Se VITE_API_BASE estiver definida, usar ela
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  // Detectar se está em produção
  const isProduction = 
    window.location.protocol === "https:" || 
    !window.location.hostname.includes("localhost") ||
    import.meta.env.PROD;

  // Em produção, usar URL relativa (será roteada pelo Caddy)
  if (isProduction) {
    return "/api";
  }

  // Em desenvolvimento, usar localhost
  return "http://localhost:5280/api";
}

const baseURL = getApiBaseURL();

console.log("[API Config] baseURL configurado:", baseURL);
console.log("[API Config] VITE_API_BASE:", import.meta.env.VITE_API_BASE);
console.log("[API Config] window.location.origin:", window.location.origin);
console.log("[API Config] Ambiente detectado:", import.meta.env.PROD ? "produção" : "desenvolvimento");

export const api = axios.create({
  baseURL,
  timeout: 30000, // 30 segundos
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
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  
  // Não adicionar token/tenantId para a rota de login
  const isLoginRoute = config.url?.includes('/auth/login');
  
  if (!isLoginRoute) {
    const auth = loadAuth();
    if (auth?.token) {
      config.headers.Authorization = `Bearer ${auth.token}`;
      console.log(`[API Request] Token adicionado ao header`);
    }
    if (auth?.tenantId) {
      config.headers["X-Tenant-Id"] = auth.tenantId;
      console.log(`[API Request] TenantId adicionado: ${auth.tenantId}`);
    }
  } else {
    console.log(`[API Request] Rota de login detectada - não adicionando token`);
  }
  
  console.log(`[API Request] Headers:`, config.headers);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API Response Error] ${error.response?.status || "NO STATUS"} ${error.config?.url}`);
    if (error.response?.status === 401 && window.location.pathname !== "/") {
      console.log("[API Response] 401 Unauthorized - limpando auth e redirecionando");
      clearAuth();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;

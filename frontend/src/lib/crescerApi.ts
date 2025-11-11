import axios from "axios";

export const crescerApi = axios.create({
  baseURL: import.meta.env.VITE_CRESCER_API_URL || "https://stock.menthor.app/api",
});

// Interceptor para adicionar token nas requisições
crescerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
crescerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Só redireciona se não estiver na página de login
    if (error.response?.status === 401 && window.location.pathname !== "/") {
      // Token inválido ou expirado - redirecionar para login
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);



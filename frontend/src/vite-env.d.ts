/// <reference types="vite/client" />

// Estender as variáveis de ambiente do Vite
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}


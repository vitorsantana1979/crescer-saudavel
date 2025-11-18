import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthInfo, clearAuth, loadAuth, saveAuth } from "@/lib/api";

type AuthContextValue = {
  auth: AuthInfo | null;
  setAuth: (value: AuthInfo | null) => void;
  activeTenantId?: string;
  setActiveTenantId: (tenantId: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthInfo | null>(() => loadAuth());
  const [activeTenantId, setActiveTenantIdState] = useState<string | undefined>(() => {
    const info = loadAuth();
    return info?.tenantId || info?.principalTenantId || info?.tenantIds?.[0];
  });

  useEffect(() => {
    if (!auth) {
      setActiveTenantIdState(undefined);
      return;
    }

    const preferred =
      auth.tenantId || auth.principalTenantId || auth.tenantIds?.[0];

    if (preferred && preferred !== activeTenantId) {
      setActiveTenantIdState(preferred);
    } else if (!preferred && activeTenantId) {
      setActiveTenantIdState(undefined);
    }
  }, [auth, activeTenantId]);

  const setAuth = (value: AuthInfo | null) => {
    console.log("=== AuthContext.setAuth CHAMADO ===");
    console.log("Valor recebido:", value ? {
      token: value.token ? `${value.token.substring(0, 20)}...` : "NULL",
      nome: value.nome,
      email: value.email,
      tenantId: value.tenantId,
      roles: value.roles,
    } : "NULL");
    
    console.log("Atualizando estado do React...");
    setAuthState(value);
    
    console.log("Salvando no localStorage...");
    saveAuth(value);
    
    console.log("Verificando se foi salvo...");
    const verificado = localStorage.getItem("auth-info");
    console.log("Auth no localStorage após salvar:", verificado ? "PRESENTE" : "AUSENTE");
    
    if (verificado && value) {
      try {
        const parsed = JSON.parse(verificado);
        console.log("Auth verificado:", {
          token: parsed.token ? `${parsed.token.substring(0, 20)}...` : "NULL",
          nome: parsed.nome,
        });
      } catch (e) {
        console.error("Erro ao verificar auth salvo:", e);
      }
    }
    
    console.log("=== AuthContext.setAuth CONCLUÍDO ===");
  };

  const setActiveTenantId = (tenantId: string) => {
    setActiveTenantIdState(tenantId);
    if (!auth) return;
    const updated: AuthInfo = {
      ...auth,
      tenantId,
      principalTenantId: tenantId,
    };
    setAuthState(updated);
    saveAuth(updated);
  };

  const logout = () => {
    clearAuth();
    setAuthState(null);
    setActiveTenantIdState(undefined);
  };

  const value = useMemo(
    () => ({ auth, setAuth, activeTenantId, setActiveTenantId, logout }),
    [auth, activeTenantId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

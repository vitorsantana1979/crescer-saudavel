import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { loadAuth } from "@/lib/api";

export default function RequireAuth({
  children,
}: {
  children: React.ReactElement;
}) {
  const { auth } = useAuth();
  const location = useLocation();

  // Verificar tanto no estado quanto no localStorage para evitar problemas de timing
  const authFromStorage = loadAuth();
  const hasAuth = auth?.token || authFromStorage?.token;

  if (!hasAuth) {
    console.log("RequireAuth: Sem autenticação, redirecionando para login", {
      authState: auth,
      authStorage: authFromStorage,
    });
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

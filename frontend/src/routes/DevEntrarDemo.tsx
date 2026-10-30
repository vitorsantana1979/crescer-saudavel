import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Só em `vite dev`: grava um token fictício (o backend de desenvolvimento é o mock local, que não
// valida token) e redireciona — permite abrir telas protegidas em capturas e no Chrome headless.
// Rota: /dev/entrar-demo?para=/criancas/demo-helena/relatorio

export default function DevEntrarDemo() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(
      "auth-info",
      JSON.stringify({ token: "dev-mock-sem-validade", roles: ["Admin"], tenantIds: ["demo"], tenantId: "demo", nome: "Equipe (demonstração)" })
    );
    const destino = params.get("para");
    navigate(destino && destino.startsWith("/") ? destino : "/dashboard", { replace: true });
  }, [navigate, params]);

  return null;
}

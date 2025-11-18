import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { AuthInfo } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../lib/errorHandler";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const handleLogin = async () => {
    if (!email || !senha) {
      toast.error("Por favor, preencha o e-mail e a senha para continuar.", {
        duration: 4000,
      });
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Por favor, insira um e-mail válido.", {
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      console.log("=== INÍCIO DO LOGIN ===");
      console.log("Email:", email);
      console.log("Senha presente:", !!senha);
      console.log("URL da API:", api.defaults.baseURL);
      console.log("Endpoint completo:", `${api.defaults.baseURL}/auth/login`);
      console.log("URL completa da requisição:", `${window.location.origin}${api.defaults.baseURL}/auth/login`);
      console.log("VITE_API_BASE:", import.meta.env.VITE_API_BASE);
      console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
      
      const payload = { email, senha };
      console.log("Payload sendo enviado:", { email, senha: "***" });
      
      console.log("Fazendo requisição POST...");
      
      // Adicionar timeout e capturar erros de rede
      const res = await api.post("/auth/login", payload, {
        timeout: 10000, // 10 segundos
      }).catch((error) => {
        console.error("=== ERRO NA REQUISIÇÃO ===");
        console.error("Erro capturado:", error);
        throw error;
      });
      
      console.log("=== RESPOSTA RECEBIDA ===");
      console.log("Status:", res.status);
      console.log("Headers:", res.headers);
      console.log("Data completa:", res.data);
      console.log("Token presente:", !!res.data?.token);
      console.log("User presente:", !!res.data?.user);
      
      if (!res.data || !res.data.token) {
        console.error("=== ERRO: RESPOSTA INVÁLIDA ===");
        console.error("Resposta completa:", res.data);
        console.error("Token não encontrado na resposta");
        toast.error("Resposta inválida do servidor. Tente novamente.");
        setLoading(false);
        return;
      }

      console.log("=== CRIANDO AUTHINFO ===");
      const auth: AuthInfo = {
        token: res.data.token,
        roles: res.data.user?.roles ?? [],
        tenantId:
          res.data.user?.tenantId ??
          res.data.user?.principalTenantId ??
          undefined,
        tenantIds: res.data.user?.tenantIds ?? [],
        grupoSaudeId: res.data.user?.grupoSaudeId ?? undefined,
        nome: res.data.user?.nome,
        email: res.data.user?.email,
        principalTenantId:
          res.data.user?.principalTenantId ??
          res.data.user?.tenantId ??
          undefined,
      };
      
      console.log("AuthInfo criado:", {
        token: auth.token ? `${auth.token.substring(0, 20)}...` : "NULL",
        roles: auth.roles,
        tenantId: auth.tenantId,
        tenantIds: auth.tenantIds,
        nome: auth.nome,
        email: auth.email,
      });
      
      console.log("Chamando setAuth...");
      setAuth(auth);
      
      console.log("Verificando se auth foi salvo no localStorage...");
      const authVerificado = localStorage.getItem("auth-info");
      console.log("Auth no localStorage:", authVerificado ? "PRESENTE" : "AUSENTE");
      
      if (authVerificado) {
        try {
          const parsed = JSON.parse(authVerificado);
          console.log("Auth parseado do localStorage:", {
            token: parsed.token ? `${parsed.token.substring(0, 20)}...` : "NULL",
            nome: parsed.nome,
          });
        } catch (e) {
          console.error("Erro ao parsear auth do localStorage:", e);
        }
      }
      
      console.log("Navegando para dashboard...");
      toast.success(`Bem-vindo, ${auth.nome || "Usuário"}!`, {
        duration: 3000,
      });
      
      // Navegar após garantir que o auth foi salvo
      // O RequireAuth agora verifica o localStorage também
      navigate("/dashboard", { replace: true });
      console.log("=== LOGIN CONCLUÍDO ===");
    } catch (error: any) {
      console.error("=== ERRO NO LOGIN ===");
      console.error("Tipo do erro:", error?.constructor?.name);
      console.error("Mensagem:", error?.message);
      console.error("Stack:", error?.stack);
      
      if (error.response) {
        console.error("Resposta HTTP recebida:");
        console.error("  Status:", error.response.status);
        console.error("  Status Text:", error.response.statusText);
        console.error("  Headers:", error.response.headers);
        console.error("  Data:", error.response.data);
      } else if (error.request) {
        console.error("Requisição feita mas sem resposta:");
        console.error("  Request:", error.request);
        console.error("  Isso geralmente indica problema de CORS ou servidor offline");
      } else {
        console.error("Erro ao configurar a requisição:", error.message);
      }
      
      console.error("Config da requisição:", error?.config);
      console.error("====================");

      // Mensagem mais específica baseada no tipo de erro
      let message = getErrorMessage(error);

      // Melhorar mensagens específicas de login
      if (error.response?.status === 500) {
        const errorData = error.response?.data;
        if (errorData?.error) {
          console.error("Erro do servidor:", errorData.error);
          message = `Erro no servidor: ${errorData.error}`;
          if (errorData.innerException) {
            console.error("Exceção interna:", errorData.innerException);
          }
        } else {
          message = "Erro interno do servidor. Tente novamente mais tarde.";
        }
      } else if (message.includes("Credenciais inválidas")) {
        message =
          "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.";
      } else if (error.response?.status === 0 || !error.response) {
        message =
          "Não foi possível conectar ao servidor. Verifique se a API está rodando.";
      }

      toast.error(message, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-white">
      <div className="flex flex-col items-center">
        <img
          src="/logo_crescer_saudavel_vertical_512.png"
          alt="Crescer Saudável"
          className="h-80 mb-4 object-contain"
        />
      </div>
      <div className="bg-white shadow-lg p-2 rounded-2xl w-80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <input
            className="border border-gray-400 rounded-md p-2 mb-2 w-full bg-white text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            placeholder="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border border-gray-400 rounded-md p-2 mb-4 w-full bg-white text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: "#003366", color: "#ffffff" }}
            className={`hover:bg-[#002244] rounded-md w-full p-2 transition-colors ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Teste: medico@hospital.com</p>
          <p>Senha: 123456</p>
        </div>
      </div>
    </div>
  );
}

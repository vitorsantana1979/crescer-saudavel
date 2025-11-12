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
      console.log("Tentando fazer login...", { email });
      const res = await api.post("/auth/login", { email, senha });
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
      setAuth(auth);
      toast.success(`Bem-vindo, ${auth.nome || "Usuário"}!`, {
        duration: 3000,
      });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Erro no login:", error);
      console.error("Detalhes do erro:", error.response?.data);

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

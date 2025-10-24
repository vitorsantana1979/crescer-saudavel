import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", { email, senha });
      localStorage.setItem("token", res.data.token);
      navigate("/acompanhamento");
    } catch {
      alert("Credenciais inválidas");
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-100 to-white">
      <h1 className="text-3xl font-bold mb-6">Crescer Saudável</h1>
      <div className="bg-white shadow-lg p-6 rounded-2xl w-80">
        <input
          className="border rounded-md p-2 mb-2 w-full"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border rounded-md p-2 mb-4 w-full"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <button
          className="bg-green-600 hover:bg-green-700 text-white rounded-md w-full p-2"
          onClick={handleLogin}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Users, Search, Calendar, Weight, TrendingUp } from "lucide-react";

interface Crianca {
  id: string;
  nome: string;
  sexo: string;
  dataNascimento: string;
  idadeGestacionalSemanas: number;
  pesoNascimentoGr: number;
}

export default function Pacientes() {
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadCriancas();
  }, []);

  const loadCriancas = async () => {
    try {
      const response = await api.get("/recemnascido");
      setCriancas(response.data);
    } catch (error) {
      console.error("Erro ao carregar crianças:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCriancas = criancas.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const diffMs = hoje.getTime() - nascimento.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 30) {
      return `${diffDias} dias`;
    } else if (diffDias < 365) {
      const meses = Math.floor(diffDias / 30);
      return `${meses} ${meses === 1 ? "mês" : "meses"}`;
    } else {
      const anos = Math.floor(diffDias / 365);
      const meses = Math.floor((diffDias % 365) / 30);
      return `${anos} ${anos === 1 ? "ano" : "anos"}${
        meses > 0 ? ` e ${meses} ${meses === 1 ? "mês" : "meses"}` : ""
      }`;
    }
  };

  const isPreTermo = (semanas: number) => semanas < 37;

  return (
    <div>
      <PageHeader
        title="Prontuários"
        subtitle="Acesso rápido aos dados dos pacientes"
        icon={Users}
      />

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar paciente por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none text-lg"
            autoFocus
          />
        </div>
      </div>

      {/* Cards de Pacientes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredCriancas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">
            {searchTerm
              ? "Nenhum paciente encontrado"
              : "Nenhum paciente cadastrado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCriancas.map((crianca) => (
            <button
              key={crianca.id}
              onClick={() => navigate(`/criancas/detalhes/${crianca.id}`)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {crianca.nome}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {crianca.sexo === "M" ? "Masculino" : "Feminino"}
                  </p>
                </div>
                {isPreTermo(crianca.idadeGestacionalSemanas) ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                    Pré-termo
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    A termo
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{calcularIdade(crianca.dataNascimento)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>IG: {crianca.idadeGestacionalSemanas} semanas</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Weight className="w-4 h-4" />
                  <span>
                    Peso ao nascer:{" "}
                    {crianca.pesoNascimentoGr?.toLocaleString("pt-BR")} g
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}









import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import {
  Baby,
  Plus,
  Search,
  Edit,
  Trash2,
  Apple,
  Activity,
  Eye,
} from "lucide-react";

interface Crianca {
  id: string;
  nome: string;
  sexo: string;
  dataNascimento: string;
  idadeGestacionalSemanas: number;
  pesoNascimentoGr: number;
}

export default function Criancas() {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      await api.delete(`/recemnascido/${id}`);
      toast.success("Registro excluído com sucesso!");
      loadCriancas();
    } catch (error) {
      toast.error("Erro ao excluir registro");
    }
  };

  const filteredCriancas = criancas.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isPreTermo = (semanas: number) => semanas < 37;

  return (
    <div>
      <PageHeader
        title="Crianças"
        subtitle="Gestão de recém-nascidos em acompanhamento"
        icon={Baby}
        action={{
          label: "Nova Criança",
          onClick: () => navigate("/criancas/novo"),
          icon: Plus,
        }}
      />

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : filteredCriancas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Baby className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma criança cadastrada</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sexo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Nasc.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IG (sem)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso (g)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCriancas.map((crianca) => (
                <tr key={crianca.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        navigate(`/criancas/detalhes/${crianca.id}`)
                      }
                      className="text-sm font-medium text-blue-600 hover:text-blue-900 hover:underline text-left"
                    >
                      {crianca.nome}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {crianca.sexo === "M" ? "Masculino" : "Feminino"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(crianca.dataNascimento).toLocaleDateString(
                      "pt-BR"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {crianca.idadeGestacionalSemanas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {crianca.pesoNascimentoGr?.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isPreTermo(crianca.idadeGestacionalSemanas) ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        Pré-termo
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        A termo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          navigate(`/criancas/detalhes/${crianca.id}`)
                        }
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                        title="Ver Prontuário"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/criancas/${crianca.id}/consulta/nova`)
                        }
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Nova Consulta"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/criancas/${crianca.id}/dieta/nova`)
                        }
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                        title="Nova Dietoterapia"
                      >
                        <Apple className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/criancas/editar/${crianca.id}`)
                        }
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(crianca.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

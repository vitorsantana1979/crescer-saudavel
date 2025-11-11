import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Apple, Plus, Search, Edit, Trash2 } from "lucide-react";

interface Alimento {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  energiaKcalPor100: number;
  proteinaGPor100: number;
}

export default function Alimentos() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadAlimentos();
  }, []);

  const loadAlimentos = async () => {
    try {
      const response = await api.get("/alimentos");
      setAlimentos(response.data);
    } catch (error) {
      console.error("Erro ao carregar alimentos:", error);
      setAlimentos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este alimento?")) return;

    try {
      await api.delete(`/alimentos/${id}`);
      toast.success("Alimento excluído com sucesso!");
      loadAlimentos();
    } catch (error) {
      toast.error("Erro ao excluir alimento");
    }
  };

  const filteredAlimentos = alimentos.filter((a) =>
    a.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Alimentos"
        subtitle="Cadastro de alimentos para dietas"
        icon={Apple}
        action={{
          label: "Novo Alimento",
          onClick: () => navigate("/alimentos/novo"),
          icon: Plus,
        }}
      />

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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : filteredAlimentos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Apple className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum alimento cadastrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unidade
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Energia (kcal/100)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Proteína (g/100)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAlimentos.map((alimento) => (
                <tr key={alimento.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {alimento.nome}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                    {alimento.categoria}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {alimento.unidade}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {alimento.energiaKcalPor100.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {alimento.proteinaGPor100.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/alimentos/${alimento.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(alimento.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
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

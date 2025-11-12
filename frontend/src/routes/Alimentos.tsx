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
  idadeMinimaSemanas?: number | null;
  idadeMaximaSemanas?: number | null;
  ehPreTermo?: boolean;
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
            className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredAlimentos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Apple className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum alimento cadastrado</p>
          </div>
        ) : (
          <>
            {/* Tabela para desktop/tablet */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px]">
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Idade (semanas)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Pré-termo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-auto whitespace-nowrap">
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
                  <td className="px-6 py-4 text-sm text-gray-500 text-center">
                    {(alimento.idadeMinimaSemanas !== null && alimento.idadeMinimaSemanas !== undefined) || 
                     (alimento.idadeMaximaSemanas !== null && alimento.idadeMaximaSemanas !== undefined)
                      ? `${alimento.idadeMinimaSemanas ?? 0}-${alimento.idadeMaximaSemanas ?? "∞"} sem`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center">
                    {alimento.ehPreTermo ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Sim
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium w-auto whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/alimentos/${alimento.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(alimento.id)}
                        className="text-red-600 hover:text-red-900"
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
            </div>

            {/* Cards para mobile */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredAlimentos.map((alimento) => (
                <div key={alimento.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {alimento.nome}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="capitalize">{alimento.categoria}</span>
                        <span>•</span>
                        <span>{alimento.unidade}</span>
                        {alimento.ehPreTermo && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Pré-termo
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => navigate(`/alimentos/${alimento.id}`)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(alimento.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Energia:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {alimento.energiaKcalPor100.toFixed(1)} kcal/100
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Proteína:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {alimento.proteinaGPor100.toFixed(1)} g/100
                      </span>
                    </div>
                    {(alimento.idadeMinimaSemanas !== null && alimento.idadeMinimaSemanas !== undefined) || 
                     (alimento.idadeMaximaSemanas !== null && alimento.idadeMaximaSemanas !== undefined) ? (
                      <div className="col-span-2">
                        <span className="text-gray-500">Idade:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {alimento.idadeMinimaSemanas ?? 0}-{alimento.idadeMaximaSemanas ?? "∞"} sem
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

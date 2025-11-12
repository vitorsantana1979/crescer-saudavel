import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { loadAuth } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { UserPlus, Plus, Search, Edit, Trash2 } from "lucide-react";

interface Profissional {
  id: string;
  nome: string;
  email: string;
  tipoConselho: { sigla: string; tipoProfissional: string };
  numeroRegistro: string;
  tenants?: { tenantId: string; principal: boolean }[];
}

export default function Profissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [unidadesMap, setUnidadesMap] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadProfissionais();
  }, []);

  const loadProfissionais = async () => {
    try {
      const auth = loadAuth();
      if (!auth?.tenantIds?.length && auth?.roles.every((r) => r !== "SuperAdmin")) {
        toast.error("Você não possui acesso a nenhuma unidade.");
        setProfissionais([]);
        return;
      }
      const [profRes, unidadesRes] = await Promise.all([
        api.get("/profissionais"),
        api.get("/unidades"),
      ]);
      setProfissionais(profRes.data);
      const map: Record<string, string> = {};
      unidadesRes.data.forEach((u: any) => {
        map[u.id] = u.nome;
      });
      setUnidadesMap(map);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      setProfissionais([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente desativar este profissional?")) return;

    try {
      await api.delete(`/profissionais/${id}`);
      toast.success("Profissional desativado com sucesso!");
      loadProfissionais();
    } catch (error) {
      toast.error("Erro ao desativar profissional");
    }
  };

  const filteredProfissionais = profissionais.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Profissionais"
        subtitle="Gestão da equipe de saúde"
        icon={UserPlus}
        action={{
          label: "Novo Profissional",
          onClick: () => navigate("/profissionais/novo"),
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : filteredProfissionais.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum profissional cadastrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Profissão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unidades
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProfissionais.map((prof) => (
                <tr key={prof.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {prof.nome}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {prof.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {prof.tipoConselho.tipoProfissional}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {prof.tipoConselho.sigla} {prof.numeroRegistro}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {prof.tenants && prof.tenants.length > 0
                      ? prof.tenants
                          .map((t) => `${unidadesMap[t.tenantId] || t.tenantId}${t.principal ? " (principal)" : ""}`)
                          .join(", ")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/profissionais/${prof.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(prof.id)}
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

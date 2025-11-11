import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Building, Edit, Plus, Save, Trash2, X } from "lucide-react";
import { listarEstados, listarMunicipios, Estado, Municipio } from "@/lib/localizacao";

interface GrupoSaude {
  id: string;
  nome: string;
  tipo: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ativo: boolean;
}

interface FormData {
  nome: string;
  tipo: string;
  cnpj?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
}

const TIPOS_GRUPO = [
  "Secretaria de Saúde",
  "Organização Social",
  "Fundação",
  "Grupo Particular",
];

export default function GruposSaude() {
  const [grupos, setGrupos] = useState<GrupoSaude[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      ativo: true,
      tipo: TIPOS_GRUPO[0],
    },
  });

  const estadoSelecionado = watch("estado");
  const cidadeSelecionada = watch("cidade");

  useEffect(() => {
    carregarGrupos();
    carregarEstados();
  }, []);

  useEffect(() => {
    let ativo = true;

    if (!estadoSelecionado) {
      setMunicipios([]);
      if (cidadeSelecionada) {
        setValue("cidade", "");
      }
      return;
    }

    (async () => {
      setCarregandoMunicipios(true);
      const lista = await listarMunicipios(estadoSelecionado);
      if (!ativo) return;
      setMunicipios(lista);
      if (cidadeSelecionada) {
        const existe = lista.some((m) => m.nome === cidadeSelecionada);
        if (!existe) {
          setValue("cidade", "");
        }
      }
      setCarregandoMunicipios(false);
    })();

    return () => {
      ativo = false;
    };
  }, [estadoSelecionado, cidadeSelecionada, setValue]);

  const carregarGrupos = async () => {
    setLoading(true);
    try {
      const res = await api.get("/grupos-saude");
      setGrupos(
        res.data.map((grupo: any) => ({
          id: grupo.id,
          nome: grupo.nome,
          tipo: grupo.tipo,
          cnpj: grupo.cnpj,
          telefone: grupo.telefone,
          endereco: grupo.endereco,
          cidade: grupo.cidade,
          estado: grupo.estado,
          cep: grupo.cep,
          ativo: grupo.ativo,
        }))
      );
    } catch (error) {
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  const carregarEstados = async () => {
    const lista = await listarEstados();
    setEstados(lista);
  };

  const abrirModalNovo = () => {
    setEditingId(null);
    reset({
      nome: "",
      tipo: TIPOS_GRUPO[0],
      cnpj: "",
      telefone: "",
      cep: "",
      endereco: "",
      cidade: "",
      estado: "",
      ativo: true,
    });
    setMunicipios([]);
    setModalAberto(true);
  };

  const abrirModalEditar = async (grupo: GrupoSaude) => {
    setEditingId(grupo.id);
    reset({
      nome: grupo.nome,
      tipo: grupo.tipo,
      cnpj: grupo.cnpj ?? "",
      telefone: grupo.telefone ?? "",
      cep: grupo.cep ?? "",
      endereco: grupo.endereco ?? "",
      cidade: grupo.cidade ?? "",
      estado: grupo.estado ?? "",
      ativo: grupo.ativo,
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditingId(null);
    setMunicipios([]);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        nome: data.nome,
        tipo: data.tipo,
        cnpj: data.cnpj?.trim() || null,
        telefone: data.telefone?.trim() || null,
        cep: data.cep?.replace(/\D/g, "") || null,
        endereco: data.endereco?.trim() || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        ativo: data.ativo,
      };

      if (editingId) {
        await api.put(`/grupos-saude/${editingId}`, payload);
        toast.success("Grupo atualizado com sucesso!");
      } else {
        await api.post("/grupos-saude", payload);
        toast.success("Grupo criado com sucesso!");
      }

      fecharModal();
      carregarGrupos();
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Erro ao salvar grupo de saúde";
      toast.error(message);
    }
  };

  const handleDesativar = async (id: string) => {
    if (!confirm("Deseja desativar este grupo?")) return;
    try {
      await api.delete(`/grupos-saude/${id}`);
      toast.success("Grupo desativado");
      carregarGrupos();
    } catch {
      toast.error("Erro ao desativar grupo");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grupos de Saúde"
        subtitle="Administração de secretarias, fundações e grupos privados"
        icon={Building}
        action={{ label: "Novo Grupo", onClick: abrirModalNovo, icon: Plus }}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Carregando grupos...
          </div>
        ) : grupos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum grupo cadastrado até o momento.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Endereço
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {grupos.map((grupo) => (
                <tr key={grupo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {grupo.nome}
                    </div>
                    <div className="text-xs text-gray-500">
                      {grupo.ativo ? "Ativo" : "Desativado"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{grupo.tipo}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {grupo.telefone || "-"}
                    <br />
                    {grupo.cnpj || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {grupo.endereco ? (
                      <>
                        <span>{grupo.endereco}</span>
                        <br />
                        <span>
                          {grupo.cidade || "-"}/{grupo.estado || "-"} • {grupo.cep || "-"}
                        </span>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => abrirModalEditar(grupo)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDesativar(grupo.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        title="Desativar"
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

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingId ? "Editar Grupo de Saúde" : "Novo Grupo de Saúde"}
                </h2>
                <p className="text-sm text-gray-500">
                  Informe os dados e utilize o CEP para preencher o endereço automaticamente.
                </p>
              </div>
              <button
                onClick={fecharModal}
                className="p-2 rounded-lg hover:bg-gray-100"
                title="Fechar"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Grupo *
                  </label>
                  <input
                    {...register("nome", { required: "Nome é obrigatório" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Secretaria Municipal de Saúde"
                  />
                  {errors.nome && (
                    <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    {...register("tipo", { required: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {TIPOS_GRUPO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    {...register("cnpj")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    {...register("telefone")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="(11) 0000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEP
                  </label>
                  <input
                    {...register("cep")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="00000-000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço
                  </label>
                  <input
                    {...register("endereco")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Rua, número, bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    {...register("estado")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {estados.map((estado) => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.nome} ({estado.sigla})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <select
                    {...register("cidade")}
                    disabled={!estadoSelecionado || carregandoMunicipios}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  >
                    <option value="">
                      {carregandoMunicipios ? "Carregando..." : "Selecione..."}
                    </option>
                    {municipios.map((municipio) => (
                      <option key={municipio.ibgeCodigo} value={municipio.nome}>
                        {municipio.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="ativo" {...register("ativo")} />
                  <label htmlFor="ativo" className="text-sm text-gray-700">
                    Ativo
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

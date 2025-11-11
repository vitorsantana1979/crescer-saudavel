import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Building2, CheckCircle, Edit, Plus, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listarEstados, listarMunicipios, Estado, Municipio } from "@/lib/localizacao";

interface Unidade {
  id: string;
  nome: string;
  tipo: string;
  tipoUnidade?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  grupoSaudeId: string;
  grupoSaudeNome?: string;
  idadePreTermoLimite: number;
  ativo: boolean;
}

interface GrupoSaudeLite {
  id: string;
  nome: string;
}

interface FormData {
  nome: string;
  tipo?: string;
  tipoUnidade?: string;
  cnpj?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  idadePreTermoLimite?: number;
  grupoSaudeId?: string;
  ativo: boolean;
}

const TIPOS_UNIDADE = [
  "Hospital",
  "Maternidade",
  "Unidade Básica de Saúde",
  "UPA",
  "Clínica",
];

export default function UnidadesSaude() {
  const { auth, activeTenantId, setActiveTenantId } = useAuth();
  const roles = auth?.roles ?? [];
  const isSuperAdmin = roles.includes("SuperAdmin");
  const isAdminGrupo = isSuperAdmin || roles.includes("AdminGrupo");

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [grupos, setGrupos] = useState<GrupoSaudeLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
      idadePreTermoLimite: 37,
    },
  });

  const estadoSelecionado = watch("estado");
  const cidadeSelecionada = watch("cidade");

  useEffect(() => {
    loadUnidades();
    if (isSuperAdmin) {
      loadGrupos();
    }
    listarEstados().then(setEstados);
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
        if (!existe) setValue("cidade", "");
      }
      setCarregandoMunicipios(false);
    })();

    return () => {
      ativo = false;
    };
  }, [estadoSelecionado, cidadeSelecionada, setValue]);

  const loadGrupos = async () => {
    try {
      const res = await api.get("/grupos-saude");
      setGrupos(res.data.map((g: any) => ({ id: g.id, nome: g.nome })));
    } catch (error) {
      toast.error("Erro ao carregar grupos de saúde");
    }
  };

  const loadUnidades = async () => {
    setLoading(true);
    try {
      const res = await api.get("/unidades");
      setUnidades(res.data);
    } catch (error) {
      toast.error("Erro ao carregar unidades");
      setUnidades([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setEditingId(null);
    reset({
      nome: "",
      tipo: "",
      tipoUnidade: "",
      cnpj: "",
      telefone: "",
      cep: "",
      endereco: "",
      cidade: "",
      estado: "",
      idadePreTermoLimite: 37,
      grupoSaudeId: isSuperAdmin ? "" : auth?.grupoSaudeId,
      ativo: true,
    });
    setMunicipios([]);
    setModalAberto(true);
  };

  const abrirModalEditar = (unidade: Unidade) => {
    setEditingId(unidade.id);
    reset({
      nome: unidade.nome,
      tipo: unidade.tipo,
      tipoUnidade: unidade.tipoUnidade,
      cnpj: unidade.cnpj,
      telefone: unidade.telefone,
      cep: unidade.cep,
      endereco: unidade.endereco,
      cidade: unidade.cidade,
      estado: unidade.estado,
      idadePreTermoLimite: unidade.idadePreTermoLimite,
      grupoSaudeId: unidade.grupoSaudeId,
      ativo: unidade.ativo,
    });
    setModalAberto(true);
    setActiveTenantId(unidade.id);
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
        tipoUnidade: data.tipoUnidade,
        cnpj: data.cnpj?.trim() || null,
        telefone: data.telefone?.trim() || null,
        cep: data.cep?.replace(/\D/g, "") || null,
        endereco: data.endereco?.trim() || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        idadePreTermoLimite: data.idadePreTermoLimite,
        grupoSaudeId: isSuperAdmin ? data.grupoSaudeId : auth?.grupoSaudeId,
        ativo: data.ativo,
      };

      if (!payload.grupoSaudeId) {
        toast.error("Selecione um grupo de saúde");
        return;
      }

      if (editingId) {
        await api.put(`/unidades/${editingId}`, payload);
        toast.success("Unidade atualizada com sucesso!");
      } else {
        await api.post("/unidades", payload);
        toast.success("Unidade criada com sucesso!");
      }

      fecharModal();
      loadUnidades();
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao salvar unidade";
      toast.error(message);
    }
  };

  const handleSelectUnidade = (tenantId: string) => {
    setActiveTenantId(tenantId);
    toast.success("Unidade ativa atualizada");
  };

  const filteredGrupos = useMemo(() => {
    if (isSuperAdmin) return grupos;
    if (auth?.grupoSaudeId) {
      const grupoAtual = grupos.find((g) => g.id === auth.grupoSaudeId);
      return grupoAtual ? [grupoAtual] : [];
    }
    return [];
  }, [grupos, auth?.grupoSaudeId, isSuperAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades de Saúde"
        subtitle="Administração das unidades vinculadas"
        icon={Building2}
        action={{ label: "Nova Unidade", onClick: abrirModalNovo, icon: Plus }}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Grupo
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : unidades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Nenhuma unidade cadastrada
                  </td>
                </tr>
              ) : (
                unidades.map((unidade) => (
                  <tr
                    key={unidade.id}
                    className={activeTenantId === unidade.id ? "bg-green-50" : undefined}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {unidade.nome}
                      <div className="text-xs text-gray-500">
                        {unidade.tipoUnidade || unidade.tipo || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {unidade.grupoSaudeNome || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {unidade.telefone || "-"}
                      <br />
                      {unidade.cnpj || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {unidade.endereco ? (
                        <>
                          <span>{unidade.endereco}</span>
                          <br />
                          <span>
                            {unidade.cidade || "-"}/{unidade.estado || "-"} • {unidade.cep || "-"}
                          </span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleSelectUnidade(unidade.id)}
                          className="px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50"
                          title="Ativar unidade"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        {isAdminGrupo && (
                          <button
                            onClick={() => abrirModalEditar(unidade)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Editar unidade"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingId ? "Editar Unidade de Saúde" : "Nova Unidade de Saúde"}
                </h2>
                <p className="text-sm text-gray-500">
                  Utilize o CEP para preencher automaticamente os campos de endereço.
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
                    Nome da Unidade *
                  </label>
                  <input
                    {...register("nome", { required: "Nome é obrigatório" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Hospital Municipal"
                  />
                  {errors.nome && (
                    <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <input
                    {...register("tipo")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="hospital"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Unidade
                  </label>
                  <select
                    {...register("tipoUnidade")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_UNIDADE.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {isSuperAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grupo de Saúde *
                    </label>
                    <select
                      {...register("grupoSaudeId", {
                        required: "Grupo é obrigatório",
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {filteredGrupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </option>
                      ))}
                    </select>
                    {errors.grupoSaudeId && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.grupoSaudeId.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    {...register("cnpj")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    {...register("telefone")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idade Pré-termo Limite (semanas)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={45}
                    {...register("idadePreTermoLimite", { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
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

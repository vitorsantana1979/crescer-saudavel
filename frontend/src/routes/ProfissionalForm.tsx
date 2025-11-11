import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api, { loadAuth } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { UserPlus, Save, X } from "lucide-react";

interface TipoConselho {
  id: number;
  sigla: string;
  nome: string;
  tipoProfissional: string;
}

interface UnidadeOption {
  id: string;
  nome: string;
  grupo?: string;
}

interface FormData {
  email: string;
  senha?: string;
  nome: string;
  tipoConselhoId: number;
  numeroRegistro: string;
  especialidade?: string;
  role?: string;
}

export default function ProfissionalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = loadAuth();
  const userRoles = auth?.roles ?? [];
  const roleOptions = (() => {
    if (userRoles.includes("SuperAdmin")) {
      return ["Operador", "AdminUnidade", "AdminGrupo", "SuperAdmin"];
    }
    if (userRoles.includes("AdminGrupo")) {
      return ["Operador", "AdminUnidade", "AdminGrupo"];
    }
    if (userRoles.includes("AdminUnidade")) {
      return ["Operador", "AdminUnidade"];
    }
    return ["Operador"];
  })();
  const [loading, setLoading] = useState(false);
  const [tiposConselho, setTiposConselho] = useState<TipoConselho[]>([]);
  const [role, setRole] = useState<string>(roleOptions[0] ?? "Operador");
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [principalTenantId, setPrincipalTenantId] = useState<string | null>(null);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const canManageMultipleUnits =
    userRoles.includes("SuperAdmin") || userRoles.includes("AdminGrupo");
  const isEditing = !!id;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    loadTiposConselho();
    loadUnidades();
  }, []);

  useEffect(() => {
    if (isEditing) {
      loadProfissional();
    }
  }, [id, isEditing]);

  const loadTiposConselho = async () => {
    try {
      const response = await api.get("/auth/tipos-conselho");
      setTiposConselho(response.data);
    } catch (error) {
      toast.error("Erro ao carregar tipos de conselho");
    }
  };

  const loadUnidades = async () => {
    setLoadingUnidades(true);
    try {
      const response = await api.get("/unidades");
      const mapped: UnidadeOption[] = response.data.map((unidade: any) => ({
        id: unidade.id,
        nome: unidade.nome,
        grupo: unidade.grupoSaudeNome,
      }));
      setUnidades(mapped);

      if (!isEditing && mapped.length > 0) {
        const prefered =
          auth?.tenantId ||
          auth?.principalTenantId ||
          auth?.tenantIds?.[0] ||
          mapped[0]?.id ||
          null;

        if (prefered) {
          setSelectedTenants([prefered]);
          setPrincipalTenantId(prefered);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar unidades");
      setUnidades([]);
    } finally {
      setLoadingUnidades(false);
    }
  };

  const loadProfissional = async () => {
    try {
      const response = await api.get(`/profissionais/${id}`);
      const prof = response.data;
      setValue("nome", prof.nome);
      setValue("email", prof.email);
      setValue("tipoConselhoId", prof.tipoConselhoId);
      setValue("numeroRegistro", prof.numeroRegistro);
      setValue("especialidade", prof.especialidade);
      if (Array.isArray(prof.tenants)) {
        const tenantIds: string[] = prof.tenants.map((t: any) => t.tenantId);
        setSelectedTenants(tenantIds);
        const principal =
          prof.tenants.find((t: any) => t.principal)?.tenantId ||
          prof.tenantId ||
          tenantIds[0] ||
          null;
        setPrincipalTenantId(principal ?? null);
      } else if (prof.tenantId) {
        setSelectedTenants([prof.tenantId]);
        setPrincipalTenantId(prof.tenantId);
      }
    } catch (error) {
      toast.error("Erro ao carregar profissional");
    }
  };

  const toggleUnidade = (tenantId: string) => {
    if (!canManageMultipleUnits) {
      setSelectedTenants([tenantId]);
      setPrincipalTenantId(tenantId);
      return;
    }

    setSelectedTenants((prev) => {
      if (prev.includes(tenantId)) {
        const updated = prev.filter((id) => id !== tenantId);
        if (principalTenantId === tenantId) {
          setPrincipalTenantId(updated[0] ?? null);
        }
        return updated;
      }

      const updated = [...prev, tenantId];
      if (!principalTenantId) {
        setPrincipalTenantId(tenantId);
      }
      return updated;
    });
  };

  const definirPrincipal = (tenantId: string) => {
    if (!selectedTenants.includes(tenantId)) return;
    setPrincipalTenantId(tenantId);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const tenantIdsToSend = Array.from(new Set(selectedTenants));
      if (tenantIdsToSend.length === 0) {
        toast.error("Selecione ao menos uma unidade para o profissional.");
        return;
      }

      const principal =
        principalTenantId && tenantIdsToSend.includes(principalTenantId)
          ? principalTenantId
          : tenantIdsToSend[0]!;

      if (isEditing) {
        await api.put(`/profissionais/${id}`, {
          ...data,
          ativo: true,
          tenantIds: tenantIdsToSend,
          principalTenantId: principal,
        });
        toast.success("Profissional atualizado com sucesso!");
      } else {
        await api.post("/auth/register", {
          ...data,
          role,
          tenantIds: tenantIdsToSend,
          tenantId: principal,
          principalTenantId: principal,
          grupoSaudeId: auth?.grupoSaudeId ?? undefined,
        });
        toast.success("Profissional cadastrado com sucesso!");
      }
      navigate("/profissionais");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Erro ao salvar profissional";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEditing ? "Editar Profissional" : "Novo Profissional"}
        subtitle="Cadastro de profissional de saúde"
        icon={UserPlus}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                {...register("nome", { required: "Nome é obrigatório" })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Dr. João Silva"
              />
              {errors.nome && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.nome.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                {...register("email", { required: "Email é obrigatório" })}
                disabled={isEditing}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isEditing ? "bg-gray-100" : ""
                }`}
                placeholder="joao@exemplo.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Senha (apenas para novo cadastro) */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha *
                </label>
                <input
                  type="password"
                  {...register("senha", {
                    required: !isEditing ? "Senha é obrigatória" : false,
                    minLength: {
                      value: 6,
                      message: "Senha deve ter no mínimo 6 caracteres",
                    },
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errors.senha && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.senha.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 6 caracteres, incluindo maiúsculas, números e símbolos
                </p>
              </div>
            )}

            {/* Tipo de Conselho */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conselho Profissional *
              </label>
              <select
                {...register("tipoConselhoId", {
                  required: "Conselho é obrigatório",
                  valueAsNumber: true,
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {tiposConselho.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.sigla} - {tipo.tipoProfissional}
                  </option>
                ))}
              </select>
              {errors.tipoConselhoId && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.tipoConselhoId.message}
                </p>
              )}
            </div>

            {/* Número de Registro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Registro *
              </label>
              <input
                {...register("numeroRegistro", {
                  required: "Número de registro é obrigatório",
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="123456"
              />
              {errors.numeroRegistro && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.numeroRegistro.message}
                </p>
              )}
            </div>

            {/* Papel */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil de Acesso *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "Operador"
                        ? "Operador"
                        : opt === "AdminUnidade"
                        ? "Administrador da Unidade"
                        : opt === "AdminGrupo"
                        ? "Administrador do Grupo"
                        : "Super Admin"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Especialidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidade
              </label>
              <input
                {...register("especialidade")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Neonatologia, Pediatria"
            />
          </div>
        </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Unidades de atuação *
              </label>
              {principalTenantId && (
                <span className="text-xs text-gray-500">
                  Unidade principal selecionada
                </span>
              )}
            </div>

            {loadingUnidades ? (
              <p className="text-sm text-gray-500">Carregando unidades...</p>
            ) : unidades.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma unidade disponível para vincular.
              </p>
            ) : (
              <div className="space-y-3">
                {unidades.map((unidade) => {
                  const selecionada = selectedTenants.includes(unidade.id);
                  return (
                    <div
                      key={unidade.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        selecionada
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-green-600 border-gray-300 rounded"
                          checked={selecionada}
                          onChange={() => toggleUnidade(unidade.id)}
                          disabled={
                            !canManageMultipleUnits &&
                            selecionada &&
                            principalTenantId === unidade.id &&
                            selectedTenants.length === 1
                          }
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {unidade.nome}
                          </p>
                          {unidade.grupo && (
                            <p className="text-xs text-gray-500">
                              {unidade.grupo}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="principalTenant"
                          className="h-4 w-4 text-green-600 border-gray-300"
                          disabled={!selecionada}
                          checked={principalTenantId === unidade.id}
                          onChange={() => definirPrincipal(unidade.id)}
                        />
                        <span className="text-xs text-gray-500">Principal</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedTenants.length === 0 && !loadingUnidades && (
              <p className="text-xs text-red-500 mt-2">
                Selecione ao menos uma unidade para o profissional.
              </p>
            )}

            {!canManageMultipleUnits && (
              <p className="text-xs text-gray-500 mt-3">
                Seu perfil permite vincular o profissional a apenas uma unidade
                por vez.
              </p>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/profissionais")}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


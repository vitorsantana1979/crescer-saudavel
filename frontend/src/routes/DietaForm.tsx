import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Apple, Save, X, Plus, Trash2 } from "lucide-react";

interface Alimento {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  energiaKcalPor100: number;
  proteinaGPor100: number;
}

interface DietaItem {
  alimentoId: string;
  quantidade: number;
  energiaTotalKcal?: number;
  proteinaTotalG?: number;
}

interface FormData {
  recemNascidoId: string;
  dataInicio: string;
  dataFim?: string;
  frequenciaHoras: number;
  temDataFim: boolean;
  itens: DietaItem[];
}

export default function DietaForm() {
  const { criancaId, dietaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [criancaNome, setCriancaNome] = useState("");
  const isEditing = !!dietaId;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      recemNascidoId: criancaId,
      dataInicio: new Date().toISOString().split("T")[0],
      frequenciaHoras: 3,
      temDataFim: false,
      itens: [{ alimentoId: "", quantidade: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens",
  });

  const watchItens = watch("itens");
  const watchTemDataFim = watch("temDataFim");

  useEffect(() => {
    loadAlimentos();
    loadCrianca();
    if (isEditing) {
      loadDieta();
    }
  }, [dietaId, criancaId]);

  const loadAlimentos = async () => {
    try {
      const response = await api.get("/alimentos");
      setAlimentos(response.data);
    } catch (error) {
      toast.error("Erro ao carregar alimentos");
    }
  };

  const loadCrianca = async () => {
    try {
      const response = await api.get(`/recemnascido/${criancaId}`);
      setCriancaNome(response.data.nome);
    } catch (error) {
      toast.error("Erro ao carregar dados da criança");
    }
  };

  const loadDieta = async () => {
    try {
      const response = await api.get(`/dietas/${dietaId}`);
      const dieta = response.data;
      setValue("dataInicio", dieta.dataInicio.split("T")[0]);
      setValue("frequenciaHoras", dieta.frequenciaHoras || 3);

      if (dieta.dataFim) {
        setValue("temDataFim", true);
        setValue("dataFim", dieta.dataFim.split("T")[0]);
      } else {
        setValue("temDataFim", false);
      }

      setValue("itens", dieta.itens);
    } catch (error) {
      toast.error("Erro ao carregar dieta");
    }
  };

  const calcularNutrientes = (index: number) => {
    const item = watchItens[index];
    if (!item?.alimentoId || !item?.quantidade) return;

    const alimento = alimentos.find((a) => a.id === item.alimentoId);
    if (!alimento) return;

    const quantidade = Number(item.quantidade);
    const energiaTotal = (alimento.energiaKcalPor100 * quantidade) / 100;
    const proteinaTotal = (alimento.proteinaGPor100 * quantidade) / 100;

    setValue(
      `itens.${index}.energiaTotalKcal`,
      Number(energiaTotal.toFixed(2))
    );
    setValue(`itens.${index}.proteinaTotalG`, Number(proteinaTotal.toFixed(2)));
  };

  const onSubmit = async (data: FormData) => {
    if (data.itens.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        recemNascidoId: data.recemNascidoId,
        dataInicio: new Date(data.dataInicio).toISOString(),
        dataFim:
          data.temDataFim && data.dataFim
            ? new Date(data.dataFim).toISOString()
            : null,
        frequenciaHoras: data.frequenciaHoras,
        itens: data.itens,
      };

      if (isEditing) {
        await api.put(`/dietas/${dietaId}`, payload);
        toast.success("Dieta atualizada com sucesso!");
      } else {
        await api.post("/dietas", payload);
        toast.success("Dieta cadastrada com sucesso!");
      }
      navigate(`/criancas/detalhes/${criancaId}`);
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao salvar dieta";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const totais = watchItens.reduce(
    (acc, item) => ({
      energia: acc.energia + (Number(item.energiaTotalKcal) || 0),
      proteina: acc.proteina + (Number(item.proteinaTotalG) || 0),
    }),
    { energia: 0, proteina: 0 }
  );

  return (
    <div>
      <PageHeader
        title={isEditing ? "Editar Dietoterapia" : "Nova Dietoterapia"}
        subtitle={`Paciente: ${criancaNome}`}
        icon={Apple}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Período da Dieta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Início *
              </label>
              <input
                type="date"
                {...register("dataInicio", {
                  required: "Data de início é obrigatória",
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.dataInicio && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.dataInicio.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequência *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  De
                </span>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  {...register("frequenciaHoras", {
                    required: "Frequência é obrigatória",
                    valueAsNumber: true,
                    min: { value: 0.5, message: "Mínimo 0,5 horas" },
                    max: { value: 24, message: "Máximo 24 horas" },
                  })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center font-semibold"
                  placeholder="3"
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  em
                </span>
                <input
                  type="number"
                  value={watch("frequenciaHoras") || 3}
                  readOnly
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center font-semibold text-gray-700"
                />
                <span className="text-sm text-gray-600">horas</span>
              </div>
              {errors.frequenciaHoras && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.frequenciaHoras.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Ex: De 3 em 3 horas = 8 vezes ao dia
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Término
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("temDataFim")}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-600">
                    Definir data de término
                  </span>
                </label>
                {watchTemDataFim && (
                  <input
                    type="date"
                    {...register("dataFim")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                )}
                {!watchTemDataFim && (
                  <p className="text-xs text-gray-500 italic">
                    Válida até a próxima dieta
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Itens da Dieta */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Alimentos</h3>
              <button
                type="button"
                onClick={() => append({ alimentoId: "", quantidade: 0 })}
                className="flex items-center gap-2 px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50"
              >
                <Plus className="w-4 h-4" />
                Adicionar Alimento
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const alimento = alimentos.find(
                  (a) => a.id === watchItens[index]?.alimentoId
                );

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg"
                  >
                    {/* Alimento */}
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alimento *
                      </label>
                      <select
                        {...register(`itens.${index}.alimentoId`, {
                          required: true,
                        })}
                        onChange={() => calcularNutrientes(index)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Selecione...</option>
                        {alimentos.map((alimento) => (
                          <option key={alimento.id} value={alimento.id}>
                            {alimento.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qtd ({alimento?.unidade || "un"}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`itens.${index}.quantidade`, {
                          required: true,
                          valueAsNumber: true,
                        })}
                        onBlur={() => calcularNutrientes(index)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {/* Energia */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Energia (kcal)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`itens.${index}.energiaTotalKcal`, {
                          valueAsNumber: true,
                        })}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    {/* Proteína */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proteína (g)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`itens.${index}.proteinaTotalG`, {
                          valueAsNumber: true,
                        })}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    {/* Remover */}
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="w-full px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totais */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Totais Diários
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-green-700">Energia Total</p>
                <p className="text-2xl font-bold text-green-900">
                  {totais.energia.toFixed(1)} kcal
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Proteína Total</p>
                <p className="text-2xl font-bold text-green-900">
                  {totais.proteina.toFixed(1)} g
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate(`/criancas/detalhes/${criancaId}`)}
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

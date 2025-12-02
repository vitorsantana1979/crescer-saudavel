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
  taxaEnergeticaKcalKg?: number;
  metaProteinaGKg?: number;
  pesoReferenciaKg?: number;
  viaAdministracao?: string;
  observacoes?: string;
  temDataFim: boolean;
  itens: DietaItem[];
}

interface RecemNascido {
  id: string;
  nome: string;
  pesoNascimentoGr?: number;
}

export default function DietaForm() {
  const { criancaId, dietaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [crianca, setCrianca] = useState<RecemNascido | null>(null);
  const [pesoAtual, setPesoAtual] = useState<number | null>(null);
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
      taxaEnergeticaKcalKg: 120,
      metaProteinaGKg: 3.0,
      viaAdministracao: "Enteral",
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
    loadCriancaAndLastDiet();
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

  const loadCriancaAndLastDiet = async () => {
    try {
      // Carregar dados da criança
      const criancaResponse = await api.get(`/recemnascido/${criancaId}`);
      setCrianca(criancaResponse.data);

      // Carregar consultas para obter peso atual
      try {
        const consultasResponse = await api.get(`/consultas/crianca/${criancaId}`);
        const consultas = consultasResponse.data;
        if (consultas && consultas.length > 0) {
          // Pegar a última consulta com peso
          const ultimaConsulta = consultas
            .filter((c: any) => c.pesoGr)
            .sort((a: any, b: any) => new Date(b.dataConsulta).getTime() - new Date(a.dataConsulta).getTime())[0];
          if (ultimaConsulta) {
            setPesoAtual(ultimaConsulta.pesoGr / 1000); // Converter para kg
            if (!isEditing) {
              setValue("pesoReferenciaKg", ultimaConsulta.pesoGr / 1000);
            }
          }
        }
      } catch {
        // Se não conseguir carregar consultas, usa peso de nascimento
        if (criancaResponse.data.pesoNascimentoGr && !isEditing) {
          setValue("pesoReferenciaKg", criancaResponse.data.pesoNascimentoGr / 1000);
        }
      }

      // Se não estiver editando, carregar a última dieta para usar como base
      if (!isEditing) {
        try {
          const dietasResponse = await api.get(`/dietas/crianca/${criancaId}`);
          const dietas = dietasResponse.data;
          if (dietas && dietas.length > 0) {
            // Ordenar por data de início (mais recente primeiro)
            const ultimaDieta = dietas.sort(
              (a: any, b: any) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
            )[0];
            
            // Preencher campos com valores da última dieta
            if (ultimaDieta.taxaEnergeticaKcalKg) {
              setValue("taxaEnergeticaKcalKg", ultimaDieta.taxaEnergeticaKcalKg);
            }
            if (ultimaDieta.metaProteinaGKg) {
              setValue("metaProteinaGKg", ultimaDieta.metaProteinaGKg);
            }
            if (ultimaDieta.viaAdministracao) {
              setValue("viaAdministracao", ultimaDieta.viaAdministracao);
            }
            if (ultimaDieta.frequenciaHoras) {
              setValue("frequenciaHoras", ultimaDieta.frequenciaHoras);
            }
            // Copiar itens da última dieta
            if (ultimaDieta.itens && ultimaDieta.itens.length > 0) {
              setValue("itens", ultimaDieta.itens.map((item: any) => ({
                alimentoId: item.alimentoId,
                quantidade: item.quantidade,
                energiaTotalKcal: item.energiaTotalKcal,
                proteinaTotalG: item.proteinaTotalG,
              })));
            }
          }
        } catch {
          // Sem problema se não houver dietas anteriores
        }
      }
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
      setValue("taxaEnergeticaKcalKg", dieta.taxaEnergeticaKcalKg);
      setValue("metaProteinaGKg", dieta.metaProteinaGKg);
      setValue("pesoReferenciaKg", dieta.pesoReferenciaKg);
      setValue("viaAdministracao", dieta.viaAdministracao || "Enteral");
      setValue("observacoes", dieta.observacoes);

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
        taxaEnergeticaKcalKg: data.taxaEnergeticaKcalKg || null,
        metaProteinaGKg: data.metaProteinaGKg || null,
        pesoReferenciaKg: data.pesoReferenciaKg || null,
        viaAdministracao: data.viaAdministracao || null,
        observacoes: data.observacoes || null,
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
        subtitle={`Paciente: ${crianca?.nome || ''}`}
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

          {/* Parâmetros Nutricionais */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">Parâmetros Nutricionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Taxa Energética */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa Energética *
                </label>
                <select
                  {...register("taxaEnergeticaKcalKg", {
                    required: "Taxa energética é obrigatória",
                    valueAsNumber: true,
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value={100}>100 kcal/kg/dia</option>
                  <option value={110}>110 kcal/kg/dia</option>
                  <option value={120}>120 kcal/kg/dia</option>
                  <option value={130}>130 kcal/kg/dia</option>
                  <option value={140}>140 kcal/kg/dia</option>
                  <option value={150}>150 kcal/kg/dia</option>
                </select>
                {errors.taxaEnergeticaKcalKg && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.taxaEnergeticaKcalKg.message}
                  </p>
                )}
              </div>

              {/* Meta Proteica */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Proteica *
                </label>
                <select
                  {...register("metaProteinaGKg", {
                    required: "Meta proteica é obrigatória",
                    valueAsNumber: true,
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value={2.0}>2,0 g/kg/dia</option>
                  <option value={2.5}>2,5 g/kg/dia</option>
                  <option value={3.0}>3,0 g/kg/dia</option>
                  <option value={3.5}>3,5 g/kg/dia</option>
                  <option value={4.0}>4,0 g/kg/dia</option>
                  <option value={4.5}>4,5 g/kg/dia</option>
                </select>
                {errors.metaProteinaGKg && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.metaProteinaGKg.message}
                  </p>
                )}
              </div>

              {/* Peso de Referência */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso Referência (kg) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  {...register("pesoReferenciaKg", {
                    required: "Peso de referência é obrigatório",
                    valueAsNumber: true,
                    min: { value: 0.1, message: "Peso mínimo 0,1 kg" },
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Ex: 1.500"
                />
                {errors.pesoReferenciaKg && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.pesoReferenciaKg.message}
                  </p>
                )}
                {pesoAtual && (
                  <p className="text-xs text-amber-700 mt-1">
                    Peso atual: {pesoAtual.toFixed(3).replace('.', ',')} kg
                  </p>
                )}
              </div>

              {/* Via de Administração */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Via de Administração
                </label>
                <select
                  {...register("viaAdministracao")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="Oral">Oral</option>
                  <option value="Enteral">Enteral (Sonda)</option>
                  <option value="NPT">NPT (Nutrição Parenteral)</option>
                  <option value="Mista">Mista</option>
                </select>
              </div>
            </div>

            {/* Cálculo das Necessidades */}
            {watch("taxaEnergeticaKcalKg") && watch("pesoReferenciaKg") && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">Necessidades Calculadas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-amber-600">Necessidade Energética</p>
                    <p className="text-lg font-bold text-amber-900">
                      {((watch("taxaEnergeticaKcalKg") || 0) * (watch("pesoReferenciaKg") || 0)).toFixed(1).replace('.', ',')} kcal/dia
                    </p>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-amber-600">Necessidade Proteica</p>
                    <p className="text-lg font-bold text-amber-900">
                      {((watch("metaProteinaGKg") || 0) * (watch("pesoReferenciaKg") || 0)).toFixed(2).replace('.', ',')} g/dia
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                {...register("observacoes")}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Observações sobre a dietoterapia..."
              />
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
              Totais por Mamada e Diários
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-green-700">Energia por Mamada</p>
                <p className="text-xl font-bold text-green-900">
                  {totais.energia.toFixed(1).replace('.', ',')} kcal
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Proteína por Mamada</p>
                <p className="text-xl font-bold text-green-900">
                  {totais.proteina.toFixed(2).replace('.', ',')} g
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Energia Diária</p>
                <p className="text-xl font-bold text-green-900">
                  {(totais.energia * (24 / (watch("frequenciaHoras") || 3))).toFixed(1).replace('.', ',')} kcal
                </p>
                {watch("taxaEnergeticaKcalKg") && watch("pesoReferenciaKg") && (
                  <p className={`text-xs font-semibold ${
                    (totais.energia * (24 / (watch("frequenciaHoras") || 3))) >= 
                    ((watch("taxaEnergeticaKcalKg") || 0) * (watch("pesoReferenciaKg") || 0) * 0.9)
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    {(((totais.energia * (24 / (watch("frequenciaHoras") || 3))) / 
                      ((watch("taxaEnergeticaKcalKg") || 1) * (watch("pesoReferenciaKg") || 1))) * 100).toFixed(0)}% da necessidade
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-green-700">Proteína Diária</p>
                <p className="text-xl font-bold text-green-900">
                  {(totais.proteina * (24 / (watch("frequenciaHoras") || 3))).toFixed(2).replace('.', ',')} g
                </p>
                {watch("metaProteinaGKg") && watch("pesoReferenciaKg") && (
                  <p className={`text-xs font-semibold ${
                    (totais.proteina * (24 / (watch("frequenciaHoras") || 3))) >= 
                    ((watch("metaProteinaGKg") || 0) * (watch("pesoReferenciaKg") || 0) * 0.9)
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    {(((totais.proteina * (24 / (watch("frequenciaHoras") || 3))) / 
                      ((watch("metaProteinaGKg") || 1) * (watch("pesoReferenciaKg") || 1))) * 100).toFixed(0)}% da necessidade
                  </p>
                )}
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

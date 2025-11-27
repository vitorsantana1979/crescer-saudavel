import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errorHandler";
import PageHeader from "@/components/PageHeader";
import { Activity, Save, X } from "lucide-react";

interface FormData {
  recemNascidoId: string;
  dataHora: string;
  hora: string;
  pesoKg: number;
  estaturaCm: number;
  perimetroCefalicoCm: number;
}

interface Consulta extends FormData {
  id: string;
  zScorePeso?: number;
  zScoreAltura?: number;
  zScorePerimetro?: number;
}

export default function ConsultaForm() {
  const { criancaId, consultaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [criancaNome, setCriancaNome] = useState("");
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const isEditing = !!consultaId;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      recemNascidoId: criancaId,
      dataHora: new Date().toISOString().split("T")[0],
      hora: new Date().toTimeString().substring(0, 5),
    },
  });

  useEffect(() => {
    loadCrianca();
    if (isEditing) {
      loadConsulta();
    }
  }, [consultaId, criancaId]);

  const loadCrianca = async () => {
    try {
      const response = await api.get(`/recemnascido/${criancaId}`);
      setCriancaNome(response.data.nome);
    } catch (error) {
      toast.error("Erro ao carregar dados da criança");
    }
  };

  const loadConsulta = async () => {
    try {
      const response = await api.get(`/consultas/${consultaId}`);
      const data = response.data;
      setConsulta(data);

      const dataHoraObj = new Date(data.dataHora);
      setValue("dataHora", dataHoraObj.toISOString().split("T")[0]);
      setValue("hora", dataHoraObj.toTimeString().substring(0, 5));
      setValue("pesoKg", data.pesoKg);
      setValue("estaturaCm", data.estaturaCm);
      setValue("perimetroCefalicoCm", data.perimetroCefalicoCm);
    } catch (error) {
      toast.error("Erro ao carregar consulta");
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Combinar data e hora
      const dataHoraCombinada = `${data.dataHora}T${data.hora}:00`;

      const payload = {
        recemNascidoId: data.recemNascidoId,
        dataHora: new Date(dataHoraCombinada).toISOString(),
        pesoKg: data.pesoKg,
        estaturaCm: data.estaturaCm,
        perimetroCefalicoCm: data.perimetroCefalicoCm,
      };

      if (isEditing) {
        await api.put(`/consultas/${consultaId}`, payload);
        toast.success("Atendimento atualizado com sucesso!");
      } else {
        await api.post("/consultas", payload);
        toast.success("Atendimento registrado com sucesso!");
      }
      navigate(`/criancas/detalhes/${criancaId}`);
    } catch (error: any) {
      const message = getErrorMessage(error) || "Erro ao salvar atendimento";
      toast.error(message, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const getZScoreColor = (zScore?: number) => {
    if (!zScore) return "text-gray-500";
    if (zScore < -2) return "text-red-600";
    if (zScore < -1) return "text-orange-600";
    if (zScore > 2) return "text-red-600";
    if (zScore > 1) return "text-orange-600";
    return "text-green-600";
  };

  const getZScoreLabel = (zScore?: number) => {
    if (!zScore) return "-";
    if (zScore < -3) return "Muito Baixo";
    if (zScore < -2) return "Baixo";
    if (zScore < -1) return "Abaixo da Média";
    if (zScore > 3) return "Muito Alto";
    if (zScore > 2) return "Alto";
    if (zScore > 1) return "Acima da Média";
    return "Normal";
  };

  return (
    <div>
      <PageHeader
        title={isEditing ? "Editar Atendimento" : "Novo Atendimento"}
        subtitle={`Paciente: ${criancaNome}`}
        icon={Activity}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do Atendimento *
              </label>
              <input
                type="date"
                {...register("dataHora", {
                  required: "Data é obrigatória",
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.dataHora && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.dataHora.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora do Atendimento *
              </label>
              <input
                type="time"
                {...register("hora", {
                  required: "Hora é obrigatória",
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.hora && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.hora.message}
                </p>
              )}
            </div>
          </div>

          {/* Medidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Peso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso (kg) *
              </label>
              <input
                type="number"
                step="0.001"
                {...register("pesoKg", {
                  required: "Peso é obrigatório",
                  min: { value: 0.1, message: "Peso deve ser maior que 0" },
                  valueAsNumber: true,
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="2.500"
              />
              {errors.pesoKg && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.pesoKg.message}
                </p>
              )}
              {consulta?.zScorePeso !== undefined && consulta?.zScorePeso !== null && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Z-Score Peso</p>
                  <p
                    className={`text-sm font-semibold ${getZScoreColor(
                      consulta.zScorePeso
                    )}`}
                  >
                    {consulta.zScorePeso.toFixed(2)} -{" "}
                    {getZScoreLabel(consulta.zScorePeso)}
                  </p>
                </div>
              )}
            </div>

            {/* Estatura/Comprimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comprimento/Estatura (cm) *
              </label>
              <input
                type="number"
                step="0.1"
                {...register("estaturaCm", {
                  required: "Comprimento é obrigatório",
                  min: {
                    value: 1,
                    message: "Comprimento deve ser maior que 0",
                  },
                  valueAsNumber: true,
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="45.5"
              />
              {errors.estaturaCm && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.estaturaCm.message}
                </p>
              )}
              {consulta?.zScoreAltura !== undefined && consulta?.zScoreAltura !== null && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Z-Score Altura</p>
                  <p
                    className={`text-sm font-semibold ${getZScoreColor(
                      consulta.zScoreAltura
                    )}`}
                  >
                    {consulta.zScoreAltura.toFixed(2)} -{" "}
                    {getZScoreLabel(consulta.zScoreAltura)}
                  </p>
                </div>
              )}
            </div>

            {/* Perímetro Cefálico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perímetro Cefálico (cm) *
              </label>
              <input
                type="number"
                step="0.1"
                {...register("perimetroCefalicoCm", {
                  required: "Perímetro cefálico é obrigatório",
                  min: { value: 1, message: "Perímetro deve ser maior que 0" },
                  valueAsNumber: true,
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="32.0"
              />
              {errors.perimetroCefalicoCm && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.perimetroCefalicoCm.message}
                </p>
              )}
              {consulta?.zScorePerimetro !== undefined && consulta?.zScorePerimetro !== null && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Z-Score PC</p>
                  <p
                    className={`text-sm font-semibold ${getZScoreColor(
                      consulta.zScorePerimetro
                    )}`}
                  >
                    {consulta.zScorePerimetro.toFixed(2)} -{" "}
                    {getZScoreLabel(consulta.zScorePerimetro)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informações sobre Z-Score */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              ℹ️ Sobre os Z-Scores
            </h4>
            <p className="text-xs text-blue-800">
              Os Z-Scores serão calculados automaticamente após o salvamento,
              utilizando as curvas INTERGROWTH-21 (para pré-termos) ou OMS (para
              nascidos a termo), considerando a idade gestacional da criança.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-green-600 font-semibold">●</span> Normal:
                -1 a +1
              </div>
              <div>
                <span className="text-orange-600 font-semibold">●</span>{" "}
                Atenção: -2 a -1 ou +1 a +2
              </div>
              <div>
                <span className="text-red-600 font-semibold">●</span> Alerta:
                &lt; -2 ou &gt; +2
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

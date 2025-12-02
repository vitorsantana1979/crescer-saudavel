import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { Calendar, TrendingUp, Activity } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface TimelinePoint {
  dataInicio: string;
  totalUsos: number;
  mediaDeltaZScore: number;
  mediaGanhoPeso: number;
}

interface Props {
  alimentoId: string;
  dataInicio?: string;
  dataFim?: string;
}

export default function FoodTimeline({ alimentoId, dataInicio, dataFim }: Props) {
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [alimentoNome, setAlimentoNome] = useState<string>("Alimento");

  useEffect(() => {
    if (alimentoId) {
      loadTimeline();
    }
  }, [alimentoId, dataInicio, dataFim]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      let url = `/alimentos-analytics/timeline/${alimentoId}`;
      const params = new URLSearchParams();
      if (dataInicio) params.append("dataInicio", dataInicio);
      if (dataFim) params.append("dataFim", dataFim);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get<TimelinePoint[]>(url);
      setTimeline(response.data);

      // Buscar nome do alimento
      try {
        const alimentoResponse = await api.get(`/alimentos/${alimentoId}`);
        setAlimentoNome(alimentoResponse.data.nome);
      } catch {
        // Ignorar se não encontrar
      }
    } catch (error) {
      console.error("Erro ao carregar timeline:", error);
      toast.error("Erro ao carregar evolução temporal");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Sem dados temporais disponíveis para este alimento no período selecionado.</p>
        <p className="text-sm mt-2">
          Tente ajustar o período de análise ou selecione outro alimento.
        </p>
      </div>
    );
  }

  // Preparar dados para o gráfico
  const chartData = timeline.map((point) => ({
    mes: new Date(point.dataInicio).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    }),
    usos: point.totalUsos,
    deltaZScore: point.mediaDeltaZScore,
    ganhoPeso: point.mediaGanhoPeso,
  }));

  // Calcular métricas gerais
  const totalUsos = timeline.reduce((sum, p) => sum + p.totalUsos, 0);
  const mediaDeltaGeral = timeline.reduce((sum, p) => sum + p.mediaDeltaZScore, 0) / timeline.length;
  const mediaGanhoPesoGeral = timeline.reduce((sum, p) => sum + p.mediaGanhoPeso, 0) / timeline.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 text-blue-900">
          <Calendar className="h-6 w-6" />
          Evolução Temporal: {alimentoNome}
        </h3>
        <p className="text-sm text-blue-800">
          Acompanhamento do uso e resultados ao longo do tempo
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total de Usos</span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalUsos}</p>
          <p className="text-xs text-gray-500 mt-1">Em {timeline.length} períodos</p>
        </div>

        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Δ Z-Score Médio</span>
            <TrendingUp
              className={`h-5 w-5 ${
                mediaDeltaGeral > 0 ? "text-green-600" : "text-red-600"
              }`}
            />
          </div>
          <p
            className={`text-2xl font-bold ${
              mediaDeltaGeral > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {mediaDeltaGeral > 0 ? "+" : ""}
            {mediaDeltaGeral.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Média do período</p>
        </div>

        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Ganho Peso Médio</span>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {mediaGanhoPesoGeral.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">g/dia</p>
        </div>
      </div>

      {/* Gráfico de Usos ao Longo do Tempo */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">Frequência de Uso</h4>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="usos"
              fill="#3B82F6"
              stroke="#2563EB"
              fillOpacity={0.3}
              name="Total de Usos"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Δ Z-Score ao Longo do Tempo */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">
          Evolução do Δ Z-Score Médio
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="deltaZScore"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Δ Z-Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Ganho de Peso */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">
          Ganho de Peso Médio (g/dia)
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="ganhoPeso"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Ganho Peso (g/dia)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2">💡 Insights</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          {mediaDeltaGeral > 0.5 && (
            <li>✓ Resultados consistentemente positivos ao longo do tempo</li>
          )}
          {totalUsos > 50 && (
            <li>✓ Alimento amplamente utilizado - alta confiabilidade dos dados</li>
          )}
          {timeline.length >= 6 && (
            <li>✓ Histórico longo de uso permite análise robusta de tendências</li>
          )}
          {mediaDeltaGeral < 0 && (
            <li>⚠ Resultados abaixo do esperado - considerar alternativas ou revisar protocolo</li>
          )}
        </ul>
      </div>
    </div>
  );
}


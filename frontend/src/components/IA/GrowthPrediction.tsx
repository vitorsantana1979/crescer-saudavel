import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { TrendingUp, AlertCircle, CheckCircle, Info, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";

interface GrowthPredictionProps {
  criancaId: string;
  crianca: {
    nome: string;
    sexo: string;
    idadeGestacionalSemanas: number;
    classificacaoIG?: string;
  };
  pesoAtualKg: number;
  dietaAtual: {
    taxaEnergeticaKcalKg?: number;
    metaProteinaGKg?: number;
    frequenciaHoras: number;
  } | null;
}

interface PredictionResult {
  deltaZscorePrevisto: number;
  probabilidadeMelhora: number;
  confiabilidade: string;
  recomendacao: string;
  casosSimilares?: Array<{
    criancaId: string;
    deltaZscoreReal: number;
    diasAcompanhamento: number;
  }>;
}

export default function GrowthPrediction({ 
  criancaId, 
  crianca, 
  pesoAtualKg,
  dietaAtual 
}: GrowthPredictionProps) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [customDiet, setCustomDiet] = useState({
    taxaEnergeticaKcalKg: dietaAtual?.taxaEnergeticaKcalKg || 120,
    metaProteinaGKg: dietaAtual?.metaProteinaGKg || 3.5,
    frequenciaHoras: dietaAtual?.frequenciaHoras || 3,
  });
  const [horizonte, setHorizonte] = useState(14);

  useEffect(() => {
    if (dietaAtual) {
      fetchPrediction();
    }
  }, [criancaId]);

  const fetchPrediction = async () => {
    try {
      setLoading(true);

      const response = await api.post(`/analytics/predict-growth/${criancaId}`, {
        cenario: {
          taxaEnergeticaKcalKg: customDiet.taxaEnergeticaKcalKg,
          metaProteinaGKg: customDiet.metaProteinaGKg,
          frequenciaHoras: customDiet.frequenciaHoras,
        },
        horizonteDias: horizonte,
      });

      console.log("[DEBUG] Resposta da API:", response.data);

      // A API retorna: { crianca, predicao, recomendacao, casosSimilares, timestamp }
      const apiData = response.data;
      const predictionData = apiData.predicao || apiData.pred || {};
      
      // Mapear os nomes das propriedades (aceitar camelCase, PascalCase e snake_case)
      const mappedPrediction: PredictionResult = {
        deltaZscorePrevisto: predictionData.delta_zscore_pred || predictionData.deltaZscorePred || predictionData.DeltaZscorePred || 0,
        probabilidadeMelhora: predictionData.probabilidade_melhora || predictionData.probabilidadeMelhora || predictionData.ProbabilidadeMelhora || 0,
        confiabilidade: predictionData.confiabilidade || predictionData.Confiabilidade || "baixa",
        recomendacao: apiData.recomendacao || apiData.Recomendacao || "Sem recomendação disponível",
        casosSimilares: apiData.casos_similares || apiData.casosSimilares || apiData.CasosSimilares || [],
      };

      console.log("[DEBUG] Prediction mapeada:", mappedPrediction);

      // Avisar se os valores estão zerados
      if (mappedPrediction.deltaZscorePrevisto === 0 && mappedPrediction.probabilidadeMelhora === 0) {
        console.warn("[WARNING] Predição retornou valores zerados. Possíveis causas:");
        console.warn("- Criança sem consultas registradas");
        console.warn("- Dados insuficientes (idade gestacional, peso, z-score)");
        console.warn("- Data de nascimento inválida");
        console.warn("Dados da criança:", apiData.crianca);
      }

      setPrediction(mappedPrediction);
    } catch (error: any) {
      console.error("Erro ao buscar predição:", error);
      
      if (error.response?.status === 503) {
        toast.error("Serviço de IA temporariamente indisponível. Tente novamente em alguns segundos.");
      } else {
        toast.error("Erro ao buscar predição de crescimento");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = () => {
    fetchPrediction();
  };

  const getConfiabilidadeColor = (conf: string) => {
    switch (conf.toLowerCase()) {
      case "alta": return "text-green-600 bg-green-50 border-green-200";
      case "media": case "média": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "baixa": return "text-orange-600 bg-orange-50 border-orange-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRecommendationIcon = (rec: string) => {
    if (rec.includes("✅") || rec.includes("promissor")) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (rec.includes("⚠️") || rec.includes("modesto")) {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    } else if (rec.includes("❌") || rec.includes("desfavorável")) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    return <Info className="h-5 w-5 text-blue-600" />;
  };

  // Dados simulados para o gráfico de projeção
  const chartData = prediction ? [
    { dia: 0, zScore: 0, projecao: 0 },
    { dia: 7, zScore: null, projecao: (prediction.deltaZscorePrevisto || 0) * 0.5 },
    { dia: 14, zScore: null, projecao: (prediction.deltaZscorePrevisto || 0) },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Formulário de Cenário */}
      <div className="bg-gray-50 rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Cenário de Dieta
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taxa Energética (kcal/kg/dia)
            </label>
            <input
              type="number"
              value={customDiet.taxaEnergeticaKcalKg}
              onChange={(e) => setCustomDiet({ ...customDiet, taxaEnergeticaKcalKg: parseFloat(e.target.value) })}
              min="80"
              max="200"
              step="5"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Faixa: 80-200 kcal/kg</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Proteína (g/kg/dia)
            </label>
            <input
              type="number"
              value={customDiet.metaProteinaGKg}
              onChange={(e) => setCustomDiet({ ...customDiet, metaProteinaGKg: parseFloat(e.target.value) })}
              min="1.5"
              max="5"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Faixa: 1.5-5.0 g/kg</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horizonte (dias)
            </label>
            <select
              value={horizonte}
              onChange={(e) => setHorizonte(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="21">21 dias</option>
              <option value="28">28 dias</option>
            </select>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Calculando predição...
            </>
          ) : (
            <>
              <TrendingUp className="h-5 w-5" />
              Gerar Predição
            </>
          )}
        </button>
      </div>

      {/* Aviso de Dados Insuficientes */}
      {prediction && !loading && prediction.deltaZscorePrevisto === 0 && prediction.probabilidadeMelhora === 0 && (
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-2">
                ⚠️ Dados Insuficientes para Predição
              </h4>
              <p className="text-sm text-yellow-700 mb-2">
                Não foi possível gerar uma predição válida para este paciente. Possíveis causas:
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>Paciente sem consultas registradas com z-score calculado</li>
                <li>Dados incompletos (idade gestacional, peso ao nascer)</li>
                <li>Data de nascimento inválida</li>
              </ul>
              <p className="text-sm text-yellow-700 mt-3 font-medium">
                💡 Sugestão: Registre pelo menos 1 consulta com peso e altura, ou tente com outro paciente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mostrar recomendação mesmo com valores zero (pois contém info de casos similares) */}
      {prediction && !loading && prediction.deltaZscorePrevisto === 0 && prediction.recomendacao && prediction.recomendacao !== "Sem recomendação disponível" && (
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-2 text-blue-900">Informação dos Casos Similares</h4>
              <p className="text-sm text-blue-700 leading-relaxed whitespace-pre-line">
                {prediction.recomendacao}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado da Predição */}
      {prediction && !loading && (prediction.deltaZscorePrevisto !== 0 || prediction.probabilidadeMelhora !== 0) && (
        <div className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Δ Z-Score Previsto</span>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {(prediction.deltaZscorePrevisto || 0) > 0 ? "+" : ""}
                {(prediction.deltaZscorePrevisto || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">em {horizonte} dias</p>
            </div>

            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Probabilidade de Melhora</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {((prediction.probabilidadeMelhora || 0) * 100).toFixed(0)}%
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(prediction.probabilidadeMelhora || 0) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Confiabilidade</span>
                <Info className="h-5 w-5 text-gray-600" />
              </div>
              <div className={`inline-flex px-3 py-2 rounded-lg border font-semibold text-sm ${getConfiabilidadeColor(prediction.confiabilidade || "baixa")}`}>
                {(prediction.confiabilidade || "baixa").toUpperCase()}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {(prediction.confiabilidade || "baixa") === "baixa" && "Dados insuficientes"}
                {(prediction.confiabilidade || "baixa") === "media" && "Moderadamente confiável"}
                {(prediction.confiabilidade || "baixa") === "alta" && "Altamente confiável"}
              </p>
            </div>
          </div>

          {/* Gráfico de Projeção */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h4 className="text-lg font-semibold mb-4">Projeção de Crescimento</h4>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="dia" 
                  label={{ value: "Dias", position: "insideBottom", offset: -5 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: "Δ Z-Score", angle: -90, position: "insideLeft" }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  formatter={(value: any) => value?.toFixed(2)}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Line 
                  type="monotone" 
                  dataKey="projecao" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Projeção"
                  dot={{ fill: "#3b82f6", r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Recomendação */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <div className="flex items-start gap-3">
              {getRecommendationIcon(prediction.recomendacao || "")}
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-2">Recomendação do Sistema</h4>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {prediction.recomendacao || "Sem recomendação disponível"}
                </p>
              </div>
            </div>
          </div>

          {/* Casos Similares Resumo */}
          {prediction.casosSimilares && prediction.casosSimilares.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-900 mb-1">
                    Baseado em {prediction.casosSimilares.length} casos similares
                  </h5>
                  <p className="text-sm text-blue-700">
                    Média de ganho: {(prediction.casosSimilares.reduce((acc, c) => acc + c.deltaZscoreReal, 0) / prediction.casosSimilares.length).toFixed(2)} no z-score
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado inicial sem dieta */}
      {!dietaAtual && !prediction && !loading && (
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">
                Nenhuma dieta registrada
              </h4>
              <p className="text-sm text-yellow-700">
                Configure um cenário de dieta acima e clique em "Gerar Predição" para ver as projeções de crescimento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


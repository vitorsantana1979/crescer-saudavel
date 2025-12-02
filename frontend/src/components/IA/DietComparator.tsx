import { useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Activity, Plus, Trash2, RefreshCw, Award, TrendingUp, CheckCircle } from "lucide-react";

interface DietComparatorProps {
  criancaId: string;
  crianca: {
    nome: string;
    classificacaoIG?: string;
  };
  pesoAtualKg: number;
  dietaAtual: {
    taxaEnergeticaKcalKg?: number;
    metaProteinaGKg?: number;
    frequenciaHoras: number;
  } | null;
}

interface DietScenario {
  id: string;
  nome: string;
  taxaEnergeticaKcalKg: number;
  metaProteinaGKg: number;
  frequenciaHoras: number;
}

interface ComparisonResult {
  ranking: number;
  cenario: DietScenario;
  predicao: {
    deltaZscorePred: number;
    probabilidadeMelhora: number;
    confiabilidade: string;
  };
  score: number;
}

export default function DietComparator({
  criancaId,
  crianca,
  pesoAtualKg,
  dietaAtual,
}: DietComparatorProps) {
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<DietScenario[]>([
    {
      id: "1",
      nome: "Conservadora",
      taxaEnergeticaKcalKg: 100,
      metaProteinaGKg: 3.0,
      frequenciaHoras: 3,
    },
    {
      id: "2",
      nome: "Moderada",
      taxaEnergeticaKcalKg: 120,
      metaProteinaGKg: 3.5,
      frequenciaHoras: 3,
    },
    {
      id: "3",
      nome: "Agressiva",
      taxaEnergeticaKcalKg: 140,
      metaProteinaGKg: 4.0,
      frequenciaHoras: 2,
    },
  ]);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);

  const handleAddScenario = () => {
    if (scenarios.length >= 10) {
      toast.error("Máximo de 10 cenários por comparação");
      return;
    }

    const newScenario: DietScenario = {
      id: `${Date.now()}`,
      nome: `Cenário ${scenarios.length + 1}`,
      taxaEnergeticaKcalKg: dietaAtual?.taxaEnergeticaKcalKg || 120,
      metaProteinaGKg: dietaAtual?.metaProteinaGKg || 3.5,
      frequenciaHoras: dietaAtual?.frequenciaHoras || 3,
    };

    setScenarios([...scenarios, newScenario]);
  };

  const handleRemoveScenario = (id: string) => {
    if (scenarios.length <= 2) {
      toast.error("Mínimo de 2 cenários necessários para comparação");
      return;
    }
    setScenarios(scenarios.filter((s) => s.id !== id));
  };

  const handleUpdateScenario = (id: string, field: keyof DietScenario, value: any) => {
    setScenarios(
      scenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleCompare = async () => {
    if (scenarios.length < 2) {
      toast.error("Adicione pelo menos 2 cenários para comparar");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(`/analytics/compare-diets/${criancaId}`, 
        scenarios.map(s => ({
          taxaEnergeticaKcalKg: s.taxaEnergeticaKcalKg,
          metaProteinaGKg: s.metaProteinaGKg,
          frequenciaHoras: s.frequenciaHoras,
        }))
      );

      // Mapear resultados com nomes dos cenários
      const resultsWithNames = response.data.comparacoes.map((result: any, index: number) => ({
        ...result,
        cenario: {
          ...result.cenario,
          nome: scenarios[index].nome,
        },
      }));

      setComparisonResults(resultsWithNames);
      toast.success("Comparação realizada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao comparar cenários:", error);
      
      if (error.response?.status === 503) {
        toast.error("Serviço de IA temporariamente indisponível");
      } else {
        toast.error("Erro ao comparar cenários de dieta");
      }
    } finally {
      setLoading(false);
    }
  };

  const getRankingBadge = (ranking: number) => {
    const badges = [
      { color: "bg-yellow-500 text-white", icon: "🥇" },
      { color: "bg-gray-400 text-white", icon: "🥈" },
      { color: "bg-orange-600 text-white", icon: "🥉" },
    ];

    if (ranking <= 3) {
      return (
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${badges[ranking - 1].color} font-bold text-sm`}>
          <span>{badges[ranking - 1].icon}</span>
          <span>#{ranking}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-200 text-gray-700 font-bold text-sm">
        <span>#{ranking}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cenários para Comparar */}
      <div className="bg-gray-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Cenários de Dieta
          </h3>
          <button
            onClick={handleAddScenario}
            disabled={scenarios.length >= 10}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Adicionar Cenário
          </button>
        </div>

        <div className="space-y-4">
          {scenarios.map((scenario, index) => (
            <div key={scenario.id} className="bg-white rounded-lg p-4 border">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {index + 1}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={scenario.nome}
                      onChange={(e) =>
                        handleUpdateScenario(scenario.id, "nome", e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Energia (kcal/kg)
                    </label>
                    <input
                      type="number"
                      value={scenario.taxaEnergeticaKcalKg}
                      onChange={(e) =>
                        handleUpdateScenario(
                          scenario.id,
                          "taxaEnergeticaKcalKg",
                          parseFloat(e.target.value)
                        )
                      }
                      min="80"
                      max="200"
                      step="5"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Proteína (g/kg)
                    </label>
                    <input
                      type="number"
                      value={scenario.metaProteinaGKg}
                      onChange={(e) =>
                        handleUpdateScenario(
                          scenario.id,
                          "metaProteinaGKg",
                          parseFloat(e.target.value)
                        )
                      }
                      min="1.5"
                      max="5"
                      step="0.1"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Frequência (h)
                    </label>
                    <input
                      type="number"
                      value={scenario.frequenciaHoras}
                      onChange={(e) =>
                        handleUpdateScenario(
                          scenario.id,
                          "frequenciaHoras",
                          parseFloat(e.target.value)
                        )
                      }
                      min="1"
                      max="24"
                      step="0.5"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveScenario(scenario.id)}
                  disabled={scenarios.length <= 2}
                  className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || scenarios.length < 2}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Comparando cenários...
            </>
          ) : (
            <>
              <Activity className="h-5 w-5" />
              Comparar {scenarios.length} Cenários
            </>
          )}
        </button>
      </div>

      {/* Resultados da Comparação */}
      {comparisonResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Resultados da Comparação
          </h3>

          {comparisonResults.map((result, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg p-6 border-2 transition-all ${
                result.ranking === 1
                  ? "border-yellow-400 shadow-lg"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getRankingBadge(result.ranking)}
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {result.cenario.nome}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {result.cenario.taxaEnergeticaKcalKg} kcal/kg • {result.cenario.metaProteinaGKg} g/kg proteína
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {result.score.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">Score</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-900">
                      Δ Z-Score Previsto
                    </span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    {result.predicao.deltaZscorePred > 0 ? "+" : ""}
                    {result.predicao.deltaZscorePred.toFixed(2)}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-900">
                      Prob. Melhora
                    </span>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {(result.predicao.probabilidadeMelhora * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-900">
                      Confiabilidade
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    {result.predicao.confiabilidade.toUpperCase()}
                  </p>
                </div>
              </div>

              {result.ranking === 1 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Award className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Este é o cenário mais promissor baseado nos dados históricos
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dica */}
      {comparisonResults.length === 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-2">
            <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-blue-900 mb-1">Como usar</h5>
              <p className="text-sm text-blue-700">
                Configure diferentes cenários de dieta e clique em "Comparar" para ver qual
                estratégia tem melhor expectativa de resultado segundo os dados históricos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


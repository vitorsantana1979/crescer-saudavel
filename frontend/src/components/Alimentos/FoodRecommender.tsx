import { useState } from "react";
import { Sparkles, TrendingUp, Info, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface AlimentoRecomendado {
  alimentoId: string;
  nome: string;
  categoria: string;
  probabilidadeSucesso: number;
  deltaZScoreEsperado: number;
  ranking: number;
  justificativa: string;
  energiaKcalPor100: number;
  proteinaGPor100: number;
}

interface RecommendationResponse {
  criancaPerfil: Record<string, any>;
  alimentosRecomendados: AlimentoRecomendado[];
  timestamp: string;
}

export default function FoodRecommender() {
  const [loading, setLoading] = useState(false);
  const [recomendacoes, setRecomendacoes] = useState<AlimentoRecomendado[]>([]);

  // Form state
  const [perfil, setPerfil] = useState({
    idadeGestacionalSemanas: 32,
    pesoAtualGr: 1500,
    sexo: "M",
    classificacaoIG: "prematuro_extremo",
    classificacaoPeso: "PIG",
    zscoreAtual: -2.0,
    diasDeVida: 7,
    topN: 10,
  });

  const handleRecommendar = async () => {
    setLoading(true);
    try {
      const payload = {
        perfil: {
          idade_gestacional_semanas: perfil.idadeGestacionalSemanas,
          peso_atual_gr: perfil.pesoAtualGr,
          sexo: perfil.sexo,
          classificacao_ig: perfil.classificacaoIG,
          classificacao_peso: perfil.classificacaoPeso,
          zscore_atual: perfil.zscoreAtual,
          dias_de_vida: perfil.diasDeVida,
        },
        top_n: perfil.topN,
      };

      const response = await api.post<any>(
        "/alimentos-analytics/recomendar",
        payload
      );

      // Backend retorna em snake_case devido aos [JsonPropertyName]
      const alimentosRaw = response.data.alimentos_recomendados || response.data.alimentosRecomendados || [];
      
      // Mapear snake_case para camelCase
      const alimentos = alimentosRaw.map((a: any) => ({
        alimentoId: a.alimento_id || a.alimentoId,
        nome: a.nome,
        categoria: a.categoria,
        probabilidadeSucesso: a.probabilidade_sucesso || a.probabilidadeSucesso,
        deltaZScoreEsperado: a.delta_zscore_esperado || a.deltaZScoreEsperado || 0,
        ranking: a.ranking,
        justificativa: a.justificativa,
        energiaKcalPor100: a.energia_kcal_por_100 || a.energiaKcalPor100,
        proteinaGPor100: a.proteina_g_por_100 || a.proteinaGPor100,
      }));
      
      setRecomendacoes(alimentos);
      toast.success(`${alimentos.length} alimentos recomendados!`);
    } catch (error: any) {
      console.error("Erro ao recomendar alimentos:", error);
      
      const errorMsg = error.response?.data?.message || "Erro ao processar recomendação";
      toast.error(errorMsg);
      
      // Se modelo não foi treinado, sugerir ao usuário
      if (errorMsg.includes("treinado") || errorMsg.includes("modelo")) {
        toast.error("Modelo ML não está treinado. Entre em contato com o administrador.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getProbabilidadeColor = (prob: number) => {
    if (prob >= 0.7) return "text-green-600";
    if (prob >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getProbabilidadeBg = (prob: number) => {
    if (prob >= 0.7) return "bg-green-100";
    if (prob >= 0.5) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Perfil */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-900">
          <Sparkles className="h-5 w-5" />
          Perfil da Criança para Recomendação
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idade Gestacional (semanas)
            </label>
            <input
              type="number"
              value={perfil.idadeGestacionalSemanas}
              onChange={(e) =>
                setPerfil({ ...perfil, idadeGestacionalSemanas: parseFloat(e.target.value) })
              }
              min="24"
              max="42"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peso Atual (gramas)
            </label>
            <input
              type="number"
              value={perfil.pesoAtualGr}
              onChange={(e) => setPerfil({ ...perfil, pesoAtualGr: parseInt(e.target.value) })}
              min="500"
              max="5000"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
            <select
              value={perfil.sexo}
              onChange={(e) => setPerfil({ ...perfil, sexo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classificação IG
            </label>
            <select
              value={perfil.classificacaoIG}
              onChange={(e) => setPerfil({ ...perfil, classificacaoIG: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="prematuro_extremo">Pré-termo Extremo (&lt;28sem)</option>
              <option value="prematuro_muito">Pré-termo Muito (28-32sem)</option>
              <option value="prematuro_moderado">Pré-termo Moderado (32-34sem)</option>
              <option value="prematuro_tardio">Pré-termo Tardio (34-37sem)</option>
              <option value="termo">A Termo (37-42sem)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classificação Peso
            </label>
            <select
              value={perfil.classificacaoPeso}
              onChange={(e) => setPerfil({ ...perfil, classificacaoPeso: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="PIG">PIG (Pequeno para IG)</option>
              <option value="AIG">AIG (Adequado para IG)</option>
              <option value="GIG">GIG (Grande para IG)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Z-Score Atual
            </label>
            <input
              type="number"
              value={perfil.zscoreAtual}
              onChange={(e) => setPerfil({ ...perfil, zscoreAtual: parseFloat(e.target.value) })}
              min="-5"
              max="5"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dias de Vida
            </label>
            <input
              type="number"
              value={perfil.diasDeVida}
              onChange={(e) => setPerfil({ ...perfil, diasDeVida: parseInt(e.target.value) })}
              min="0"
              max="365"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nº de Recomendações
            </label>
            <input
              type="number"
              value={perfil.topN}
              onChange={(e) => setPerfil({ ...perfil, topN: parseInt(e.target.value) })}
              min="5"
              max="20"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={handleRecommendar}
          disabled={loading}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Recomendar Alimentos com IA
            </>
          )}
        </button>
      </div>

      {/* Recomendações */}
      {recomendacoes && recomendacoes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Alimentos Recomendados (Top {recomendacoes.length})
          </h3>

          {recomendacoes.map((rec) => (
            <div
              key={rec.alimentoId}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                      rec.ranking <= 3 ? "bg-yellow-500" : "bg-gray-400"
                    }`}
                  >
                    #{rec.ranking}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{rec.nome}</h4>
                    <p className="text-sm text-gray-600">
                      {rec.categoria} | {rec.energiaKcalPor100.toFixed(0)} kcal |{" "}
                      {rec.proteinaGPor100.toFixed(1)}g proteína (por 100ml/g)
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-2xl font-bold ${getProbabilidadeColor(
                      rec.probabilidadeSucesso
                    )}`}
                  >
                    {(rec.probabilidadeSucesso * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-gray-500">Prob. Sucesso</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      rec.probabilidadeSucesso >= 0.7
                        ? "bg-green-600"
                        : rec.probabilidadeSucesso >= 0.5
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                    style={{ width: `${rec.probabilidadeSucesso * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className={`rounded-lg p-3 ${getProbabilidadeBg(rec.probabilidadeSucesso)}`}>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-gray-600 mt-0.5" />
                  <p className="text-sm text-gray-700">{rec.justificativa}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (!recomendacoes || recomendacoes.length === 0) && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Preencha o perfil da criança e clique em "Recomendar" para obter sugestões da IA</p>
        </div>
      )}
    </div>
  );
}


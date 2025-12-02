import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Users, TrendingUp, Activity, Calendar, Apple, RefreshCw } from "lucide-react";

interface SimilarCasesCardsProps {
  criancaId: string;
  crianca: {
    nome: string;
    sexo: string;
    idadeGestacionalSemanas: number;
    classificacaoIG?: string;
  };
}

interface SimilarCase {
  criancaId: string;
  sexo: string;
  idadeGestacionalSemanas: number;
  pesoNascimentoGr: number;
  classificacaoIG: string;
  taxaEnergeticaKcalKg: number;
  metaProteinaGKg: number;
  deltaZscoreReal: number;
  diasAcompanhamento: number;
  similarityScore: number;
}

export default function SimilarCasesCards({ criancaId, crianca }: SimilarCasesCardsProps) {
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<SimilarCase[]>([]);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchSimilarCases();
  }, [criancaId, limit]);

  const fetchSimilarCases = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/analytics/similar-cases/${criancaId}?limit=${limit}`);
      setCases(response.data);
    } catch (error: any) {
      console.error("Erro ao buscar casos similares:", error);
      
      if (error.response?.status === 503) {
        toast.error("Serviço de IA temporariamente indisponível");
      } else {
        toast.error("Erro ao buscar casos similares");
      }
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 0.6) return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-yellow-600 bg-yellow-50 border-yellow-200";
  };

  const getDeltaZScoreColor = (delta: number) => {
    if (delta > 10) return "text-green-600";
    if (delta > 5) return "text-blue-600";
    if (delta > 0) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-600">Buscando casos similares...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Casos Similares Bem-Sucedidos
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Pacientes com perfil similar que tiveram bons resultados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Mostrar:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          >
            <option value="5">5 casos</option>
            <option value="10">10 casos</option>
            <option value="20">20 casos</option>
          </select>
        </div>
      </div>

      {/* Info da Criança Atual */}
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
        <h4 className="font-medium text-primary mb-2">Perfil do Paciente Atual</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Sexo:</span>
            <span className="ml-2 font-medium">{crianca.sexo === "M" ? "Masculino" : "Feminino"}</span>
          </div>
          <div>
            <span className="text-gray-600">IG:</span>
            <span className="ml-2 font-medium">{crianca.idadeGestacionalSemanas} semanas</span>
          </div>
          <div>
            <span className="text-gray-600">Classificação:</span>
            <span className="ml-2 font-medium">{crianca.classificacaoIG || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-600">Sistema busca:</span>
            <span className="ml-2 font-medium text-primary">Casos parecidos</span>
          </div>
        </div>
      </div>

      {/* Cards de Casos */}
      {cases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((caso, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-primary/50 transition-all hover:shadow-md"
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    #{index + 1}
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">
                      Caso Similar
                    </h5>
                    <p className="text-xs text-gray-500">
                      {caso.sexo === "M" ? "Masculino" : "Feminino"} • {caso.classificacaoIG}
                    </p>
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded-lg border text-xs font-semibold ${getSimilarityColor(caso.similarityScore)}`}>
                  {(caso.similarityScore * 100).toFixed(0)}% similar
                </div>
              </div>

              {/* Dados do Paciente */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">IG:</span>
                  <span className="font-medium">{caso.idadeGestacionalSemanas} semanas</span>
                  <span className="mx-1 text-gray-300">•</span>
                  <span className="text-gray-600">Peso:</span>
                  <span className="font-medium">{(caso.pesoNascimentoGr / 1000).toFixed(3)} kg</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Apple className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Dieta:</span>
                  <span className="font-medium">{caso.taxaEnergeticaKcalKg} kcal/kg</span>
                  <span className="mx-1 text-gray-300">•</span>
                  <span className="font-medium">{caso.metaProteinaGKg} g/kg</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Acompanhamento:</span>
                  <span className="font-medium">{caso.diasAcompanhamento} dias</span>
                </div>
              </div>

              {/* Resultado */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Ganho de Z-Score</p>
                    <p className={`text-2xl font-bold ${getDeltaZScoreColor(caso.deltaZscoreReal)}`}>
                      {caso.deltaZscoreReal > 0 ? "+" : ""}
                      {caso.deltaZscoreReal.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-8 w-8 ${getDeltaZScoreColor(caso.deltaZscoreReal)}`} />
                  </div>
                </div>
                
                {caso.deltaZscoreReal > 10 && (
                  <div className="mt-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                    ✅ Excelente resultado
                  </div>
                )}
                {caso.deltaZscoreReal > 5 && caso.deltaZscoreReal <= 10 && (
                  <div className="mt-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    ✓ Bom resultado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum caso similar encontrado
          </h4>
          <p className="text-sm text-gray-600">
            Não foram encontrados casos com perfil similar no histórico.
          </p>
        </div>
      )}

      {/* Estatísticas Resumidas */}
      {cases.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h5 className="font-medium text-blue-900 mb-3">Estatísticas dos Casos Similares</h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700 mb-1">Total de Casos</p>
              <p className="text-2xl font-bold text-blue-900">{cases.length}</p>
            </div>
            <div>
              <p className="text-blue-700 mb-1">Ganho Médio Z-Score</p>
              <p className="text-2xl font-bold text-blue-900">
                +{(cases.reduce((acc, c) => acc + c.deltaZscoreReal, 0) / cases.length).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-blue-700 mb-1">Energia Média</p>
              <p className="text-2xl font-bold text-blue-900">
                {(cases.reduce((acc, c) => acc + c.taxaEnergeticaKcalKg, 0) / cases.length).toFixed(0)}
                <span className="text-sm font-normal ml-1">kcal/kg</span>
              </p>
            </div>
            <div>
              <p className="text-blue-700 mb-1">Proteína Média</p>
              <p className="text-2xl font-bold text-blue-900">
                {(cases.reduce((acc, c) => acc + c.metaProteinaGKg, 0) / cases.length).toFixed(1)}
                <span className="text-sm font-normal ml-1">g/kg</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


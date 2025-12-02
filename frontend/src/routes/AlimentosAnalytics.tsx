import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import FoodPerformanceTable from "@/components/Alimentos/FoodPerformanceTable";
import FoodRecommender from "@/components/Alimentos/FoodRecommender";
import FoodCombinationAnalyzer from "@/components/Alimentos/FoodCombinationAnalyzer";
import FoodTimeline from "@/components/Alimentos/FoodTimeline";
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  Calendar,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";

interface AlimentoPerformance {
  alimentoId: string;
  nome: string;
  categoria: string;
  totalUsos: number;
  totalCriancas: number;
  mediaGanhoPesoGrDia: number;
  mediaDeltaZScore: number;
  taxaSucesso: number;
  mediaEnergiaKcal: number;
  mediaProteinaG: number;
  diasAcompanhamentoMedio: number;
  confiabilidade: string;
}

interface CombinacaoAlimentos {
  alimentoIds: string[];
  nomesAlimentos: string[];
  totalUsos: number;
  mediaDeltaZScore: number;
  taxaSucesso: number;
  perfilCrianca: string;
}

interface DashboardData {
  periodoInicio: string;
  periodoFim: string;
  totalAlimentos: number;
  totalUsos: number;
  performance: AlimentoPerformance[];
  melhoresCombinacoes: CombinacaoAlimentos[];
  alimentoMaisUsado: AlimentoPerformance | null;
  alimentoMelhorResultado: AlimentoPerformance | null;
}

interface Filter {
  dataInicio: string | null;
  dataFim: string | null;
  tipoCrianca: string | null;
  classificacoesIG: string[];
  classificacoesPeso: string[];
  idadeGestacionalMin: number | null;
  idadeGestacionalMax: number | null;
}

export default function AlimentosAnalytics() {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<
    "performance" | "recomendacao" | "combinacoes" | "timeline"
  >("performance");
  const [selectedAlimentoId, setSelectedAlimentoId] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // Filtros
  const [filter, setFilter] = useState<Filter>({
    dataInicio: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 6 meses atrás
    dataFim: new Date().toISOString().split("T")[0],
    tipoCrianca: null,
    classificacoesIG: [],
    classificacoesPeso: [],
    idadeGestacionalMin: null,
    idadeGestacionalMax: null,
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const startTime = performance.now();
    
    try {
      const response = await api.post("/alimentos-analytics/dashboard", filter);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);
      
      setDashboardData(response.data);
      setResponseTime(responseTimeMs);
      
      // Verificar se foi do cache (tempo < 100ms indica cache)
      const isCached = responseTimeMs < 100;
      setFromCache(isCached);
      
      // Log detalhado de performance
      console.log("📊 Performance do Dashboard:");
      console.log(`  ⏱️ Tempo de resposta: ${responseTimeMs}ms`);
      console.log(`  🗄️ Fonte: ${isCached ? "Cache (instantâneo)" : "Banco de dados (calculado)"}`);
      console.log(`  📈 Alimentos analisados: ${response.data.totalAlimentos}`);
      console.log(`  👶 Total de usos: ${response.data.totalUsos}`);
      
      // Avaliar performance e mostrar toast apropriado
      if (responseTimeMs < 100) {
        toast.success(`✨ Dados carregados do cache (${responseTimeMs}ms) - Instantâneo!`);
      } else if (responseTimeMs < 3000) {
        toast.success(`✅ Dados carregados em ${(responseTimeMs / 1000).toFixed(1)}s - Excelente!`);
      } else if (responseTimeMs < 8000) {
        toast.success(`⚡ Dados carregados em ${(responseTimeMs / 1000).toFixed(1)}s - Bom`);
      } else {
        toast(`⏳ Dados carregados em ${(responseTimeMs / 1000).toFixed(1)}s - Considere aplicar filtros`, {
          icon: "⚠️",
          duration: 5000,
        });
      }
      
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      toast.error("Erro ao carregar analytics de alimentos");
      setResponseTime(null);
      setFromCache(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    loadDashboard();
    setShowFilters(false);
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.post("/alimentos-analytics/export/excel", filter, {
        responseType: "blob",
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `alimentos-analytics-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics de Alimentos"
        icon={BarChart3}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <Filter className="w-5 h-5" />
              {showFilters ? "Ocultar" : "Filtros"}
            </button>
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-5 h-5" />
              Exportar CSV
            </button>
          </div>
        }
      />

      {/* Painel de Filtros */}
      {showFilters && (
        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filtros de Análise
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={filter.dataInicio || ""}
                onChange={(e) => setFilter({ ...filter, dataInicio: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={filter.dataFim || ""}
                onChange={(e) => setFilter({ ...filter, dataFim: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Criança
              </label>
              <select
                value={filter.tipoCrianca || ""}
                onChange={(e) => setFilter({ ...filter, tipoCrianca: e.target.value || null })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todos</option>
                <option value="pretermo">Pré-termo</option>
                <option value="termo">A Termo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IG Mínima (semanas)
              </label>
              <input
                type="number"
                value={filter.idadeGestacionalMin || ""}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    idadeGestacionalMin: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                min="24"
                max="42"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IG Máxima (semanas)
              </label>
              <input
                type="number"
                value={filter.idadeGestacionalMax || ""}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    idadeGestacionalMax: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                min="24"
                max="42"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="42"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Filter className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <strong>💡 Dica de Performance:</strong> Filtros mais específicos (período menor, 
                tipo de criança) melhoram o tempo de resposta. Análise processa até 1.000 crianças 
                únicas por requisição.
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyFilter}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
          >
            Aplicar Filtros
          </button>
        </div>
      )}

      {/* Indicador de Performance */}
      {responseTime !== null && (
        <div
          className={`rounded-lg p-4 border ${
            responseTime < 100
              ? "bg-purple-50 border-purple-200"
              : responseTime < 3000
              ? "bg-green-50 border-green-200"
              : responseTime < 8000
              ? "bg-yellow-50 border-yellow-200"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {responseTime < 100 ? (
                  <span className="text-2xl">✨</span>
                ) : responseTime < 3000 ? (
                  <span className="text-2xl">⚡</span>
                ) : responseTime < 8000 ? (
                  <span className="text-2xl">✅</span>
                ) : (
                  <span className="text-2xl">⏳</span>
                )}
                <span className="font-semibold text-gray-900">
                  {fromCache
                    ? "Cache Hit - Instantâneo"
                    : responseTime < 3000
                    ? "Performance Excelente"
                    : responseTime < 8000
                    ? "Performance Boa"
                    : "Performance Aceitável"}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Tempo de resposta: <span className="font-bold">{responseTime}ms</span>
                {fromCache && " (dados do cache)"}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Limites de Processamento:</div>
              <div className="text-xs text-gray-600">
                • Máx 1.000 crianças únicas<br />
                • Máx 100 crianças por alimento<br />
                • Cache de 5 minutos
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total de Alimentos</span>
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{dashboardData.totalAlimentos}</p>
            <p className="text-xs text-gray-500 mt-1">Analisados no período</p>
          </div>

          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total de Usos</span>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{dashboardData.totalUsos}</p>
            <p className="text-xs text-gray-500 mt-1">Aplicações em dietas</p>
          </div>

          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Mais Usado</span>
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-600">
              {dashboardData.alimentoMaisUsado?.nome || "N/A"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {dashboardData.alimentoMaisUsado?.totalUsos || 0} usos
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Melhor Resultado</span>
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-lg font-bold text-yellow-600">
              {dashboardData.alimentoMelhorResultado?.nome || "N/A"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Δ Z-Score: +{dashboardData.alimentoMelhorResultado?.mediaDeltaZScore.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("performance")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "performance"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Performance de Alimentos
            </button>
            <button
              onClick={() => setActiveTab("recomendacao")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "recomendacao"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Recomendação Inteligente
            </button>
            <button
              onClick={() => setActiveTab("combinacoes")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "combinacoes"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Combinações Efetivas
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "timeline"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Evolução Temporal
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "performance" && dashboardData && (
            <FoodPerformanceTable
              performance={dashboardData.performance}
              onSelectAlimento={(id) => {
                setSelectedAlimentoId(id);
                setActiveTab("timeline");
              }}
            />
          )}

          {activeTab === "recomendacao" && <FoodRecommender />}

          {activeTab === "combinacoes" && dashboardData && (
            <FoodCombinationAnalyzer combinacoes={dashboardData.melhoresCombinacoes} />
          )}

          {activeTab === "timeline" && selectedAlimentoId && (
            <FoodTimeline
              alimentoId={selectedAlimentoId}
              dataInicio={filter.dataInicio || undefined}
              dataFim={filter.dataFim || undefined}
            />
          )}

          {activeTab === "timeline" && !selectedAlimentoId && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Selecione um alimento na aba "Performance" para ver a evolução temporal</p>
            </div>
          )}
        </div>
      </div>

      {/* Informações sobre Otimizações e Limites */}
      {dashboardData && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            ℹ️ Sobre a Análise de Dados
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-700">
            <div>
              <div className="font-semibold text-gray-900 mb-1">🎯 Limites de Processamento</div>
              <ul className="space-y-1">
                <li>• Máximo de <strong>1.000 crianças únicas</strong> por análise</li>
                <li>• Máximo de <strong>100 crianças por alimento</strong></li>
                <li>• Mínimo de <strong>3 usos</strong> para combinações</li>
                <li>• Período padrão: <strong>últimos 6 meses</strong></li>
              </ul>
            </div>
            
            <div>
              <div className="font-semibold text-gray-900 mb-1">⚡ Otimizações Aplicadas</div>
              <ul className="space-y-1">
                <li>✅ Batch queries (1 query vs 2.000+)</li>
                <li>✅ Cache inteligente (5 minutos)</li>
                <li>✅ Índices SQL otimizados</li>
                <li>✅ Processamento em memória</li>
              </ul>
            </div>
            
            <div>
              <div className="font-semibold text-gray-900 mb-1">📊 Confiabilidade dos Dados</div>
              <ul className="space-y-1">
                <li>
                  <span className="inline-block w-12 px-1 py-0.5 bg-green-100 text-green-800 rounded text-center mr-1">
                    Alta
                  </span>
                  ≥ 30 casos
                </li>
                <li>
                  <span className="inline-block w-12 px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded text-center mr-1">
                    Média
                  </span>
                  10-29 casos
                </li>
                <li>
                  <span className="inline-block w-12 px-1 py-0.5 bg-red-100 text-red-800 rounded text-center mr-1">
                    Baixa
                  </span>
                  &lt; 10 casos
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import GrowthPrediction from "@/components/IA/GrowthPrediction";
import DietComparator from "@/components/IA/DietComparator";
import SimilarCasesCards from "@/components/IA/SimilarCasesCards";
import {
  Brain,
  ArrowLeft,
  Activity,
  TrendingUp,
  Users,
  AlertCircle,
  Apple,
} from "lucide-react";

interface Crianca {
  id: string;
  nome: string;
  sexo: string;
  dataNascimento: string;
  idadeGestacionalSemanas: number;
  idadeGestacionalDias?: number;
  pesoNascimentoGr: number;
  comprimentoCm?: number;
  perimetroCefalicoCm?: number;
  classificacaoIG?: string;
  classificacaoPN?: string;
}

interface Consulta {
  id: string;
  dataHora: string;
  pesoKg: number;
  estaturaCm: number;
  perimetroCefalicoCm: number;
  zScorePeso?: number;
  zScoreAltura?: number;
}

interface Dieta {
  id: string;
  dataInicio: string;
  taxaEnergeticaKcalKg?: number;
  metaProteinaGKg?: number;
  pesoReferenciaKg?: number;
  frequenciaHoras: number;
}

export default function IAInsights() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [crianca, setCrianca] = useState<Crianca | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [dietaAtual, setDietaAtual] = useState<Dieta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "prediction" | "comparison" | "similar"
  >("prediction");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Carregar dados da criança
      const criancaRes = await api.get(`/recemnascido/${id}`);
      setCrianca(criancaRes.data);

      // Carregar consultas
      const consultasRes = await api.get(`/consultas/crianca/${id}`);
      setConsultas(
        consultasRes.data.sort(
          (a: Consulta, b: Consulta) =>
            new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
        )
      );

      // Carregar dieta atual
      try {
        const dietasRes = await api.get(`/dietas/crianca/${id}`);
        const dietas = dietasRes.data;
        const dietaAtiva = dietas.find((d: Dieta) => !d.dataFim);
        if (dietaAtiva) {
          setDietaAtual(dietaAtiva);
        }
      } catch (err) {
        console.log("Nenhuma dieta encontrada");
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do paciente");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando insights de IA...</p>
        </div>
      </div>
    );
  }

  if (!crianca) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium">Paciente não encontrado</p>
          <button
            onClick={() => navigate("/criancas")}
            className="mt-4 text-primary hover:underline"
          >
            Voltar para lista de pacientes
          </button>
        </div>
      </div>
    );
  }

  const ultimaConsulta = consultas[0];
  const pesoAtualKg = ultimaConsulta?.pesoKg || crianca.pesoNascimentoGr / 1000;
  const zScoreAtual = ultimaConsulta?.zScorePeso || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights de IA"
        subtitle="Predições e recomendações baseadas em Machine Learning"
        icon={Brain}
      />

      {/* Aviso Importante */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              ⚠️ AVISO IMPORTANTE
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                As predições e sugestões são baseadas em dados históricos e
                modelos estatísticos.
                <strong className="font-semibold">
                  {" "}
                  NÃO substituem avaliação clínica profissional.
                </strong>
              </p>
              <p className="mt-1">
                Decisões finais devem sempre considerar o julgamento da equipe
                médica e as particularidades de cada caso.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo do Paciente */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{crianca.nome}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {crianca.sexo === "M" ? "Masculino" : "Feminino"} • IG:{" "}
              {crianca.idadeGestacionalSemanas}
              {crianca.idadeGestacionalDias
                ? `+${crianca.idadeGestacionalDias}`
                : ""}{" "}
              sem • Peso Nascimento:{" "}
              {(crianca.pesoNascimentoGr / 1000).toFixed(3)} kg
            </p>
          </div>
          <button
            onClick={() => navigate(`/crianca/${id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Detalhes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Peso Atual
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {(pesoAtualKg * 1000).toFixed(0)} g
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {pesoAtualKg.toFixed(3)} kg
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                Z-Score Peso
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {zScoreAtual.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 mt-1">Última consulta</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Apple className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                Dieta Atual
              </span>
            </div>
            {dietaAtual ? (
              <>
                <p className="text-2xl font-bold text-purple-600">
                  {dietaAtual.taxaEnergeticaKcalKg || "-"} kcal/kg
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {dietaAtual.metaProteinaGKg || "-"} g/kg proteína
                </p>
              </>
            ) : (
              <p className="text-sm text-purple-600">Sem dieta registrada</p>
            )}
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                Classificação
              </span>
            </div>
            <p className="text-sm font-bold text-orange-600">
              {crianca.classificacaoIG || "N/A"}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {crianca.classificacaoPN || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("prediction")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "prediction"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Predição de Crescimento
              </div>
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "comparison"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Comparação de Cenários
              </div>
            </button>
            <button
              onClick={() => setActiveTab("similar")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "similar"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Casos Similares
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "prediction" && (
            <GrowthPrediction
              criancaId={id!}
              crianca={crianca}
              pesoAtualKg={pesoAtualKg}
              dietaAtual={dietaAtual}
            />
          )}
          {activeTab === "comparison" && (
            <DietComparator
              criancaId={id!}
              crianca={crianca}
              pesoAtualKg={pesoAtualKg}
              dietaAtual={dietaAtual}
            />
          )}
          {activeTab === "similar" && (
            <SimilarCasesCards criancaId={id!} crianca={crianca} />
          )}
        </div>
      </div>
    </div>
  );
}

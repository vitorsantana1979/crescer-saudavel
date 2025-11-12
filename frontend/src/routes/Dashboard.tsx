import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Users, Baby, TrendingUp, AlertCircle, Apple, UserCheck, Calendar, Activity } from "lucide-react";

interface Stats {
  totalCriancas: number;
  criancasPreTermo: number;
  atendimentosHoje: number;
  alertas: number;
  totalAlimentos: number;
  totalProfissionais: number;
}

interface Atendimento {
  id: string;
  dataHora: string;
  pesoKg: number;
  estaturaCm: number;
  perimetroCefalicoCm: number;
  zScorePeso?: number | null;
  zScoreAltura?: number | null;
  zScorePerimetro?: number | null;
  crianca: {
    id: string;
    nome: string;
  };
}

interface Alerta {
  id: string;
  dataHora: string;
  zScorePeso?: number | null;
  zScoreAltura?: number | null;
  zScorePerimetro?: number | null;
  crianca: {
    id: string;
    nome: string;
  };
  tipoAlerta: string;
  severidade: "critico" | "alerta" | "atencao";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalCriancas: 0,
    criancasPreTermo: 0,
    atendimentosHoje: 0,
    alertas: 0,
    totalAlimentos: 0,
    totalProfissionais: 0,
  });
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas
      const statsResponse = await api.get("/dashboard/stats");
      setStats(statsResponse.data);

      // Carregar últimos atendimentos
      const atendimentosResponse = await api.get("/dashboard/ultimos-atendimentos?limit=5");
      setAtendimentos(atendimentosResponse.data);

      // Carregar alertas
      const alertasResponse = await api.get("/dashboard/alertas?limit=5");
      setAlertas(alertasResponse.data);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatZScore = (zScore: number | null | undefined) => {
    if (zScore === null || zScore === undefined) return "-";
    return zScore.toFixed(2);
  };

  const getZScoreColor = (zScore: number | null | undefined) => {
    if (zScore === null || zScore === undefined) return "text-gray-500";
    if (zScore < -2 || zScore > 2) return "text-red-600 font-semibold";
    if (zScore < -1 || zScore > 1) return "text-orange-600";
    return "text-green-600";
  };

  const getSeveridadeColor = (severidade: string) => {
    switch (severidade) {
      case "critico":
        return "bg-red-100 text-red-800 border-red-200";
      case "alerta":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const cards = [
    {
      title: "Total de Crianças",
      value: stats.totalCriancas,
      icon: Users,
      color: "bg-primary",
      textColor: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate("/criancas"),
    },
    {
      title: "Crianças Pré-termo",
      value: stats.criancasPreTermo,
      icon: Baby,
      color: "bg-secondary",
      textColor: "text-secondary",
      bgColor: "bg-secondary/10",
      onClick: () => navigate("/criancas"),
    },
    {
      title: "Atendimentos Hoje",
      value: stats.atendimentosHoje,
      icon: Calendar,
      color: "bg-primary",
      textColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Alertas Ativos",
      value: stats.alertas,
      icon: AlertCircle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-100",
      onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
    },
    {
      title: "Alimentos",
      value: stats.totalAlimentos,
      icon: Apple,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-100",
      onClick: () => navigate("/alimentos"),
    },
    {
      title: "Profissionais",
      value: stats.totalProfissionais,
      icon: UserCheck,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-100",
      onClick: () => navigate("/profissionais"),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              onClick={card.onClick}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all ${
                card.onClick ? "cursor-pointer hover:border-primary" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos Atendimentos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Últimos Atendimentos
            </h3>
            {atendimentos.length > 0 && (
              <button
                onClick={() => navigate("/criancas")}
                className="text-sm text-primary hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>
          <div className="space-y-3">
            {atendimentos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Nenhum atendimento registrado ainda.
              </p>
            ) : (
              atendimentos.map((atendimento) => (
                <div
                  key={atendimento.id}
                  onClick={() => navigate(`/criancas/detalhes/${atendimento.crianca.id}`)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {atendimento.crianca.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(atendimento.dataHora)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Peso:</span>
                      <span className={`ml-1 ${getZScoreColor(atendimento.zScorePeso)}`}>
                        {atendimento.pesoKg.toFixed(2)} kg
                      </span>
                      {atendimento.zScorePeso && (
                        <span className={`ml-1 text-xs ${getZScoreColor(atendimento.zScorePeso)}`}>
                          (Z: {formatZScore(atendimento.zScorePeso)})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Altura:</span>
                      <span className={`ml-1 ${getZScoreColor(atendimento.zScoreAltura)}`}>
                        {atendimento.estaturaCm.toFixed(1)} cm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">PC:</span>
                      <span className={`ml-1 ${getZScoreColor(atendimento.zScorePerimetro)}`}>
                        {atendimento.perimetroCefalicoCm.toFixed(1)} cm
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alertas Importantes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Alertas Importantes
            </h3>
            {alertas.length > 0 && (
              <span className="text-xs text-gray-500">
                {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {alertas.length === 0 ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
                  <AlertCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-gray-500 text-sm">Nenhum alerta no momento.</p>
              </div>
            ) : (
              alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  onClick={() => navigate(`/criancas/detalhes/${alerta.crianca.id}`)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${getSeveridadeColor(alerta.severidade)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">
                        {alerta.crianca.nome}
                      </p>
                      <p className="text-xs opacity-75">
                        {formatDate(alerta.dataHora)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getSeveridadeColor(alerta.severidade)}`}>
                      {alerta.severidade === "critico" ? "Crítico" : 
                       alerta.severidade === "alerta" ? "Alerta" : "Atenção"}
                    </span>
                  </div>
                  <p className="text-xs font-medium mb-1">{alerta.tipoAlerta}</p>
                  <div className="flex gap-3 text-xs opacity-75">
                    {alerta.zScorePeso && (
                      <span>Peso: Z {formatZScore(alerta.zScorePeso)}</span>
                    )}
                    {alerta.zScoreAltura && (
                      <span>Altura: Z {formatZScore(alerta.zScoreAltura)}</span>
                    )}
                    {alerta.zScorePerimetro && (
                      <span>PC: Z {formatZScore(alerta.zScorePerimetro)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resumo Rápido */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Resumo do Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-gray-600 mb-1">Taxa de Prematuros</p>
            <p className="text-2xl font-bold text-primary">
              {stats.totalCriancas > 0
                ? ((stats.criancasPreTermo / stats.totalCriancas) * 100).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.criancasPreTermo} de {stats.totalCriancas} crianças
            </p>
          </div>
          <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
            <p className="text-sm text-gray-600 mb-1">Média de Atendimentos</p>
            <p className="text-2xl font-bold text-secondary">
              {stats.atendimentosHoje}
            </p>
            <p className="text-xs text-gray-500 mt-1">Atendimentos hoje</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Recursos Cadastrados</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.totalAlimentos + stats.totalProfissionais}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalAlimentos} alimentos • {stats.totalProfissionais} profissionais
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

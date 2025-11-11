import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Users, Baby, TrendingUp, AlertCircle } from "lucide-react";

interface Stats {
  totalCriancas: number;
  criancasPreTermo: number;
  atendimentosHoje: number;
  alertas: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCriancas: 0,
    criancasPreTermo: 0,
    atendimentosHoje: 0,
    alertas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulando dados por enquanto - posteriormente virá da API
    setTimeout(() => {
      setStats({
        totalCriancas: 24,
        criancasPreTermo: 8,
        atendimentosHoje: 5,
        alertas: 3,
      });
      setLoading(false);
    }, 500);
  }, []);

  const cards = [
    {
      title: "Total de Crianças",
      value: stats.totalCriancas,
      icon: Users,
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
    },
    {
      title: "Crianças Pré-termo",
      value: stats.criancasPreTermo,
      icon: Baby,
      color: "bg-orange-500",
      textColor: "text-orange-700",
      bgColor: "bg-orange-50",
    },
    {
      title: "Atendimentos Hoje",
      value: stats.atendimentosHoje,
      icon: TrendingUp,
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
    },
    {
      title: "Alertas Ativos",
      value: stats.alertas,
      icon: AlertCircle,
      color: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-3xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Últimos Atendimentos</h3>
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">
              Nenhum atendimento registrado ainda.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Alertas Importantes
          </h3>
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">Nenhum alerta no momento.</p>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          Gráfico de Crescimento (Em desenvolvimento)
        </h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-400">Área para gráficos de Z-Score</p>
        </div>
      </div>
    </div>
  );
}

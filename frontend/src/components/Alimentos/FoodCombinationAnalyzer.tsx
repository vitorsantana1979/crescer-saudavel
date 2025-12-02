import { TrendingUp, TrendingDown, Users, Award } from "lucide-react";

interface CombinacaoAlimentos {
  alimentoIds: string[];
  nomesAlimentos: string[];
  totalUsos: number;
  mediaDeltaZScore: number;
  taxaSucesso: number;
  perfilCrianca: string;
}

interface Props {
  combinacoes: CombinacaoAlimentos[];
}

export default function FoodCombinationAnalyzer({ combinacoes }: Props) {
  const getDeltaColor = (delta: number) => {
    if (delta > 0.5) return "text-green-600";
    if (delta > 0) return "text-green-500";
    if (delta < -0.5) return "text-red-600";
    return "text-gray-600";
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <TrendingUp className="h-4 w-4" />;
    if (delta < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  if (combinacoes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
        <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma combinação de alimentos encontrada no período analisado.</p>
        <p className="text-sm mt-2">
          Combinações aparecem quando uma dieta contém 2 ou mais alimentos diferentes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Sobre Combinações Efetivas
        </h4>
        <p className="text-sm text-blue-800">
          Estas combinações de alimentos foram usadas em conjunto em dietas e apresentaram
          melhores resultados. Use como referência para criar planos nutricionais completos.
        </p>
      </div>

      <div className="grid gap-4">
        {combinacoes.map((comb, idx) => (
          <div
            key={idx}
            className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                    #{idx + 1}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Combinação de {comb.nomesAlimentos.length} Alimentos
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {comb.nomesAlimentos.map((nome, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                    >
                      {nome}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {comb.totalUsos} usos em dietas
                    </span>
                  </div>
                  <div className="px-2 py-1 bg-gray-100 rounded text-xs">
                    Perfil: {comb.perfilCrianca}
                  </div>
                </div>
              </div>

              <div className="text-right space-y-2">
                <div>
                  <div className={`text-2xl font-bold flex items-center gap-1 justify-end ${getDeltaColor(comb.mediaDeltaZScore)}`}>
                    {getDeltaIcon(comb.mediaDeltaZScore)}
                    {comb.mediaDeltaZScore > 0 ? "+" : ""}
                    {comb.mediaDeltaZScore.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500">Δ Z-Score Médio</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${Math.min(comb.taxaSucesso, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{comb.taxaSucesso.toFixed(0)}%</span>
                </div>
                <p className="text-xs text-gray-500">Taxa de Sucesso</p>
              </div>
            </div>

            {/* Indicador de performance */}
            <div className="mt-4 pt-4 border-t">
              {comb.mediaDeltaZScore > 0.5 && comb.taxaSucesso > 60 ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                  <Award className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    🌟 Combinação Altamente Recomendada - Excelentes resultados!
                  </span>
                </div>
              ) : comb.mediaDeltaZScore > 0 ? (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded-lg p-3">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Combinação Efetiva - Resultados positivos observados
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span className="text-sm">
                    Resultados variados - Avaliar perfil específico da criança
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


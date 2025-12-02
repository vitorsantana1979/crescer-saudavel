import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Eye, ArrowUpDown } from "lucide-react";

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

interface Props {
  performance: AlimentoPerformance[];
  onSelectAlimento: (alimentoId: string) => void;
}

type SortField = keyof AlimentoPerformance;
type SortDirection = "asc" | "desc";

export default function FoodPerformanceTable({ performance, onSelectAlimento }: Props) {
  const [sortField, setSortField] = useState<SortField>("mediaDeltaZScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = [...performance]
    .filter((item) => item.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    });

  const getConfiabilidadeColor = (conf: string) => {
    switch (conf.toLowerCase()) {
      case "alta":
        return "bg-green-100 text-green-800";
      case "media":
      case "média":
        return "bg-yellow-100 text-yellow-800";
      case "baixa":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDeltaZScoreIcon = (delta: number) => {
    if (delta > 0.5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (delta < -0.5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div>
        <input
          type="text"
          placeholder="Buscar alimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="nome" label="Alimento" />
              <SortHeader field="categoria" label="Categoria" />
              <SortHeader field="totalUsos" label="Total Usos" />
              <SortHeader field="totalCriancas" label="Crianças" />
              <SortHeader field="mediaGanhoPesoGrDia" label="Ganho Peso (g/dia)" />
              <SortHeader field="mediaDeltaZScore" label="Δ Z-Score" />
              <SortHeader field="taxaSucesso" label="Taxa Sucesso %" />
              <SortHeader field="confiabilidade" label="Confiabilidade" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item) => (
              <tr key={item.alimentoId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                      <div className="text-xs text-gray-500">
                        {item.mediaEnergiaKcal.toFixed(0)} kcal | {item.mediaProteinaG.toFixed(1)}g proteína
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                    {item.categoria}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {item.totalUsos}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.totalCriancas}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.mediaGanhoPesoGrDia.toFixed(1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {getDeltaZScoreIcon(item.mediaDeltaZScore)}
                    <span
                      className={`text-sm font-medium ${
                        item.mediaDeltaZScore > 0
                          ? "text-green-600"
                          : item.mediaDeltaZScore < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {item.mediaDeltaZScore > 0 ? "+" : ""}
                      {item.mediaDeltaZScore.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min(item.taxaSucesso, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">{item.taxaSucesso.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfiabilidadeColor(item.confiabilidade)}`}>
                    {item.confiabilidade.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onSelectAlimento(item.alimentoId)}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Timeline
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Nenhum alimento encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
}


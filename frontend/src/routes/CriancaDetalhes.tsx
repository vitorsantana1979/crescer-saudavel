import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import GraficosZScore from "@/components/GraficosZScore";
import {
  Baby,
  Edit,
  Activity,
  Apple,
  Calendar,
  TrendingUp,
  Weight,
  Ruler,
  Circle,
  Trash2,
  Search,
} from "lucide-react";

interface Crianca {
  id: string;
  nome: string;
  sexo: string;
  dataNascimento: string;
  idadeGestacionalSemanas: number;
  pesoNascimentoGr: number;
  comprimentoCm?: number;
  perimetroCefalicoCm?: number;
}

interface Consulta {
  id: string;
  dataHora: string;
  pesoKg: number;
  estaturaCm: number;
  perimetroCefalicoCm: number;
  zScorePeso?: number;
  zScoreAltura?: number;
  zScorePerimetro?: number;
}

interface Dieta {
  id: string;
  dataInicio: string;
  dataFim?: string;
  frequenciaHoras: number;
  itens: DietaItem[];
}

interface DietaItem {
  id: string;
  quantidade: number;
  energiaTotalKcal?: number;
  proteinaTotalG?: number;
}

export default function CriancaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();

  const calcularIdadeEmSemanasDias = (
    dataConsulta: string,
    dataNascimento?: string,
    idadeGestacionalSemanas?: number
  ) => {
    if (!dataNascimento) {
      const consultaAtual = new Date(dataConsulta);
      const primeiraConsulta = consultas[0]
        ? new Date(consultas[0].dataHora)
        : consultaAtual;
      const dias = Math.max(
        0,
        Math.round(
          (consultaAtual.getTime() - primeiraConsulta.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const semanas = Math.floor(dias / 7);
      const diasRestantes = dias % 7;
      return { semanas, dias: diasRestantes };
    }

    const nascimento = new Date(dataNascimento);
    const consultaAtual = new Date(dataConsulta);
    const diasDeVida = Math.max(
      0,
      Math.round(
        (consultaAtual.getTime() - nascimento.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    let semanasTotais = diasDeVida / 7;
    if ((idadeGestacionalSemanas ?? 0) > 0) {
      semanasTotais += idadeGestacionalSemanas ?? 0;
    }

    const totalDias = Math.round(semanasTotais * 7);
    const semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;
    return { semanas, dias };
  };

  const formatarIdadeSemanasDias = (
    dataConsulta: string,
    dataNascimento?: string
  ) => {
    const { semanas, dias } = calcularIdadeEmSemanasDias(
      dataConsulta,
      dataNascimento,
      crianca?.idadeGestacionalSemanas
    );
    if (dias === 0) {
      return `${semanas} sem`;
    }
    return `${semanas}+${dias} sem`;
  };

  const [crianca, setCrianca] = useState<Crianca | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"consultas" | "dietas">(
    "consultas"
  );
  const [todasCriancas, setTodasCriancas] = useState<Crianca[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [consultasSelecionadasIds, setConsultasSelecionadasIds] = useState<string[]>([]);
  const [consultasPlotadas, setConsultasPlotadas] = useState<Consulta[]>([]);

  useEffect(() => {
    loadData();
    loadTodasCriancas();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCrianca(), loadConsultas(), loadDietas()]);
    } finally {
      setLoading(false);
    }
  };

  const loadTodasCriancas = async () => {
    try {
      const response = await api.get("/recemnascido");
      setTodasCriancas(response.data);
    } catch (error) {
      console.error("Erro ao carregar lista de crianças:", error);
    }
  };

  const loadCrianca = async () => {
    try {
      const response = await api.get(`/recemnascido/${id}`);
      setCrianca(response.data);
    } catch (error) {
      toast.error("Erro ao carregar dados da criança");
    }
  };

  const loadConsultas = async () => {
    try {
      const response = await api.get(`/consultas/crianca/${id}`);
      setConsultas(response.data);
    } catch (error) {
      console.error("Erro ao carregar consultas:", error);
      setConsultas([]);
    }
  };

  const loadDietas = async () => {
    try {
      const response = await api.get(`/dietas/crianca/${id}`);
      setDietas(response.data);
    } catch (error) {
      console.error("Erro ao carregar dietas:", error);
      setDietas([]);
    }
  };

  const alternarSelecaoConsulta = (consultaId: string) => {
    setConsultasSelecionadasIds((prev) =>
      prev.includes(consultaId)
        ? prev.filter((item) => item !== consultaId)
        : [...prev, consultaId]
    );
  };

  const selecionarTodasConsultas = () => {
    setConsultasSelecionadasIds(consultas.map((consulta) => consulta.id));
  };

  const limparSelecaoConsultas = () => {
    setConsultasSelecionadasIds([]);
  };

  const plotarConsultasSelecionadas = () => {
    if (consultasSelecionadasIds.length === 0) {
      toast.error("Selecione ao menos um atendimento para plotar.");
      return;
    }

    const selecionadas = consultas
      .filter((consulta) => consultasSelecionadasIds.includes(consulta.id))
      .sort(
        (a, b) =>
          new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
      );

    if (selecionadas.length === 0) {
      toast.error("Não foi possível localizar os atendimentos selecionados.");
      return;
    }

    setConsultasPlotadas(selecionadas);
  };

  const limparGrafico = () => {
    setConsultasPlotadas([]);
  };

  useEffect(() => {
    setConsultasSelecionadasIds([]);
    setConsultasPlotadas([]);
  }, [id]);

  useEffect(() => {
    setConsultasSelecionadasIds((prev) =>
      prev.filter((consultaId) =>
        consultas.some((consulta) => consulta.id === consultaId)
      )
    );
    setConsultasPlotadas((prev) =>
      prev.filter((consulta) =>
        consultas.some((item) => item.id === consulta.id)
      )
    );
  }, [consultas]);

  const zScoreChartData = useMemo(() => {
    const sortedConsultas = [...consultas].sort(
      (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
    );

    const formatLabel = (isoDate: string) =>
      new Date(isoDate).toLocaleDateString("pt-BR");

    return {
      peso: sortedConsultas.map((consulta) => ({
        label: formatLabel(consulta.dataHora),
        value:
          consulta.zScorePeso === undefined
            ? null
            : Number.isFinite(consulta.zScorePeso)
            ? consulta.zScorePeso
            : null,
      })),
      comprimento: sortedConsultas.map((consulta) => ({
        label: formatLabel(consulta.dataHora),
        value:
          consulta.zScoreAltura === undefined
            ? null
            : Number.isFinite(consulta.zScoreAltura)
            ? consulta.zScoreAltura
            : null,
      })),
      perimetro: sortedConsultas.map((consulta) => ({
        label: formatLabel(consulta.dataHora),
        value:
          consulta.zScorePerimetro === undefined
            ? null
            : Number.isFinite(consulta.zScorePerimetro)
            ? consulta.zScorePerimetro
            : null,
      })),
    };
  }, [consultas]);

  const handleDeleteConsulta = async (consultaId: string) => {
    if (!confirm("Deseja realmente excluir esta consulta?")) return;

    try {
      await api.delete(`/consultas/${consultaId}`);
      toast.success("Consulta excluída com sucesso!");
      loadConsultas();
    } catch (error) {
      toast.error("Erro ao excluir consulta");
    }
  };

  const handleDeleteDieta = async (dietaId: string) => {
    if (!confirm("Deseja realmente excluir esta dieta?")) return;

    try {
      await api.delete(`/dietas/${dietaId}`);
      toast.success("Dieta excluída com sucesso!");
      loadDietas();
    } catch (error) {
      toast.error("Erro ao excluir dieta");
    }
  };

  const getZScoreColor = (zScore?: number) => {
    if (!zScore) return "text-gray-500";
    if (zScore < -2) return "text-red-600";
    if (zScore < -1) return "text-orange-600";
    if (zScore > 2) return "text-red-600";
    if (zScore > 1) return "text-orange-600";
    return "text-green-600";
  };

  const getZScoreIcon = (zScore?: number) => {
    if (!zScore) return <Circle className="w-3 h-3" />;
    if (Math.abs(zScore) < 1)
      return <Circle className="w-3 h-3 fill-current" />;
    if (Math.abs(zScore) < 2) return <Circle className="w-3 h-3" />;
    return <Circle className="w-3 h-3 fill-current" />;
  };

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const diffMs = hoje.getTime() - nascimento.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 30) {
      return `${diffDias} dias`;
    } else if (diffDias < 365) {
      const meses = Math.floor(diffDias / 30);
      return `${meses} ${meses === 1 ? "mês" : "meses"}`;
    } else {
      const anos = Math.floor(diffDias / 365);
      const meses = Math.floor((diffDias % 365) / 30);
      return `${anos} ${anos === 1 ? "ano" : "anos"}${
        meses > 0 ? ` e ${meses} ${meses === 1 ? "mês" : "meses"}` : ""
      }`;
    }
  };

  if (loading || !crianca) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const isPreTermo = crianca.idadeGestacionalSemanas < 37;

  const criancasFiltradas = todasCriancas.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSelecionados = consultasSelecionadasIds.length;
  const todosSelecionados =
    consultas.length > 0 && totalSelecionados === consultas.length;
  const possuiPontosPlotados = consultasPlotadas.length > 0;

  return (
    <div className="space-y-6">
      {/* Busca Rápida de Paciente */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar outro paciente..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchOpen(e.target.value.length > 0);
            }}
            onFocus={() => setSearchOpen(true)}
            className="flex-1 px-3 py-2 border-0 focus:ring-0 focus:outline-none"
          />
        </div>

        {searchOpen && searchTerm && (
          <div className="mt-2 border-t border-gray-200 pt-2 max-h-60 overflow-y-auto">
            {criancasFiltradas.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">
                Nenhum paciente encontrado
              </p>
            ) : (
              <div className="space-y-1">
                {criancasFiltradas.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      navigate(`/criancas/detalhes/${c.id}`);
                      setSearchTerm("");
                      setSearchOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {c.nome}
                    </p>
                    <p className="text-xs text-gray-500">
                      {c.sexo === "M" ? "Masculino" : "Feminino"} •{" "}
                      {c.idadeGestacionalSemanas} semanas
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PageHeader
        title={crianca.nome}
        subtitle={`${
          crianca.sexo === "M" ? "Masculino" : "Feminino"
        } • ${calcularIdade(crianca.dataNascimento)} • ${
          isPreTermo ? "Pré-termo" : "A termo"
        }`}
        icon={Baby}
        action={{
          label: "Editar Cadastro",
          onClick: () => navigate(`/criancas/editar/${id}`),
          icon: Edit,
        }}
      />

      {/* Cards de Informações */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Data de Nascimento</p>
              <p className="text-sm font-semibold">
                {new Date(crianca.dataNascimento).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Idade Gestacional</p>
              <p className="text-sm font-semibold">
                {crianca.idadeGestacionalSemanas} semanas
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Weight className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Peso ao Nascer</p>
              <p className="text-sm font-semibold">
                {crianca.pesoNascimentoGr?.toLocaleString("pt-BR")} g
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Ruler className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-xs text-gray-500">Comprimento</p>
              <p className="text-sm font-semibold">
                {crianca.comprimentoCm ? `${crianca.comprimentoCm} cm` : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/criancas/${id}/consulta/nova`)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Activity className="w-5 h-5" />
          Novo Atendimento
        </button>
        <button
          onClick={() => navigate(`/criancas/${id}/dieta/nova`)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Apple className="w-5 h-5" />
          Nova Dietoterapia
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("graficos")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "graficos"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Gráficos
            </button>
            <button
              onClick={() => setActiveTab("consultas")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "consultas"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Atendimentos ({consultas.length})
            </button>
            <button
              onClick={() => setActiveTab("dietas")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "dietas"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Dietoterapias ({dietas.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "graficos" ? (
            <GraficosZScore
              consultasSelecionadas={consultasPlotadas}
              sexo={crianca.sexo}
              idadeGestacionalSemanas={crianca.idadeGestacionalSemanas}
              dataNascimento={crianca.dataNascimento}
            />
          ) : activeTab === "consultas" ? (
            <div>
              {consultas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum atendimento registrado</p>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button
                      onClick={plotarConsultasSelecionadas}
                      disabled={totalSelecionados === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        totalSelecionados === 0
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      Plotar selecionados
                    </button>
                    <button
                      onClick={limparGrafico}
                      disabled={!possuiPontosPlotados}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !possuiPontosPlotados
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Limpar gráfico
                    </button>
                    <span className="text-xs text-gray-500">
                      Selecionados: {totalSelecionados} • Plotados:{" "}
                      {consultasPlotadas.length}
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={selecionarTodasConsultas}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Selecionar todos
                    </button>
                    <button
                      onClick={limparSelecaoConsultas}
                      disabled={totalSelecionados === 0}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        totalSelecionados === 0
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Limpar seleção
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-green-600 rounded border-gray-300"
                            checked={todosSelecionados}
                            onChange={(event) =>
                              event.target.checked
                                ? selecionarTodasConsultas()
                                : limparSelecaoConsultas()
                            }
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Data/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Peso (kg)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Estatura (cm)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          PC (cm)
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Z-Scores
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {consultas.map((consulta) => (
                        <tr key={consulta.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-green-600 rounded border-gray-300"
                              checked={consultasSelecionadasIds.includes(
                                consulta.id
                              )}
                              onChange={() => alternarSelecaoConsulta(consulta.id)}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col">
                              <span>
                                {new Date(consulta.dataHora).toLocaleString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                              <span className="text-xs text-gray-500">
                                Idade:{" "}
                                {formatarIdadeSemanasDias(
                                  consulta.dataHora,
                                  crianca.dataNascimento
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {consulta.pesoKg.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {consulta.estaturaCm.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {consulta.perimetroCefalicoCm.toFixed(1)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-3">
                              <div
                                className="flex items-center gap-1"
                                title="Z-Score Peso"
                              >
                                {getZScoreIcon(consulta.zScorePeso)}
                                <span
                                  className={`text-xs font-semibold ${getZScoreColor(
                                    consulta.zScorePeso
                                  )}`}
                                >
                                  {consulta.zScorePeso?.toFixed(1) || "-"}
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1"
                                title="Z-Score Altura"
                              >
                                {getZScoreIcon(consulta.zScoreAltura)}
                                <span
                                  className={`text-xs font-semibold ${getZScoreColor(
                                    consulta.zScoreAltura
                                  )}`}
                                >
                                  {consulta.zScoreAltura?.toFixed(1) || "-"}
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1"
                                title="Z-Score PC"
                              >
                                {getZScoreIcon(consulta.zScorePerimetro)}
                                <span
                                  className={`text-xs font-semibold ${getZScoreColor(
                                    consulta.zScorePerimetro
                                  )}`}
                                >
                                  {consulta.zScorePerimetro?.toFixed(1) || "-"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  navigate(
                                    `/criancas/${id}/consulta/${consulta.id}`
                                  )
                                }
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteConsulta(consulta.id)
                                }
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {dietas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Apple className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma dietoterapia registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dietas.map((dieta) => (
                    <div
                      key={dieta.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Período:{" "}
                            {new Date(dieta.dataInicio).toLocaleDateString(
                              "pt-BR"
                            )}
                            {dieta.dataFim
                              ? ` até ${new Date(
                                  dieta.dataFim
                                ).toLocaleDateString("pt-BR")}`
                              : " (em andamento)"}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              De {dieta.frequenciaHoras} em{" "}
                              {dieta.frequenciaHoras}h
                            </span>
                            <p className="text-xs text-gray-500">
                              {dieta.itens.length} alimento(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`/criancas/${id}/dieta/${dieta.id}`)
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDieta(dieta.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

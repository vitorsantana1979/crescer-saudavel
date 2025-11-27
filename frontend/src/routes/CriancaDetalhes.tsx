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
  AlertCircle,
} from "lucide-react";
import {
  classificarIdadeGestacional,
  classificarPesoNascimento,
  formatarIdadeGestacional,
  formatarPeso,
} from "@/lib/classificacoes";

interface Crianca {
  id: string;
  nome: string;
  sexo: string;
  dataNascimento: string;
  idadeGestacionalSemanas: number;
  idadeGestacionalDias?: number;
  idadeGestacionalCorrigidaSemanas?: number;
  idadeGestacionalCorrigidaDias?: number;
  classificacaoIG?: string;
  tipoParto?: string;
  apgar1Minuto?: number;
  apgar5Minuto?: number;
  pesoNascimentoGr: number;
  classificacaoPN?: string;
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
  const [activeTab, setActiveTab] = useState<"graficos" | "consultas" | "dietas">(
    "graficos"
  );
  const [todasCriancas, setTodasCriancas] = useState<Crianca[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  useEffect(() => {
    setConsultasPlotadas([]);
  }, [id]);

  // Plotar automaticamente todas as consultas quando carregarem
  useEffect(() => {
    if (consultas.length > 0) {
      const consultasOrdenadas = [...consultas].sort(
        (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
      );
      setConsultasPlotadas(consultasOrdenadas);
    }
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
    return "text-primary";
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

  const calcularIdadeCronologica = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const diffMs = hoje.getTime() - nascimento.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDias;
  };

  const calcularIGC = (
    dataNascimento: string,
    idadeGestacionalSemanas: number,
    idadeGestacionalDias: number = 0,
    dataAtual: Date = new Date()
  ): { semanas: number; dias: number } => {
    const nascimento = new Date(dataNascimento);
    const diffMs = dataAtual.getTime() - nascimento.getTime();
    const diasVida = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Converter idade cronológica para semanas e dias
    const semanasVida = Math.floor(diasVida / 7);
    const diasRestantes = diasVida % 7;

    // Somar IG ao nascimento + idade cronológica
    let semanasTotais = idadeGestacionalSemanas + semanasVida;
    let diasTotais = idadeGestacionalDias + diasRestantes;

    // Ajustar se dias >= 7
    if (diasTotais >= 7) {
      semanasTotais += Math.floor(diasTotais / 7);
      diasTotais = diasTotais % 7;
    }

    return { semanas: semanasTotais, dias: diasTotais };
  };

  const formatarIdadeGestacional = (
    semanas: number,
    dias?: number
  ): string => {
    if (dias !== undefined && dias !== null && dias > 0) {
      return `${semanas} semanas e ${dias} dia${dias > 1 ? "s" : ""}`;
    }
    return `${semanas} semanas`;
  };

  if (loading || !crianca) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPreTermo = crianca.idadeGestacionalSemanas < 37;

  const criancasFiltradas = todasCriancas.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xs text-gray-500">IG ao Nascimento</p>
              <p className="text-sm font-semibold">
                {formatarIdadeGestacional(
                  crianca.idadeGestacionalSemanas,
                  crianca.idadeGestacionalDias
                )}
              </p>
            </div>
          </div>
        </div>

        {isPreTermo && (() => {
          const igc = calcularIGC(
            crianca.dataNascimento,
            crianca.idadeGestacionalSemanas,
            crianca.idadeGestacionalDias || 0
          );
          return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-indigo-600" />
                <div>
                  <p className="text-xs text-gray-500">IGC (calculada)</p>
                  <p className="text-sm font-semibold">
                    {formatarIdadeGestacional(igc.semanas, igc.dias)}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Classificação por IG */}
        {crianca.idadeGestacionalSemanas && (
          (() => {
            const classif = classificarIdadeGestacional(crianca.idadeGestacionalSemanas);
            return (
              <div className={`col-span-full rounded-lg shadow-sm border-2 p-4 ${classif.cor}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">
                      Classificação segundo a Idade Gestacional (IG)
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">IG:</span>{" "}
                        {formatarIdadeGestacional(
                          crianca.idadeGestacionalSemanas,
                          crianca.idadeGestacionalDias
                        )}
                      </p>
                      <p>
                        <span className="font-medium">Classificação:</span>{" "}
                        <span className="font-bold">{classif.sigla}</span> - {classif.descricao}
                      </p>
                      <p className="text-xs opacity-75">{classif.faixa}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Idade Cronológica</p>
              <p className="text-sm font-semibold">
                {calcularIdadeCronologica(crianca.dataNascimento)} dia
                {calcularIdadeCronologica(crianca.dataNascimento) !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Weight className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-gray-500">Peso ao Nascer</p>
              <p className="text-sm font-semibold">
                {crianca.pesoNascimentoGr?.toLocaleString("pt-BR")} g
              </p>
            </div>
          </div>
        </div>

        {/* Classificação por Peso */}
        {crianca.pesoNascimentoGr && (
          (() => {
            const classif = classificarPesoNascimento(crianca.pesoNascimentoGr);
            return (
              <div className={`col-span-full rounded-lg shadow-sm border-2 p-4 ${classif.cor}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">
                      Classificação segundo o Peso ao Nascer (PN)
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">PN:</span>{" "}
                        {crianca.pesoNascimentoGr} g ({formatarPeso(crianca.pesoNascimentoGr)})
                      </p>
                      <p>
                        <span className="font-medium">Classificação:</span>{" "}
                        <span className="font-bold">{classif.nome}</span>
                      </p>
                      <p className="text-xs opacity-75">{classif.faixa}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}

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

        {crianca.tipoParto && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Baby className="w-8 h-8 text-pink-600" />
              <div>
                <p className="text-xs text-gray-500">Tipo de Parto</p>
                <p className="text-sm font-semibold">{crianca.tipoParto}</p>
              </div>
            </div>
          </div>
        )}

        {(crianca.apgar1Minuto !== undefined ||
          crianca.apgar5Minuto !== undefined) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-xs text-gray-500">Apgar</p>
                <p className="text-sm font-semibold">
                  {crianca.apgar1Minuto !== undefined &&
                  crianca.apgar5Minuto !== undefined
                    ? `${crianca.apgar1Minuto}/${crianca.apgar5Minuto}`
                    : crianca.apgar1Minuto !== undefined
                    ? `${crianca.apgar1Minuto}/-`
                    : `-/${crianca.apgar5Minuto}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/criancas/${id}/consulta/nova`)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
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
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Gráficos
            </button>
            <button
              onClick={() => setActiveTab("consultas")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "consultas"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Atendimentos ({consultas.length})
            </button>
            <button
              onClick={() => setActiveTab("dietas")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === "dietas"
                  ? "text-primary border-b-2 border-primary"
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
              idadeGestacionalDias={crianca.idadeGestacionalDias}
              dataNascimento={crianca.dataNascimento}
              nomeCrianca={crianca.nome}
              pesoNascimentoGr={crianca.pesoNascimentoGr}
              comprimentoCm={crianca.comprimentoCm}
              perimetroCefalicoNascimentoCm={crianca.perimetroCefalicoCm}
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
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
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

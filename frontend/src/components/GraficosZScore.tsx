import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
} from "recharts";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface CurvaReferencia {
  semanas: number;
  zN3: number;
  zN2: number;
  zN1: number;
  z0: number;
  zP1: number;
  zP2: number;
  zP3: number;
}

interface ConsultaItem {
    id: string;
    dataHora: string;
    pesoKg: number;
    estaturaCm: number;
    perimetroCefalicoCm: number;
  zScorePeso?: number;
  zScoreAltura?: number;
  zScorePerimetro?: number;
}

interface DietaItem {
  id: string;
  alimentoId: string;
  quantidade: number;
  energiaTotalKcal?: number;
  proteinaTotalG?: number;
  alimento?: {
    nome: string;
    categoria: string;
    unidade: string;
    energiaKcalPor100?: number;
    proteinaGPor100?: number;
  };
}

interface DietaAtual {
  id: string;
  dataInicio: string;
  dataFim?: string;
  frequenciaHoras: number;
  taxaEnergeticaKcalKg?: number;
  metaProteinaGKg?: number;
  pesoReferenciaKg?: number;
  viaAdministracao?: string;
  observacoes?: string;
  itens: DietaItem[];
}

interface GraficosZScoreProps {
  consultasSelecionadas?: ConsultaItem[];
  sexo?: string; // "M" ou "F"
  idadeGestacionalSemanas?: number; // Semanas de gestação ao nascimento
  idadeGestacionalDias?: number; // Dias de gestação ao nascimento (0-6)
  dataNascimento?: string; // Data de nascimento para calcular idade corrigida
  nomeCrianca?: string; // Nome do recém-nascido
  pesoNascimentoGr?: number; // Peso ao nascer em gramas
  comprimentoCm?: number; // Comprimento ao nascer em cm
  perimetroCefalicoNascimentoCm?: number; // Perímetro cefálico ao nascer em cm
  tipoParto?: string; // Tipo de parto
  apgar1Minuto?: number; // Apgar 1 minuto
  apgar5Minuto?: number; // Apgar 5 minutos
  dietaAtual?: DietaAtual; // Dieta atual do RN
}

// Cores das curvas de referência conforme padrão OMS/Intergrowth
const CORES_Z_SCORE = {
  zN3: "#000000", // Preto para Z-3
  zN2: "#DC2626", // Vermelho para Z-2
  zN1: "#000000", // Preto para Z-1
  z0: "#10B981",  // Verde para Z0 (mediana)
  zP1: "#000000", // Preto para Z+1
  zP2: "#DC2626", // Vermelho para Z+2
  zP3: "#000000", // Preto para Z+3
};

// Cores dos eixos e títulos conforme sexo (padrão OMS)
const CORES_SEXO = {
  M: {
    // Azul para meninos
    primaria: "#2196F3",      // Azul principal
    secundaria: "#1976D2",    // Azul escuro
    texto: "#1565C0",          // Azul para texto
    eixo: "#2196F3",           // Cor dos eixos
  },
  F: {
    // Rosa para meninas
    primaria: "#E91E63",      // Rosa principal
    secundaria: "#C2185B",    // Rosa escuro
    texto: "#AD1457",          // Rosa para texto
    eixo: "#E91E63",           // Cor dos eixos
  },
};

const PRETERMO_LEGEND = [
  { label: "Z+3 (P99,9)", color: CORES_Z_SCORE.zP3 },
  { label: "Z+2 (P97,7)", color: CORES_Z_SCORE.zP2 },
  { label: "Z+1 (P84,1)", color: CORES_Z_SCORE.zP1 },
  { label: "Z 0 (P50)", color: CORES_Z_SCORE.z0 },
  { label: "Z-1 (P15,9)", color: CORES_Z_SCORE.zN1 },
  { label: "Z-2 (P2,3)", color: CORES_Z_SCORE.zN2 },
  { label: "Z-3 (P0,1)", color: CORES_Z_SCORE.zN3 },
];

export default function GraficosZScore({
  consultasSelecionadas = [],
  sexo = "M",
  idadeGestacionalSemanas = 40,
  idadeGestacionalDias = 0,
  dataNascimento,
  nomeCrianca,
  pesoNascimentoGr,
  comprimentoCm,
  perimetroCefalicoNascimentoCm,
  tipoParto,
  apgar1Minuto,
  apgar5Minuto,
  dietaAtual,
}: GraficosZScoreProps) {
  const [curvasReferencia, setCurvasReferencia] = useState<CurvaReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoCurva, setTipoCurva] = useState<string>("OMS");
  const [exportando, setExportando] = useState(false);
  const [zoomIntervalo, setZoomIntervalo] = useState<[number, number] | null>(null);
  const areaGraficoRef = useRef<HTMLDivElement>(null);
  const cardCompletoRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const [exportandoCard, setExportandoCard] = useState(false);
  const [copiando, setCopiando] = useState(false);
  
  // Determinar se é pré-termo (< 37 semanas gestacionais)
  const ehPretermo = idadeGestacionalSemanas < 37;
  
  // Inicializar altura do gráfico baseado no tipo (pré-termo ou a termo)
  const [chartHeight, setChartHeight] = useState<number>(ehPretermo ? 960 : 1200);

  // Cálculos para exibição de dados do RN
  const calcularIdadeCronologica = useMemo(() => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const diffMs = hoje.getTime() - nascimento.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [dataNascimento]);

  const calcularIGCAtual = useMemo(() => {
    if (!dataNascimento || !idadeGestacionalSemanas) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const diffMs = hoje.getTime() - nascimento.getTime();
    const diasVida = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const semanasVida = Math.floor(diasVida / 7);
    const diasRestantes = diasVida % 7;
    
    let semanasTotais = idadeGestacionalSemanas + semanasVida;
    let diasTotais = (idadeGestacionalDias || 0) + diasRestantes;
    
    if (diasTotais >= 7) {
      semanasTotais += Math.floor(diasTotais / 7);
      diasTotais = diasTotais % 7;
    }
    
    return { semanas: semanasTotais, dias: diasTotais };
  }, [dataNascimento, idadeGestacionalSemanas, idadeGestacionalDias]);

  // Obter peso atual e calcular diferença
  const pesoAtualInfo = useMemo(() => {
    if (!consultasSelecionadas || consultasSelecionadas.length === 0 || !pesoNascimentoGr) {
      return null;
    }
    const consultasOrdenadas = [...consultasSelecionadas].sort(
      (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
    );
    const ultimaConsulta = consultasOrdenadas[0];
    const pesoAtualGr = ultimaConsulta.pesoKg * 1000;
    const diferenca = pesoAtualGr - pesoNascimentoGr;
    return {
      pesoGr: pesoAtualGr,
      diferenca,
      dataConsulta: ultimaConsulta.dataHora,
    };
  }, [consultasSelecionadas, pesoNascimentoGr]);

  // Calcular totais de energia e proteína da dieta
  const totaisDieta = useMemo(() => {
    // Permitir mostrar mesmo sem itens, se tiver taxa/meta definida
    if (!dietaAtual) {
      return null;
    }
    
    // Peso de referência: usa o definido na dieta, ou peso atual, ou peso nascimento
    const pesoKg = dietaAtual.pesoReferenciaKg 
      || (pesoAtualInfo ? pesoAtualInfo.pesoGr / 1000 : null) 
      || ((pesoNascimentoGr || 0) / 1000);
    
    // Necessidades definidas pelo profissional (taxa × peso)
    const necessidadeEnergetica = (dietaAtual.taxaEnergeticaKcalKg && pesoKg) 
      ? dietaAtual.taxaEnergeticaKcalKg * pesoKg 
      : null;
    const necessidadeProteica = (dietaAtual.metaProteinaGKg && pesoKg) 
      ? dietaAtual.metaProteinaGKg * pesoKg 
      : null;
    
    // Calcular energia e proteína fornecidas pelos itens da dieta
    const totalEnergiaPorMamada = dietaAtual.itens?.reduce((acc, item) => {
      if (item.energiaTotalKcal && item.energiaTotalKcal > 0) {
        return acc + item.energiaTotalKcal;
      }
      if (item.alimento?.energiaKcalPor100 && item.quantidade) {
        return acc + (item.quantidade * item.alimento.energiaKcalPor100 / 100);
      }
      return acc;
    }, 0) || 0;
    
    const totalProteinaPorMamada = dietaAtual.itens?.reduce((acc, item) => {
      if (item.proteinaTotalG && item.proteinaTotalG > 0) {
        return acc + item.proteinaTotalG;
      }
      if (item.alimento?.proteinaGPor100 && item.quantidade) {
        return acc + (item.quantidade * item.alimento.proteinaGPor100 / 100);
      }
      return acc;
    }, 0) || 0;
    
    // Frequência por dia (24h / frequencia em horas)
    const frequenciaDia = 24 / dietaAtual.frequenciaHoras;
    
    // Total diário fornecido pela dieta
    const energiaDiariaFornecida = totalEnergiaPorMamada * frequenciaDia;
    const proteinaDiariaFornecida = totalProteinaPorMamada * frequenciaDia;
    
    // Por kg fornecido
    const energiaKgDiaFornecida = pesoKg > 0 ? energiaDiariaFornecida / pesoKg : 0;
    const proteinaKgDiaFornecida = pesoKg > 0 ? proteinaDiariaFornecida / pesoKg : 0;
    
    // Percentuais de adequação (fornecido / necessidade × 100)
    const adequacaoEnergia = necessidadeEnergetica && necessidadeEnergetica > 0 
      ? (energiaDiariaFornecida / necessidadeEnergetica) * 100 
      : null;
    const adequacaoProteina = necessidadeProteica && necessidadeProteica > 0 
      ? (proteinaDiariaFornecida / necessidadeProteica) * 100 
      : null;
    
    return {
      // Parâmetros definidos pelo profissional
      taxaEnergetica: dietaAtual.taxaEnergeticaKcalKg,
      metaProteica: dietaAtual.metaProteinaGKg,
      pesoReferencia: pesoKg,
      viaAdministracao: dietaAtual.viaAdministracao,
      
      // Necessidades calculadas (taxa × peso)
      necessidadeEnergetica,
      necessidadeProteica,
      
      // Valores fornecidos pela dieta
      energiaPorMamada: totalEnergiaPorMamada,
      proteinaPorMamada: totalProteinaPorMamada,
      energiaDiaria: energiaDiariaFornecida,
      proteinaDiaria: proteinaDiariaFornecida,
      energiaKgDia: energiaKgDiaFornecida,
      proteinaKgDia: proteinaKgDiaFornecida,
      frequenciaDia,
      
      // Adequação (%)
      adequacaoEnergia,
      adequacaoProteina,
    };
  }, [dietaAtual, pesoAtualInfo, pesoNascimentoGr]);

  // Histórico de peso para tabela
  const historicoConsultas = useMemo(() => {
    if (!consultasSelecionadas || consultasSelecionadas.length === 0 || !dataNascimento) {
      return [];
    }
    
    return consultasSelecionadas
      .map((consulta) => {
        const dataConsulta = new Date(consulta.dataHora);
        const nascimento = new Date(dataNascimento);
        const diasVida = Math.floor((dataConsulta.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calcular IGC para cada consulta
        const semanasVida = Math.floor(diasVida / 7);
        const diasRestantes = diasVida % 7;
        
        let igcSemanas = idadeGestacionalSemanas + semanasVida;
        let igcDias = (idadeGestacionalDias || 0) + diasRestantes;
        
        if (igcDias >= 7) {
          igcSemanas += Math.floor(igcDias / 7);
          igcDias = igcDias % 7;
        }
        
        return {
          id: consulta.id,
          data: dataConsulta,
          igcSemanas,
          igcDias,
          pesoKg: consulta.pesoKg,
          estaturaCm: consulta.estaturaCm,
          perimetroCefalicoCm: consulta.perimetroCefalicoCm,
          zScorePeso: consulta.zScorePeso,
        };
      })
      .sort((a, b) => a.data.getTime() - b.data.getTime());
  }, [consultasSelecionadas, dataNascimento, idadeGestacionalSemanas, idadeGestacionalDias]);

  // Função para calcular IGC (Idade Gestacional Corrigida)
  const calcularIGC = (
    dataConsulta: Date,
    dataNascimento: string,
    idadeGestacionalSemanas: number,
    idadeGestacionalDias: number
  ): number => {
    const nascimento = new Date(dataNascimento);
    const msPorDia = 24 * 60 * 60 * 1000;
    const diasVida = Math.floor(
      (dataConsulta.getTime() - nascimento.getTime()) / msPorDia
    );
    
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
    
    // Retornar semanas totais como decimal (incluindo fração de dias)
    return semanasTotais + (diasTotais / 7);
  };

  useEffect(() => {
    const loadCurvas = async () => {
      try {
        setLoading(true);
        const sexoParam = sexo === "F" ? "f" : "m";
        
        // Escolher endpoint baseado em pré-termo ou padrão
        const endpoint = ehPretermo 
          ? `/referencias/pretermo/peso/${sexoParam}/curvas`
          : `/referencias/padrao/peso/${sexoParam}/curvas`;
        
        const tipo = ehPretermo ? "INTERGROWTH" : "OMS";
        setTipoCurva(tipo);
        
        const response = await api.get(endpoint);
        const dados = response.data.map((item: any) => ({
          semanas: item.semanas,
          zN3: item.zN3,
          zN2: item.zN2,
          zN1: item.zN1,
          z0: item.z0,
          zP1: item.zP1,
          zP2: item.zP2,
          zP3: item.zP3,
        }));
        setCurvasReferencia(dados);
      } catch (error) {
        console.error("Erro ao carregar curvas de referência:", error);
        setCurvasReferencia([]);
      } finally {
        setLoading(false);
      }
    };

    loadCurvas();
  }, [sexo, ehPretermo]);

  useEffect(() => {
    setZoomIntervalo(null);
    // Resetar altura quando mudar o tipo de gráfico
    setChartHeight(ehPretermo ? 960 : 1200);
  }, [sexo, ehPretermo]);

  // Handlers para redimensionamento vertical
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = chartHeight;
  }, [chartHeight]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaY = e.clientY - resizeStartY.current;
    const newHeight = Math.max(400, Math.min(2000, resizeStartHeight.current + deltaY));
    setChartHeight(newHeight);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const pontosPacienteMemo = useMemo(() => {
    if (!consultasSelecionadas || consultasSelecionadas.length === 0) {
      return { pontos: [], houveConversao: false };
    }

    const consultasOrdenadas = [...consultasSelecionadas].sort(
      (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
    );
    const msPorDia = 24 * 60 * 60 * 1000;
    const primeiroAtendimento = new Date(consultasOrdenadas[0].dataHora);

    let houveConversao = false;
    const pontos = consultasOrdenadas
      .map((consulta) => {
        let peso = consulta.pesoKg;
        if (peso == null || Number.isNaN(peso)) return null;

        if (peso > 15) {
          peso = Number((peso / 1000).toFixed(3));
          houveConversao = true;
        }

        const dataConsulta = new Date(consulta.dataHora);
        let semanasTotais: number | null = null;

        if (dataNascimento) {
          if (ehPretermo) {
            // Para pré-termo: usar IGC (IG ao nascimento + idade cronológica)
            semanasTotais = calcularIGC(
              dataConsulta,
              dataNascimento,
              idadeGestacionalSemanas,
              idadeGestacionalDias || 0
            );
            
            // Limite de 64 semanas de IGC para Intergrowth
            if (semanasTotais > 64) {
              return null;
            }
            
            // Limite mínimo de 27 semanas para Intergrowth
            if (semanasTotais < 27) {
              return null;
            }
          } else {
            // Para a termo: usar idade cronológica (semanas desde nascimento)
            const nascimento = new Date(dataNascimento);
            const diasDeVida = Math.floor(
              (dataConsulta.getTime() - nascimento.getTime()) / msPorDia
            );
            semanasTotais = diasDeVida / 7;
            
            // Limite máximo de 64 semanas para OMS também
            if (semanasTotais > 64) {
              return null;
            }
          }
        } else {
          const diasDesdePrimeira = Math.floor(
            (dataConsulta.getTime() - primeiroAtendimento.getTime()) / msPorDia
          );
          semanasTotais = diasDesdePrimeira / 7;
        }

        if (!Number.isFinite(semanasTotais)) return null;

        // Para gráficos OMS (a termo), não filtrar por peso máximo (até 30 kg)
        // O filtro será feito pelo domínio do eixo Y

        const totalDias = Math.round(semanasTotais * 7);
        const semanasInt = Math.floor(totalDias / 7);
        let dias = totalDias % 7;
        if (dias < 0) dias = 0;
        if (dias > 6) dias = 6;

    return {
          semanasFracionadas: Number(semanasTotais.toFixed(3)),
          semanasInt,
          dias,
          peso,
        };
      })
      .filter(
        (
          ponto
        ): ponto is {
          semanasFracionadas: number;
          semanasInt: number;
          dias: number;
          peso: number;
        } => ponto !== null
      )
      .sort((a, b) => a.semanasFracionadas - b.semanasFracionadas);

    return { pontos, houveConversao };
  }, [consultasSelecionadas, dataNascimento, ehPretermo, idadeGestacionalSemanas, idadeGestacionalDias]);

  const pontosPaciente = pontosPacienteMemo.pontos;

  useEffect(() => {
    if (pontosPacienteMemo.houveConversao) {
      toast.success(
        "Alguns pesos foram convertidos de gramas para quilogramas para exibição no gráfico.",
        { id: "peso-convertido-info" }
      );
    }
  }, [pontosPacienteMemo.houveConversao]);

  const valoresCurva = useMemo(() => {
    if (!ehPretermo || curvasReferencia.length === 0) {
      return null;
    }

    return curvasReferencia.flatMap((ref) => [
      ref.zN3,
      ref.zN2,
      ref.zN1,
      ref.z0,
      ref.zP1,
      ref.zP2,
      ref.zP3,
    ]);
  }, [curvasReferencia, ehPretermo]);

  const yAxisPretermoMax = useMemo(() => {
    if (!valoresCurva || valoresCurva.length === 0) {
      return 4;
    }

    const maxReferencia = Math.max(...valoresCurva);
    const maxPaciente =
      pontosPaciente.length > 0
        ? Math.max(...pontosPaciente.map((p) => p.peso))
        : null;
    const baseMax = maxPaciente !== null ? Math.max(maxReferencia, maxPaciente) : maxReferencia;
    const margem = 0.2; // garantir respiro semelhante ao gráfico Intergrowth
    const topo = Math.ceil((baseMax + margem) / 0.2) * 0.2;
    return Number(topo.toFixed(1));
  }, [valoresCurva, pontosPaciente]);

  // Filtrar pontos de peso que ultrapassam o limite calculado (após yAxisPretermoMax)
  const pontosPacienteFiltrados = useMemo(() => {
    if (!ehPretermo) {
      return pontosPaciente;
    }

    // Para pré-termo, filtrar pontos que ultrapassam o limite do gráfico
    return pontosPaciente.filter((ponto) => ponto.peso <= yAxisPretermoMax);
  }, [pontosPaciente, ehPretermo, yAxisPretermoMax]);

  const semanasDisponiveis = useMemo(() => {
    if (curvasReferencia.length === 0) {
      return {
        min: ehPretermo ? 27 : 0,
        max: ehPretermo ? 64 : 64,
      };
    }

    const pontosParaUsar = ehPretermo ? pontosPacienteFiltrados : pontosPaciente;
    const semanas = curvasReferencia.map((c) => c.semanas);
    if (pontosParaUsar.length > 0) {
      semanas.push(...pontosParaUsar.map((p) => p.semanasFracionadas));
    }
    const minSemana = ehPretermo
      ? Math.max(Math.min(...semanas), 27)
      : Math.min(...semanas);
    
    // Limitar máximo a 64 semanas de IGC para pré-termo
    const maxSemana = ehPretermo
      ? Math.min(Math.max(...semanas), 64)
      : Math.min(Math.max(...semanas), 64);
    
    return {
      min: minSemana,
      max: maxSemana,
    };
  }, [curvasReferencia, pontosPaciente, pontosPacienteFiltrados, ehPretermo]);

  const dadosPacienteScatter = useMemo(() => {
    const pontosParaUsar = ehPretermo ? pontosPacienteFiltrados : pontosPaciente;
    return pontosParaUsar.map((p) => ({
      semanas: p.semanasFracionadas,
      semanasInt: p.semanasInt,
      dias: p.dias,
      pesoPaciente: p.peso,
    }));
  }, [pontosPaciente, pontosPacienteFiltrados, ehPretermo]);


  // Ticks para labels do eixo X (mostrar de 2 em 2 meses para OMS)
  const ticksBase = useMemo(() => {
    if (ehPretermo) {
      const total = semanasDisponiveis.max - semanasDisponiveis.min + 1;
      return Array.from({ length: total }, (_, i) => semanasDisponiveis.min + i);
    }

    // Para OMS: mostrar labels de 2 em 2 meses
    // 1 mês ≈ 4.33 semanas, então 2 meses ≈ 8.66 semanas
    const meses = [];
    for (let m = 0; m <= 60; m += 2) {
      meses.push(Math.round(m * 4.33));
    }
    return meses;
  }, [ehPretermo, semanasDisponiveis]);

  // Ticks para grid vertical (cada mês para OMS) - respeitando o zoom
  const gridTicksX = useMemo(() => {
    if (ehPretermo) {
      return null; // Sem grid vertical para pré-termo
    }
    
    // Determinar range baseado no zoom ou usar range completo
    const inicioSemanas = zoomIntervalo ? Math.max(0, zoomIntervalo[0] - 8) : 0;
    const fimSemanas = zoomIntervalo ? Math.min(260, zoomIntervalo[1] + 8) : 260;
    const inicioMeses = Math.floor(inicioSemanas / 4.33);
    const fimMeses = Math.ceil(fimSemanas / 4.33);
    
    // Grid vertical: uma linha para cada mês dentro do range
    const meses = [];
    for (let m = inicioMeses; m <= fimMeses; m++) {
      meses.push(Math.round(m * 4.33));
    }
    return meses;
  }, [ehPretermo, zoomIntervalo]);
  const xAxisTicks = useMemo(() => {
    if (!zoomIntervalo) return ticksBase;
    
    // Quando há zoom, calcular ticks dinamicamente baseados no intervalo
    if (ehPretermo) {
      // Para pré-termo: mostrar todas as semanas no intervalo
      const inicio = Math.floor(zoomIntervalo[0]);
      const fim = Math.ceil(zoomIntervalo[1]);
      return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
    } else {
      // Para OMS: mostrar de 2 em 2 meses no intervalo de zoom
      const inicioMeses = Math.floor(zoomIntervalo[0] / 4.33);
      const fimMeses = Math.ceil(zoomIntervalo[1] / 4.33);
      const meses = [];
      for (let m = inicioMeses; m <= fimMeses; m += 2) {
        meses.push(Math.round(m * 4.33));
      }
      return meses;
    }
  }, [ticksBase, zoomIntervalo, ehPretermo]);

  const yAxisTicks = useMemo(() => {
    if (ehPretermo) {
      const passos = Math.round(yAxisPretermoMax / 0.2);
      return Array.from({ length: passos + 1 }, (_, i) =>
        Number((i * 0.2).toFixed(1))
      );
    }

    // Para OMS: mostrar de 1 em 1 kg (2, 3, 4, ..., 30) para grid quadriculado
    return Array.from({ length: 29 }, (_, i) => i + 2);
  }, [ehPretermo, yAxisPretermoMax]);

  const dominioPadraoX = ehPretermo
    ? ([semanasDisponiveis.min, semanasDisponiveis.max] as [number, number])
    : ([0, 260] as [number, number]); // 260 semanas ≈ 60 meses (5 anos)

  // Manter todos os dados quando há zoom - o domínio do eixo X já limita a visualização
  // Filtrar os dados causa problemas porque o Recharts precisa de todos os pontos para interpolar
  const curvasReferenciaComMargem = curvasReferencia;

  // Adicionar margem ao domínio para evitar cortes nas linhas quando há zoom
  const xAxisDomain = useMemo(() => {
    if (!zoomIntervalo) {
      return dominioPadraoX;
    }
    // Margem maior (8 semanas) para garantir que as linhas não sejam cortadas nas bordas
    // e que sempre haja dados suficientes para renderizar as curvas "monotone"
    const margemVisual = 8;
    const dominio = [
      Math.max(dominioPadraoX[0], zoomIntervalo[0] - margemVisual),
      Math.min(dominioPadraoX[1], zoomIntervalo[1] + margemVisual)
    ] as [number, number];
    
    // Garantir que o domínio seja válido e tenha tamanho mínimo
    if (dominio[0] >= dominio[1] || (dominio[1] - dominio[0]) < 10) {
      return dominioPadraoX;
    }
    
    return dominio;
  }, [zoomIntervalo, dominioPadraoX]);

  const indiceInicioZoom = useMemo(() => {
    if (curvasReferencia.length === 0) return 0;
    if (!zoomIntervalo) return undefined; // undefined permite arrastar livremente
    // Encontrar o índice mais próximo do início do zoom
    let idx = 0;
    let menorDiferenca = Infinity;
    for (let i = 0; i < curvasReferencia.length; i++) {
      const diferenca = Math.abs(curvasReferencia[i].semanas - zoomIntervalo[0]);
      if (diferenca < menorDiferenca) {
        menorDiferenca = diferenca;
        idx = i;
      }
    }
    return Math.max(0, idx);
  }, [curvasReferencia, zoomIntervalo]);

  const indiceFimZoom = useMemo(() => {
    if (curvasReferencia.length === 0) return 0;
    if (!zoomIntervalo) return undefined; // undefined permite arrastar livremente
    // Encontrar o índice mais próximo do fim do zoom
    let idx = curvasReferencia.length - 1;
    let menorDiferenca = Infinity;
    for (let i = 0; i < curvasReferencia.length; i++) {
      const diferenca = Math.abs(curvasReferencia[i].semanas - zoomIntervalo[1]);
      if (diferenca < menorDiferenca) {
        menorDiferenca = diferenca;
        idx = i;
      }
    }
    return Math.min(curvasReferencia.length - 1, idx);
  }, [curvasReferencia, zoomIntervalo]);

  const yAxisDomain = ehPretermo ? [0, yAxisPretermoMax] : [2, 30] as [number, number]; // OMS: 2 a 30 kg (começa em 2)

  const exportarGraficoComoJpeg = async (): Promise<string> => {
    if (!areaGraficoRef.current) {
      throw new Error("Container do gráfico não encontrado.");
    }

    const svgElement = areaGraficoRef.current.querySelector("svg");
    if (!svgElement) {
      throw new Error("Elemento SVG do gráfico não encontrado.");
    }

    const bbox = svgElement.getBoundingClientRect();
    const width = Math.ceil(bbox.width);
    const height = Math.ceil(bbox.height);

    if (width === 0 || height === 0) {
      throw new Error("Dimensões do gráfico inválidas para exportação.");
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("width", `${width}`);
    clonedSvg.setAttribute("height", `${height}`);
    if (!clonedSvg.getAttribute("viewBox")) {
      clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    const svgMarkup = new XMLSerializer().serializeToString(clonedSvg);
    const svgUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);

    const imagemSvg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("Não foi possível rasterizar o SVG do gráfico."));
      img.src = svgUrl;
    });

    const chartCanvas = document.createElement("canvas");
    chartCanvas.width = width * pixelRatio;
    chartCanvas.height = height * pixelRatio;
    const chartCtx = chartCanvas.getContext("2d");
    if (!chartCtx) {
      throw new Error("Contexto 2D indisponível para exportação.");
    }
    chartCtx.fillStyle = "#ffffff";
    chartCtx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
    chartCtx.scale(pixelRatio, pixelRatio);
    chartCtx.drawImage(imagemSvg, 0, 0, width, height);
    chartCtx.setTransform(1, 0, 0, 1, 0, 0);

    const padding = 32;
    // Legenda removida - não precisa mais de espaço para ela
    const headerHeight = 180; // Altura do cabeçalho
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = (width + padding * 2) * pixelRatio;
    outputCanvas.height = (height + padding * 2 + headerHeight) * pixelRatio;

    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) {
      throw new Error("Contexto 2D indisponível para exportação final.");
    }
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    outCtx.scale(pixelRatio, pixelRatio);

    // Desenhar cabeçalho
    const headerStartY = padding;
    let currentY = headerStartY;
    const headerStartX = padding;
    const headerWidth = width;

    // Título principal
    outCtx.fillStyle = "#0f172a";
    outCtx.font = "bold 20px 'Inter', sans-serif";
    const generoTexto = sexo === "F" ? "MENINAS" : "MENINOS";
    const tipoTexto = ehPretermo ? " - PRÉ-TERMO" : " - A TERMO";
    const titulo = `Peso para idade ${generoTexto}${tipoTexto}`;
    outCtx.fillText(titulo, headerStartX, currentY + 20);
    currentY += 35;

    // Subtítulo
    outCtx.fillStyle = "#475569";
    outCtx.font = "14px 'Inter', sans-serif";
    outCtx.fillText("Nascimento até 5 anos (z-scores)", headerStartX, currentY + 14);
    currentY += 25;

    // WHO Child Growth Standards
    outCtx.fillStyle = "#64748b";
    outCtx.font = "12px 'Inter', sans-serif";
    outCtx.fillText("WHO Child Growth Standards", headerStartX, currentY + 12);
    currentY += 30;

    // Linha separadora
    outCtx.strokeStyle = "#e2e8f0";
    outCtx.lineWidth = 1;
    outCtx.beginPath();
    outCtx.moveTo(headerStartX, currentY);
    outCtx.lineTo(headerStartX + headerWidth, currentY);
    outCtx.stroke();
    currentY += 20;

    // Dados do RN
    if (nomeCrianca || dataNascimento || pesoNascimentoGr || comprimentoCm) {
      outCtx.fillStyle = "#0f172a";
      outCtx.font = "bold 12px 'Inter', sans-serif";
      outCtx.fillText("Dados do Recém-Nascido:", headerStartX, currentY + 12);
      currentY += 20;

      const dadosLinhas: string[] = [];
      if (nomeCrianca) {
        dadosLinhas.push(`Nome: ${nomeCrianca}`);
      }
      if (dataNascimento) {
        const dataNasc = new Date(dataNascimento);
        const dataFormatada = dataNasc.toLocaleDateString("pt-BR");
        dadosLinhas.push(`Data de Nascimento: ${dataFormatada}`);
      }
      if (dataNascimento) {
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        const diasVida = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24));
        const semanasVida = Math.floor(diasVida / 7);
        const diasRestantes = diasVida % 7;
        dadosLinhas.push(`Idade Cronológica: ${semanasVida} semanas e ${diasRestantes} dias`);
      }
      if (ehPretermo && dataNascimento && idadeGestacionalSemanas && idadeGestacionalDias !== undefined) {
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        const diasVida = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24));
        const semanasVida = Math.floor(diasVida / 7);
        const diasRestantes = diasVida % 7;
        
        let igcSemanas = idadeGestacionalSemanas + semanasVida;
        let igcDias = (idadeGestacionalDias || 0) + diasRestantes;
        if (igcDias >= 7) {
          igcSemanas += Math.floor(igcDias / 7);
          igcDias = igcDias % 7;
        }
        dadosLinhas.push(`Idade Gestacional Corrigida: ${igcSemanas} semanas e ${igcDias} dias`);
      }
      if (pesoNascimentoGr) {
        const pesoKg = pesoNascimentoGr / 1000;
        dadosLinhas.push(`Peso ao Nascer: ${pesoKg.toFixed(3).replace(".", ",")} kg`);
      }
      if (comprimentoCm) {
        dadosLinhas.push(`Comprimento ao Nascer: ${comprimentoCm.toFixed(1).replace(".", ",")} cm`);
      }
      if (perimetroCefalicoNascimentoCm) {
        dadosLinhas.push(`Perímetro Cefálico ao Nascer: ${perimetroCefalicoNascimentoCm.toFixed(1).replace(".", ",")} cm`);
      }
      if (idadeGestacionalSemanas !== undefined && idadeGestacionalDias !== undefined) {
        dadosLinhas.push(`Idade Gestacional ao Nascimento: ${idadeGestacionalSemanas} semanas e ${idadeGestacionalDias} dias`);
      }

      outCtx.fillStyle = "#475569";
      outCtx.font = "11px 'Inter', sans-serif";
      dadosLinhas.forEach((linha, index) => {
        const coluna = index % 2;
        const linhaIndex = Math.floor(index / 2);
        const x = headerStartX + coluna * (headerWidth / 2 + 20);
        const y = currentY + linhaIndex * 18;
        outCtx.fillText(linha, x, y + 11);
      });
      currentY += Math.ceil(dadosLinhas.length / 2) * 18 + 10;
    }

    // Desenhar legenda (se pré-termo)
    // Legenda removida conforme solicitado

    // Desenhar gráfico abaixo do cabeçalho
    outCtx.drawImage(
      chartCanvas,
      padding,
      padding + headerHeight,
      width,
      height
    );

    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Redimensionar para largura padrão para documentos Word
    const LARGURA_PADRAO = 1400;
    const larguraOriginal = outputCanvas.width / pixelRatio;
    const alturaOriginal = outputCanvas.height / pixelRatio;
    const proporcao = alturaOriginal / larguraOriginal;
    const novaAltura = Math.round(LARGURA_PADRAO * proporcao);
    
    const canvasFinal = document.createElement("canvas");
    canvasFinal.width = LARGURA_PADRAO;
    canvasFinal.height = novaAltura;
    
    const ctxFinal = canvasFinal.getContext("2d");
    if (!ctxFinal) {
      throw new Error("Contexto 2D indisponível para redimensionamento.");
    }
    
    ctxFinal.fillStyle = "#ffffff";
    ctxFinal.fillRect(0, 0, LARGURA_PADRAO, novaAltura);
    ctxFinal.imageSmoothingEnabled = true;
    ctxFinal.imageSmoothingQuality = "high";
    ctxFinal.drawImage(outputCanvas, 0, 0, LARGURA_PADRAO, novaAltura);
    
    return canvasFinal.toDataURL("image/jpeg", 0.95);
  };

  const handleExportarJpeg = async () => {
    try {
      setExportando(true);
      const dataUrl = await exportarGraficoComoJpeg();
      const link = document.createElement("a");
      const genero = sexo === "F" ? "meninas" : "meninos";
      link.href = dataUrl;
      link.download = `grafico-peso-${genero}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Gráfico exportado como JPEG.");
    } catch (error) {
      console.error("Erro ao exportar gráfico:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar o gráfico."
      );
    } finally {
      setExportando(false);
    }
  };

  // Largura padrão para exportação (ideal para documentos Word A4)
  const LARGURA_EXPORTACAO = 1400; // pixels - largura maior para melhor visualização

  // Função auxiliar para capturar elemento como canvas com largura fixa
  const capturarElementoComoCanvas = async (elemento: HTMLElement): Promise<HTMLCanvasElement> => {
    const html2canvas = (await import('html2canvas')).default;
    
    // Captura o elemento com escala 2 para melhor qualidade
    const canvasOriginal = await html2canvas(elemento, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    // Calcular altura proporcional mantendo a proporção
    const proporcao = canvasOriginal.height / canvasOriginal.width;
    const novaLargura = LARGURA_EXPORTACAO;
    const novaAltura = Math.round(novaLargura * proporcao);
    
    // Criar canvas com dimensões padronizadas
    const canvasRedimensionado = document.createElement('canvas');
    canvasRedimensionado.width = novaLargura;
    canvasRedimensionado.height = novaAltura;
    
    const ctx = canvasRedimensionado.getContext('2d');
    if (!ctx) {
      throw new Error('Não foi possível criar contexto 2D');
    }
    
    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, novaLargura, novaAltura);
    
    // Desenhar imagem redimensionada com suavização
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvasOriginal, 0, 0, novaLargura, novaAltura);
    
    return canvasRedimensionado;
  };

  // Exportar card completo como JPEG (download)
  const handleExportarCardCompleto = async () => {
    if (!cardCompletoRef.current) {
      toast.error("Não foi possível encontrar o card para exportar.");
      return;
    }

    try {
      setExportandoCard(true);
      const canvas = await capturarElementoComoCanvas(cardCompletoRef.current);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      
      const link = document.createElement("a");
      const nomeArquivo = nomeCrianca 
        ? `evolucao-nutricional-${nomeCrianca.toLowerCase().replace(/\s+/g, '-')}.jpg`
        : `evolucao-nutricional.jpg`;
      link.href = dataUrl;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Card exportado como JPEG.");
    } catch (error) {
      console.error("Erro ao exportar card:", error);
      toast.error("Não foi possível exportar o card.");
    } finally {
      setExportandoCard(false);
    }
  };

  // Copiar card completo para área de transferência
  const handleCopiarParaClipboard = async () => {
    if (!cardCompletoRef.current) {
      toast.error("Não foi possível encontrar o card para copiar.");
      return;
    }

    try {
      setCopiando(true);
      const canvas = await capturarElementoComoCanvas(cardCompletoRef.current);
      
      // Converter canvas para blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Falha ao criar blob da imagem"));
          }
        }, "image/png");
      });

      // Copiar para clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      
      toast.success("Imagem copiada para a área de transferência!");
    } catch (error) {
      console.error("Erro ao copiar para clipboard:", error);
      toast.error("Não foi possível copiar. Verifique as permissões do navegador.");
    } finally {
      setCopiando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Carregando curvas de referência...</div>
      </div>
    );
  }

  if (curvasReferencia.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Erro ao carregar curvas de referência</div>
      </div>
    );
  }

  const cores = CORES_SEXO[sexo as "M" | "F"] || CORES_SEXO.M;

  return (
    <div className="space-y-6">
      {/* Barra de Ferramentas de Exportação */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">Exportar:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportarJpeg}
              disabled={exportando}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Baixar apenas o gráfico como imagem JPEG"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {exportando ? "Exportando..." : "Gráfico"}
            </button>
            <button
              onClick={handleExportarCardCompleto}
              disabled={exportandoCard}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Baixar o card completo como imagem JPEG"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportandoCard ? "Exportando..." : "Card Completo"}
            </button>
            <button
              onClick={handleCopiarParaClipboard}
              disabled={copiando}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Copiar o card completo para a área de transferência"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiando ? "Copiando..." : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      {/* Card Completo - usado para exportação */}
      <div ref={cardCompletoRef} className="space-y-6 bg-white">
        {/* Seção 1: EVOLUÇÃO NUTRIÇÃO - Dados do RN */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div 
            className="px-6 py-4 border-b-2"
            style={{ backgroundColor: cores.primaria, borderColor: cores.secundaria }}
          >
            <h2 className="text-lg font-bold text-white tracking-wide">EVOLUÇÃO NUTRIÇÃO</h2>
          </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Nome do RN */}
            {nomeCrianca && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Nome do RN</span>
                <p className="text-sm font-bold text-gray-900">{nomeCrianca}</p>
              </div>
            )}
            
            {/* Sexo */}
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Sexo</span>
              <p className="text-sm font-semibold text-gray-900">
                {sexo === "M" ? "Masculino" : "Feminino"}
            </p>
          </div>
            
            {/* Peso Nascimento */}
            {pesoNascimentoGr && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Peso Nascimento</span>
                <p className="text-sm font-semibold text-gray-900">
                  {pesoNascimentoGr.toLocaleString("pt-BR")} g
                </p>
          </div>
            )}
            
            {/* Peso Atual */}
            {pesoAtualInfo && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Peso Atual</span>
                <p className="text-sm font-semibold text-gray-900">
                  {Math.round(pesoAtualInfo.pesoGr).toLocaleString("pt-BR")} g
                  <span className={`ml-2 text-xs font-bold ${pesoAtualInfo.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({pesoAtualInfo.diferenca >= 0 ? '+' : ''}{Math.round(pesoAtualInfo.diferenca)} g)
                </span>
                </p>
              </div>
            )}
            
            {/* IG Nascimento */}
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">IG Nascimento</span>
              <p className="text-sm font-semibold text-gray-900">
                {idadeGestacionalSemanas} sem{idadeGestacionalDias ? ` e ${idadeGestacionalDias} dia${idadeGestacionalDias > 1 ? 's' : ''}` : ''}
              </p>
                </div>
            
            {/* IGC Atual */}
            {ehPretermo && calcularIGCAtual && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">IGC (Atual)</span>
                <p className="text-sm font-semibold text-indigo-700">
                  {calcularIGCAtual.semanas} sem{calcularIGCAtual.dias > 0 ? ` e ${calcularIGCAtual.dias} dia${calcularIGCAtual.dias > 1 ? 's' : ''}` : ''}
                </p>
              </div>
            )}
            
            {/* Idade Cronológica */}
            {calcularIdadeCronologica !== null && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Idade Cronológica</span>
                <p className="text-sm font-semibold text-gray-900">
                  {calcularIdadeCronologica} dia{calcularIdadeCronologica !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            
            {/* Tipo de Parto */}
            {tipoParto && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Parto</span>
                <p className="text-sm font-semibold text-gray-900">{tipoParto}</p>
              </div>
            )}
            
            {/* Apgar */}
            {(apgar1Minuto !== undefined || apgar5Minuto !== undefined) && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Apgar</span>
                <p className="text-sm font-semibold text-gray-900">
                  {apgar1Minuto ?? '-'}/{apgar5Minuto ?? '-'}
                </p>
              </div>
            )}
            
            {/* Estatura ao Nascer */}
            {comprimentoCm && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Estatura ao Nascer</span>
                <p className="text-sm font-semibold text-gray-900">
                  {comprimentoCm.toFixed(1).replace('.', ',')} cm
                </p>
              </div>
            )}
            
            {/* PC ao Nascer */}
            {perimetroCefalicoNascimentoCm && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">PC ao Nascer</span>
                <p className="text-sm font-semibold text-gray-900">
                  {perimetroCefalicoNascimentoCm.toFixed(1).replace('.', ',')} cm
                </p>
              </div>
            )}
          </div>
              </div>
            </div>
            
      {/* Seção 2: CURVAS DE CRESCIMENTO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div 
          className="px-6 py-4 border-b-2"
          style={{ backgroundColor: cores.primaria + '10', borderColor: cores.primaria }}
        >
          <h3 className="text-lg font-bold" style={{ color: cores.primaria }}>
            CURVAS DE CRESCIMENTO
          </h3>
          <p className="text-xs text-gray-600 italic">
            {ehPretermo ? "INTERGROWTH-21st" : "WHO Child Growth Standards"}
            {ehPretermo && <span className="ml-2 text-orange-600">(Pré-termo - Idade corrigida)</span>}
          </p>
            </div>
        
        <div className="p-6">
          {/* Dados de nascimento resumidos */}
          <div className="flex flex-wrap gap-6 mb-6 pb-4 border-b border-gray-200">
            {pesoNascimentoGr && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">PESO NASCER:</span>
                <span className="text-sm font-bold" style={{ color: cores.primaria }}>
                  {(pesoNascimentoGr / 1000).toFixed(3).replace('.', ',')} kg / {idadeGestacionalSemanas}S {idadeGestacionalDias || 0}D
                </span>
          </div>
            )}
            {comprimentoCm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">ESTATURA:</span>
                <span className="text-sm font-bold" style={{ color: cores.primaria }}>
                  {comprimentoCm.toFixed(1).replace('.', ',')} cm
                </span>
              </div>
            )}
            {perimetroCefalicoNascimentoCm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">PC:</span>
                <span className="text-sm font-bold" style={{ color: cores.primaria }}>
                  {perimetroCefalicoNascimentoCm.toFixed(1).replace('.', ',')} cm
                </span>
              </div>
            )}
        </div>
        <div className="flex flex-col lg:flex-row gap-6" ref={areaGraficoRef}>
          <div className="flex-1">
            <div
              className="mx-auto rounded-lg overflow-hidden relative"
              style={{
                backgroundColor: cores.primaria,
                padding: "4px",
                width: "100%",
                height: chartHeight,
                minHeight: 400,
                maxHeight: 2000,
              }}
            >
              <div
                className="bg-white rounded"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                {curvasReferencia.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={curvasReferenciaComMargem}
                    margin={{ top: 20, right: 50, left: 50, bottom: 60 }}
                    syncId="peso-chart"
              >
            <CartesianGrid
                  strokeDasharray="1 1"
                  stroke="#E0E0E0"
                  strokeWidth={0.5}
                  horizontal={true}
                  vertical={!ehPretermo} // Grid vertical apenas para OMS (meses)
            />
            <XAxis
              dataKey="semanas"
                  type="number"
                  allowDataOverflow={true}
              label={{
                value: ehPretermo ? "Semanas" : "Idade (meses e anos completos)",
                position: "insideBottom",
                offset: -10,
                    style: {
                      fontSize: "14px",
                      fontWeight: "bold",
                      fill: cores.primaria,
                    },
              }}
              stroke={cores.primaria}
                  tick={{ fontSize: 10, fill: cores.primaria }}
                  domain={xAxisDomain}
                  ticks={gridTicksX || xAxisTicks} // Usar gridTicksX para grid completo, mas labels apenas nos ticksBase
                  interval={0}
                  tickFormatter={(value) => {
                    if (ehPretermo) {
                      return value.toString();
                    }
                    // Converter semanas para meses para OMS
                    const semanas = value;
                    if (semanas === 0) return "Birth";
                    
                    // Aproximação: 4.33 semanas por mês
                    const meses = Math.round(semanas / 4.33);
                    
                    // Mostrar labels apenas de 2 em 2 meses: 2, 4, 6, 8, 10, 12 (1 year), 14, 16, etc.
                    if (meses % 2 !== 0) return ""; // Não mostrar label para meses ímpares
                    
                    if (meses === 12) return "1 year";
                    if (meses === 24) return "2 years";
                    if (meses === 36) return "3 years";
                    if (meses === 48) return "4 years";
                    if (meses === 60) return "5 years";
                    
                    // Mostrar meses para outros valores pares
                    return `${meses}m`;
                  }}
            />
            <YAxis
                  yAxisId="left"
              label={{
                value: "Peso (kg)",
                angle: -90,
                position: "insideLeft",
                    style: {
                      fontSize: "14px",
                      fontWeight: "bold",
                      fill: cores.primaria,
                    },
                  }}
                  stroke={cores.primaria}
                  tick={{ fontSize: 10, fill: cores.primaria }}
                  domain={yAxisDomain}
                  type="number"
                  allowDecimals
                  ticks={yAxisTicks}
                  interval={0}
                  allowDataOverflow={false}
                  tickFormatter={(value) =>
                    value.toFixed(1).replace(".", ",")
                  }
                  padding={{ top: 0, bottom: 0 }}
                  scale="linear"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Peso (kg)",
                    angle: 90,
                    position: "insideRight",
                    style: {
                      fontSize: "14px",
                      fontWeight: "bold",
                      fill: cores.primaria,
                    },
              }}
              stroke={cores.primaria}
                  tick={{ fontSize: 10, fill: cores.primaria }}
                  domain={yAxisDomain}
              type="number"
                  allowDecimals
                  ticks={yAxisTicks}
                  interval={0}
                  allowDataOverflow={false}
                  tickFormatter={(value) =>
                    value.toFixed(1).replace(".", ",")
                  }
                  padding={{ top: 0, bottom: 0 }}
                  scale="linear"
                  width={50}
                  mirror
            />
            <Tooltip
              content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }

                    const curvaPayload = payload.find(
                      (item) =>
                        typeof item.dataKey === "string" &&
                        item.dataKey.startsWith("z")
                    )?.payload as CurvaReferencia | undefined;

                    const pacientePayload = payload.find(
                      (item) => item.dataKey === "pesoPaciente"
                    )?.payload as
                      | { semanas: number; semanasInt: number; dias: number; pesoPaciente: number }
                      | undefined;

                    if (!curvaPayload && !pacientePayload) {
                      return null;
                    }

                    const semanasLabel = pacientePayload
                      ? pacientePayload.dias > 0
                        ? `${pacientePayload.semanasInt}+${pacientePayload.dias} semanas`
                        : `${pacientePayload.semanasInt} semanas`
                      : curvaPayload
                      ? `${curvaPayload.semanas} semanas`
                      : "";

                    // Calcular Z-score e status do paciente
                    let zScoreCalculado: number | null = null;
                    let statusCrianca: { texto: string; cor: string } | null = null;

                    if (pacientePayload) {
                      // Encontrar a curva de referência mais próxima
                      const semanaPaciente = pacientePayload.semanas;
                      const curvaRef = curvasReferencia.find(
                        (c) => c.semanas === Math.floor(semanaPaciente)
                      ) || curvasReferencia.find(
                        (c) => Math.abs(c.semanas - semanaPaciente) < 1
                      );

                      if (curvaRef) {
                        const peso = pacientePayload.pesoPaciente;
                        // Calcular Z-score interpolando entre as curvas
                        if (peso <= curvaRef.zN3) {
                          zScoreCalculado = -3;
                        } else if (peso <= curvaRef.zN2) {
                          // Interpolar entre Z-3 e Z-2
                          const ratio = (peso - curvaRef.zN3) / (curvaRef.zN2 - curvaRef.zN3);
                          zScoreCalculado = -3 + ratio;
                        } else if (peso <= curvaRef.zN1) {
                          // Interpolar entre Z-2 e Z-1
                          const ratio = (peso - curvaRef.zN2) / (curvaRef.zN1 - curvaRef.zN2);
                          zScoreCalculado = -2 + ratio;
                        } else if (peso <= curvaRef.z0) {
                          // Interpolar entre Z-1 e Z 0
                          const ratio = (peso - curvaRef.zN1) / (curvaRef.z0 - curvaRef.zN1);
                          zScoreCalculado = -1 + ratio;
                        } else if (peso <= curvaRef.zP1) {
                          // Interpolar entre Z 0 e Z+1
                          const ratio = (peso - curvaRef.z0) / (curvaRef.zP1 - curvaRef.z0);
                          zScoreCalculado = ratio;
                        } else if (peso <= curvaRef.zP2) {
                          // Interpolar entre Z+1 e Z+2
                          const ratio = (peso - curvaRef.zP1) / (curvaRef.zP2 - curvaRef.zP1);
                          zScoreCalculado = 1 + ratio;
                        } else if (peso <= curvaRef.zP3) {
                          // Interpolar entre Z+2 e Z+3
                          const ratio = (peso - curvaRef.zP2) / (curvaRef.zP3 - curvaRef.zP2);
                          zScoreCalculado = 2 + ratio;
                        } else {
                          zScoreCalculado = 3;
                        }

                        // Determinar status baseado no Z-score
                        if (zScoreCalculado <= -3 || zScoreCalculado >= 3) {
                          statusCrianca = { texto: "Alerta - Avaliação imediata necessária", cor: "text-red-600" };
                        } else if (zScoreCalculado <= -2 || zScoreCalculado >= 2) {
                          statusCrianca = { texto: "Atenção - Monitorar crescimento", cor: "text-orange-600" };
                        } else if (zScoreCalculado >= -1 && zScoreCalculado <= 1) {
                          statusCrianca = { texto: "Normal - Crescimento adequado", cor: "text-green-600" };
                        } else {
                          statusCrianca = { texto: "Atenção - Monitorar crescimento", cor: "text-orange-600" };
                        }
                      }
                    }

                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
                      <p className="font-medium text-gray-900">
                          {semanasLabel}
                      </p>
                        {curvaPayload && (
                      <p className="text-xs text-gray-600 mt-1">
                            Z-3: {curvaPayload.zN3.toFixed(3).replace(".", ",")} kg
                        <br />
                            Z-2: {curvaPayload.zN2.toFixed(3).replace(".", ",")} kg
                        <br />
                            Z-1: {curvaPayload.zN1.toFixed(3).replace(".", ",")} kg
                            <br />Z 0: {curvaPayload.z0.toFixed(3).replace(".", ",")} kg
                        <br />
                            Z+1: {curvaPayload.zP1.toFixed(3).replace(".", ",")} kg
                        <br />
                            Z+2: {curvaPayload.zP2.toFixed(3).replace(".", ",")} kg
                        <br />
                            Z+3: {curvaPayload.zP3.toFixed(3).replace(".", ",")} kg
                      </p>
                        )}
                        {pacientePayload && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-700 font-semibold">
                            Peso observado: {pacientePayload.pesoPaciente.toFixed(3).replace(".", ",")} kg
                        </p>
                        {zScoreCalculado !== null && (
                          <p className="text-xs text-gray-700 mt-1">
                            Z-Score: <strong>{zScoreCalculado.toFixed(2).replace(".", ",")}</strong>
                          </p>
                        )}
                        {statusCrianca && (
                          <p className={`text-xs font-semibold mt-2 ${statusCrianca.cor}`}>
                            Status: {statusCrianca.texto}
                          </p>
                        )}
                      </div>
                        )}
                    </div>
                  );
                }}
            />
                {/* Linhas verticais destacadas para anos (apenas OMS) */}
                {!ehPretermo && (
                  <>
                    <ReferenceLine
                      x={52}
                      yAxisId="left"
                      stroke="#999999"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      label={{ value: "1 year", position: "top", fill: cores.primaria, fontSize: 11 }}
                    />
                    <ReferenceLine
                      x={104}
                      yAxisId="left"
                      stroke="#999999"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      label={{ value: "2 years", position: "top", fill: cores.primaria, fontSize: 11 }}
                    />
                    <ReferenceLine
                      x={156}
                      yAxisId="left"
                      stroke="#999999"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      label={{ value: "3 years", position: "top", fill: cores.primaria, fontSize: 11 }}
                    />
                    <ReferenceLine
                      x={208}
                      yAxisId="left"
                      stroke="#999999"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      label={{ value: "4 years", position: "top", fill: cores.primaria, fontSize: 11 }}
                    />
                    <ReferenceLine
                      x={260}
                      yAxisId="left"
                      stroke="#999999"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      label={{ value: "5 years", position: "top", fill: cores.primaria, fontSize: 11 }}
                    />
                  </>
                )}
                {/* Curvas de referência - estilo OMS/Intergrowth */}
            {/* Para OMS (a termo): apenas 5 linhas (-3, -2, 0, +2, +3) */}
            {/* Para Intergrowth (pré-termo): 7 linhas (-3, -2, -1, 0, +1, +2, +3) */}
            {/* Usar type="monotone" para curvas suaves tanto para OMS quanto Intergrowth */}
            <Line
              type="monotone"
                  dataKey="zN3"
              stroke={CORES_Z_SCORE.zN3}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
                  yAxisId="left"
                  name="-3"
                  connectNulls={false}
            />
            <Line
              type="monotone"
                  dataKey="zN2"
              stroke={CORES_Z_SCORE.zN2}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
                  yAxisId="left"
                  name="-2"
            />
            {/* Linha -1 apenas para pré-termo (Intergrowth) */}
            {ehPretermo && (
              <Line
                type="monotone"
                    dataKey="zN1"
                stroke={CORES_Z_SCORE.zN1}
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
                    yAxisId="left"
                    name="-1"
              />
            )}
            <Line
              type="monotone"
              dataKey="z0"
              stroke={CORES_Z_SCORE.z0}
                  strokeWidth={3}
              dot={false}
              isAnimationActive={false}
                  yAxisId="left"
                  name="0"
            />
            {/* Linha +1 apenas para pré-termo (Intergrowth) */}
            {ehPretermo && (
              <Line
                type="monotone"
                    dataKey="zP1"
                stroke={CORES_Z_SCORE.zP1}
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
                    yAxisId="left"
                    name="+1"
              />
            )}
            <Line
              type="monotone"
                  dataKey="zP2"
              stroke={CORES_Z_SCORE.zP2}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
                  yAxisId="left"
                  name="+2"
            />
            <Line
              type="monotone"
                  dataKey="zP3"
              stroke={CORES_Z_SCORE.zP3}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
                  yAxisId="left"
                  name="+3"
                />
                {dadosPacienteScatter.length > 0 && (
                  <Scatter
                    name="Atendimentos"
                    data={dadosPacienteScatter}
                    yAxisId="left"
                    dataKey="pesoPaciente"
                    legendType="circle"
                    shape={(props) => (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={6}
                        fill={cores.primaria}
                        stroke={cores.secundaria}
                        strokeWidth={1.5}
                      />
                    )}
                isAnimationActive={false}
              />
            )}
                {/* Brush removido - usando controles de zoom externos */}
              </ComposedChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500">Carregando dados do gráfico...</p>
                  </div>
                )}
              </div>
              {/* Handle de redimensionamento */}
              <div
                onMouseDown={handleResizeStart}
                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-opacity-20 bg-gray-400 transition-colors flex items-center justify-center group"
                style={{ zIndex: 10 }}
              >
                <div className="w-16 h-1 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors" />
              </div>
            </div>
          </div>
        </div>
        {dadosPacienteScatter.length === 0 && (
          <p className="text-center text-xs text-slate-500">
            Nenhum ponto do paciente para exibir. Adicione atendimentos para visualizar no gráfico.
          </p>
        )}
        
        {/* Controle deslizante de zoom - abaixo do gráfico */}
        <div className="flex flex-col gap-3 bg-slate-50 rounded-lg p-4 border border-slate-200 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Zoom do Gráfico
            </span>
            <div className="flex items-center gap-2">
              {zoomIntervalo ? (
                <span className="text-sm text-slate-600 font-medium">
                  {ehPretermo 
                    ? `${zoomIntervalo[0]} - ${zoomIntervalo[1]} semanas`
                    : (() => {
                        const inicioMeses = Math.round(zoomIntervalo[0] / 4.33);
                        const fimMeses = Math.round(zoomIntervalo[1] / 4.33);
                        const formatarIdade = (meses: number) => {
                          if (meses === 0) return "Nascimento";
                          if (meses < 12) return `${meses} meses`;
                          const anos = Math.floor(meses / 12);
                          const mesesRestantes = meses % 12;
                          if (mesesRestantes === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
                          return `${anos}a ${mesesRestantes}m`;
                        };
                        return `${formatarIdade(inicioMeses)} - ${formatarIdade(fimMeses)}`;
                      })()
                  }
                </span>
              ) : (
                <span className="text-sm text-slate-500">
                  {ehPretermo ? "27 - 64 semanas (completo)" : "0 - 5 anos (completo)"}
                </span>
              )}
              {zoomIntervalo && (
                <button
                  onClick={() => setZoomIntervalo(null)}
                  className="text-xs text-primary hover:text-primary/80 font-medium ml-2"
                >
                  Resetar
                </button>
              )}
            </div>
      </div>
          
          {/* Slider de Início */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-12 shrink-0">Início</span>
            <input
              type="range"
              min={ehPretermo ? 27 : 0}
              max={ehPretermo ? 63 : 259}
              step={ehPretermo ? 1 : 4}
              value={zoomIntervalo ? zoomIntervalo[0] : (ehPretermo ? 27 : 0)}
              onChange={(e) => {
                const novoInicio = Number(e.target.value);
                const domMax = ehPretermo ? 64 : 260;
                const minRange = ehPretermo ? 4 : 16; // mínimo 4 semanas para pré-termo, 4 meses para OMS
                
                if (zoomIntervalo) {
                  const novoFim = Math.max(novoInicio + minRange, zoomIntervalo[1]);
                  setZoomIntervalo([novoInicio, Math.min(domMax, novoFim)]);
                } else {
                  setZoomIntervalo([novoInicio, domMax]);
                }
              }}
              className="flex-1 h-3 appearance-none bg-slate-200 rounded-full cursor-pointer touch-manipulation
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-primary 
                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 
                [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
            />
            <span className="text-xs text-slate-600 w-16 text-right">
              {ehPretermo 
                ? `${zoomIntervalo ? zoomIntervalo[0] : 27} sem`
                : (() => {
                    const meses = Math.round((zoomIntervalo ? zoomIntervalo[0] : 0) / 4.33);
                    return meses === 0 ? "Nasc." : `${meses}m`;
                  })()
              }
            </span>
          </div>
          
          {/* Slider de Fim */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-12 shrink-0">Fim</span>
            <input
              type="range"
              min={ehPretermo ? 28 : 4}
              max={ehPretermo ? 64 : 260}
              step={ehPretermo ? 1 : 4}
              value={zoomIntervalo ? zoomIntervalo[1] : (ehPretermo ? 64 : 260)}
              onChange={(e) => {
                const novoFim = Number(e.target.value);
                const domMin = ehPretermo ? 27 : 0;
                const minRange = ehPretermo ? 4 : 16; // mínimo 4 semanas para pré-termo, 4 meses para OMS
                
                if (zoomIntervalo) {
                  const novoInicio = Math.min(novoFim - minRange, zoomIntervalo[0]);
                  setZoomIntervalo([Math.max(domMin, novoInicio), novoFim]);
                } else {
                  setZoomIntervalo([domMin, novoFim]);
                }
              }}
              className="flex-1 h-3 appearance-none bg-slate-200 rounded-full cursor-pointer touch-manipulation
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-primary 
                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 
                [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
            />
            <span className="text-xs text-slate-600 w-16 text-right">
              {ehPretermo 
                ? `${zoomIntervalo ? zoomIntervalo[1] : 64} sem`
                : (() => {
                    const meses = Math.round((zoomIntervalo ? zoomIntervalo[1] : 260) / 4.33);
                    if (meses >= 60) return "5 anos";
                    if (meses >= 12) return `${Math.floor(meses / 12)}a ${meses % 12}m`;
                    return `${meses}m`;
                  })()
              }
            </span>
          </div>
          
          {/* Atalhos rápidos */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500 mr-1">Atalhos:</span>
            {ehPretermo ? (
              <>
                <button
                  onClick={() => setZoomIntervalo([27, 40])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  27-40 sem
                </button>
                <button
                  onClick={() => setZoomIntervalo([35, 50])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  35-50 sem
                </button>
                <button
                  onClick={() => setZoomIntervalo([40, 64])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  40-64 sem
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setZoomIntervalo([0, 26])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  0-6m
                </button>
                <button
                  onClick={() => setZoomIntervalo([0, 52])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  0-1 ano
                </button>
                <button
                  onClick={() => setZoomIntervalo([0, 104])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  0-2 anos
                </button>
                <button
                  onClick={() => setZoomIntervalo([52, 156])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  1-3 anos
                </button>
                <button
                  onClick={() => setZoomIntervalo([104, 260])}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 touch-manipulation"
                >
                  2-5 anos
                </button>
              </>
            )}
            <button
              onClick={() => setZoomIntervalo(null)}
              className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-medium touch-manipulation"
            >
              Ver tudo
            </button>
          </div>
        </div>
        
        {/* Tabela de Histórico de Peso */}
        {historicoConsultas.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              Histórico de Peso x Idade
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Semanas</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Dias</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Peso (kg)</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoConsultas.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-900 font-medium">{item.igcSemanas}</td>
                      <td className="px-3 py-2 text-gray-900">{item.igcDias}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold">
                        {item.pesoKg.toFixed(3).replace('.', ',')}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {item.data.toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Seção 3: NECESSIDADES NUTRICIONAIS E DIETOTERAPIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div 
          className="px-6 py-4 border-b-2"
          style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}
        >
          <h3 className="text-lg font-bold text-amber-800">NECESSIDADES NUTRICIONAIS</h3>
        </div>
        
        <div className="p-6">
          {dietaAtual && totaisDieta ? (
            <>
              {/* Parâmetros definidos pelo profissional */}
              {(totaisDieta.taxaEnergetica || totaisDieta.metaProteica) && (
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="text-sm font-bold text-amber-800 mb-3">Parâmetros Nutricionais (Definidos pelo Profissional)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {totaisDieta.taxaEnergetica && (
                      <div>
                        <span className="text-xs text-amber-600">Taxa Energética</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.taxaEnergetica} kcal/kg/dia</p>
                      </div>
                    )}
                    {totaisDieta.metaProteica && (
                      <div>
                        <span className="text-xs text-amber-600">Meta Proteica</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.metaProteica} g/kg/dia</p>
                      </div>
                    )}
                    {totaisDieta.pesoReferencia && (
                      <div>
                        <span className="text-xs text-amber-600">Peso Referência</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.pesoReferencia.toFixed(3).replace('.', ',')} kg</p>
                      </div>
                    )}
                    {totaisDieta.viaAdministracao && (
                      <div>
                        <span className="text-xs text-amber-600">Via</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.viaAdministracao}</p>
                      </div>
                    )}
                  </div>
                  {/* Necessidades calculadas */}
                  {(totaisDieta.necessidadeEnergetica || totaisDieta.necessidadeProteica) && (
                    <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 gap-4">
                      {totaisDieta.necessidadeEnergetica && (
                        <div>
                          <span className="text-xs text-amber-600">Necessidade Energética</span>
                          <p className="text-lg font-bold text-amber-900">
                            {totaisDieta.necessidadeEnergetica.toFixed(1).replace('.', ',')} kcal/dia
                          </p>
                        </div>
                      )}
                      {totaisDieta.necessidadeProteica && (
                        <div>
                          <span className="text-xs text-amber-600">Necessidade Proteica</span>
                          <p className="text-lg font-bold text-amber-900">
                            {totaisDieta.necessidadeProteica.toFixed(2).replace('.', ',')} g/dia
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fornecido pela Dieta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Energia Diária Fornecida */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <span className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Energia Fornecida</span>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-blue-800">
                      {totaisDieta.energiaDiaria.toFixed(2).replace('.', ',')} kcal/dia
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      {totaisDieta.energiaKgDia.toFixed(1).replace('.', ',')} kcal/kg/dia
                    </p>
                    {totaisDieta.adequacaoEnergia !== null && (
                      <p className={`text-sm font-bold mt-2 ${totaisDieta.adequacaoEnergia >= 90 ? 'text-green-600' : totaisDieta.adequacaoEnergia >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        Adequação: {totaisDieta.adequacaoEnergia.toFixed(1).replace('.', ',')}%
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Proteína Diária Fornecida */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <span className="text-xs text-green-600 uppercase tracking-wide font-semibold">Proteína Fornecida</span>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-green-800">
                      {totaisDieta.proteinaDiaria.toFixed(2).replace('.', ',')} g/dia
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {totaisDieta.proteinaKgDia.toFixed(2).replace('.', ',')} g/kg/dia
                    </p>
                    {totaisDieta.adequacaoProteina !== null && (
                      <p className={`text-sm font-bold mt-2 ${totaisDieta.adequacaoProteina >= 90 ? 'text-green-600' : totaisDieta.adequacaoProteina >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        Adequação: {totaisDieta.adequacaoProteina.toFixed(1).replace('.', ',')}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            
            {/* Detalhes da Dietoterapia */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Dietoterapia</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="text-xs text-gray-500">Via</span>
                  <p className="text-sm font-semibold text-gray-900">{totaisDieta.viaAdministracao || 'Enteral'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Frequência</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {dietaAtual.frequenciaHoras}h/{dietaAtual.frequenciaHoras}h
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Mamadas/dia</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {totaisDieta.frequenciaDia.toFixed(0)}x
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Início</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(dietaAtual.dataInicio).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              {/* Itens da dieta */}
              {dietaAtual.itens && dietaAtual.itens.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Composição</span>
                  <div className="mt-2 space-y-2">
                    {dietaAtual.itens.map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">
                          {item.alimento?.nome || 'Alimento'}
                        </span>
                        <span className="text-gray-600">
                          {item.quantidade} {item.alimento?.unidade || 'ml'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Tabela de Energia/Proteína da Dieta */}
            <div className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700"></th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Por Mamada</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Por Dia</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Por kg/dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 font-semibold text-gray-700">Energia (kcal)</td>
                      <td className="px-4 py-3 text-center text-gray-900">
                        {totaisDieta.energiaPorMamada.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 font-semibold">
                        {totaisDieta.energiaDiaria.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${totaisDieta.energiaKgDia >= 110 ? 'text-green-600' : totaisDieta.energiaKgDia >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                          {totaisDieta.energiaKgDia.toFixed(1).replace('.', ',')}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-700">Proteína (g)</td>
                      <td className="px-4 py-3 text-center text-gray-900">
                        {totaisDieta.proteinaPorMamada.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 font-semibold">
                        {totaisDieta.proteinaDiaria.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${totaisDieta.proteinaKgDia >= 3.5 ? 'text-green-600' : totaisDieta.proteinaKgDia >= 2.5 ? 'text-amber-600' : 'text-red-600'}`}>
                          {totaisDieta.proteinaKgDia.toFixed(2).replace('.', ',')}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Legenda de cores */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  <span className="text-gray-600">Adequado</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span className="text-gray-600">Atenção</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  <span className="text-gray-600">Inadequado</span>
                </div>
              </div>
            </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Nenhuma dietoterapia cadastrada</p>
              <p className="text-sm text-gray-400 mt-1">Cadastre uma dieta para visualizar as necessidades nutricionais</p>
            </div>
          )}
        </div>
      </div>
      </div>
      {/* Fim do Card Completo para exportação */}

      {/* Seção de Interpretação do Gráfico */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Como Interpretar o Gráfico</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">Z-Scores e Percentis</h5>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Z 0 (P50):</strong> Mediana - 50% das crianças estão acima e 50% abaixo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-900 font-bold">•</span>
                <span><strong>Z-1 a Z+1 (P15,9 a P84,1):</strong> Faixa normal - crescimento adequado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span><strong>Z-2 a Z-1 / Z+1 a Z+2:</strong> Atenção - monitorar crescimento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>Z-3 ou Z+3:</strong> Alerta - avaliação imediata necessária</span>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">Avaliação do Crescimento</h5>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Trajetória:</strong> Observe se os pontos seguem uma curva paralela às curvas de referência</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Cruzamento de curvas:</strong> Mudanças bruscas podem indicar problemas de crescimento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Velocidade:</strong> O crescimento deve ser contínuo e proporcional</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Consistência:</strong> Manter-se na mesma faixa Z-score indica crescimento adequado</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-primary/5 border-l-4 border-primary rounded">
          <p className="text-sm text-gray-700">
            <strong>Importante:</strong> Este gráfico é uma ferramenta de acompanhamento. 
            Qualquer preocupação com o crescimento deve ser avaliada por um profissional de saúde qualificado.
          </p>
        </div>
      </div>
    </div>
  );
}

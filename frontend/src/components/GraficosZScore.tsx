import {
  Brush,
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
import { useEffect, useMemo, useState, useRef } from "react";
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

interface GraficosZScoreProps {
  consultasSelecionadas?: Array<{
    id: string;
    dataHora: string;
    pesoKg: number;
    estaturaCm: number;
    perimetroCefalicoCm: number;
  }>;
  sexo?: string; // "M" ou "F"
  idadeGestacionalSemanas?: number; // Semanas de gestação ao nascimento
  idadeGestacionalDias?: number; // Dias de gestação ao nascimento (0-6)
  dataNascimento?: string; // Data de nascimento para calcular idade corrigida
  nomeCrianca?: string; // Nome do recém-nascido
  pesoNascimentoGr?: number; // Peso ao nascer em gramas
  comprimentoCm?: number; // Comprimento ao nascer em cm
  perimetroCefalicoNascimentoCm?: number; // Perímetro cefálico ao nascer em cm
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
}: GraficosZScoreProps) {
  const [curvasReferencia, setCurvasReferencia] = useState<CurvaReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoCurva, setTipoCurva] = useState<string>("OMS");
  const [exportando, setExportando] = useState(false);
  const [zoomIntervalo, setZoomIntervalo] = useState<[number, number] | null>(null);
  const areaGraficoRef = useRef<HTMLDivElement>(null);
  
  // Determinar se é pré-termo (< 37 semanas gestacionais)
  const ehPretermo = idadeGestacionalSemanas < 37;

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
  }, [sexo, ehPretermo]);

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

  // Ticks para grid vertical (cada mês para OMS)
  const gridTicksX = useMemo(() => {
    if (ehPretermo) {
      return null; // Sem grid vertical para pré-termo
    }
    // Grid vertical: uma linha para cada mês (0 a 60 meses)
    const meses = [];
    for (let m = 0; m <= 60; m++) {
      meses.push(Math.round(m * 4.33));
    }
    return meses;
  }, [ehPretermo]);
  const xAxisTicks = useMemo(() => {
    if (!zoomIntervalo) return ticksBase;
    return ticksBase.filter(
      (tick) => tick >= zoomIntervalo[0] && tick <= zoomIntervalo[1]
    );
  }, [ticksBase, zoomIntervalo]);

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

  const xAxisDomain = zoomIntervalo ?? dominioPadraoX;

  const indiceInicioZoom = useMemo(() => {
    if (!zoomIntervalo || curvasReferencia.length === 0) return 0;
    const idx = curvasReferencia.findIndex(
      (item) => item.semanas >= zoomIntervalo[0]
    );
    return idx === -1 ? 0 : idx;
  }, [curvasReferencia, zoomIntervalo]);

  const indiceFimZoom = useMemo(() => {
    if (!zoomIntervalo || curvasReferencia.length === 0)
      return curvasReferencia.length - 1;
    let idx = curvasReferencia.length - 1;
    for (let i = curvasReferencia.length - 1; i >= 0; i--) {
      if (curvasReferencia[i].semanas <= zoomIntervalo[1]) {
        idx = i;
        break;
      }
    }
    return idx;
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
    const legendWidth = ehPretermo ? 220 : 0;
    const headerHeight = 180; // Altura do cabeçalho
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = (legendWidth + width + padding * 3) * pixelRatio;
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
    const headerStartX = legendWidth + padding * 2;
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
    if (ehPretermo) {
      const legendStartX = padding;
      let legendStartY = padding + 4;
      outCtx.fillStyle = "#0f172a";
      outCtx.font = "600 14px 'Inter', sans-serif";
      outCtx.fillText("INTERVALOS Z-SCORE", legendStartX, legendStartY + 12);
      legendStartY += 32;

      PRETERMO_LEGEND.forEach((item, index) => {
        const y = legendStartY + index * 26;
        outCtx.fillStyle = item.color;
        outCtx.fillRect(legendStartX, y, 40, 4);
        outCtx.fillStyle = "#475569";
        outCtx.font = "400 12px 'Inter', sans-serif";
        outCtx.fillText(item.label, legendStartX + 52, y + 4);
      });
    }

    // Desenhar gráfico abaixo do cabeçalho
    outCtx.drawImage(
      chartCanvas,
      legendWidth + padding * 2,
      padding + headerHeight,
      width,
      height
    );

    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    return outputCanvas.toDataURL("image/jpeg", 0.95);
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
      {/* Gráfico Peso */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6 gap-4">
          <div className="text-center lg:text-left flex-1">
          <div>
            <h3 
              className="text-xl font-bold mb-1"
              style={{ color: cores.primaria }}
            >
              Peso para idade {sexo === "M" ? "MENINOS" : "MENINAS"}
            </h3>
            <p className="text-xs text-gray-500 mb-1">
              {ehPretermo ? "Nascimento até 64 semanas (z-scores)" : "Nascimento até 5 anos (z-scores)"}
            </p>
            <p className="text-xs text-gray-400 italic">
              {ehPretermo ? "INTERGROWTH-21st" : "WHO Child Growth Standards"}
              {ehPretermo && (
                <span className="ml-2 text-orange-600">
                  (Pré-termo - Idade corrigida)
                </span>
              )}
            </p>
          </div>
          </div>
          <div className="flex items-center justify-center lg:justify-end gap-2">
            {zoomIntervalo && (
              <button
                onClick={() => setZoomIntervalo(null)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Resetar zoom
              </button>
            )}
            <button
              onClick={handleExportarJpeg}
              disabled={exportando}
              className="inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportando ? "Exportando..." : "Exportar JPEG"}
            </button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-6" ref={areaGraficoRef}>
          {ehPretermo && (
            <div className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-4 py-5 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Intervalos Z-score
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {PRETERMO_LEGEND.map((item) => (
                  <li key={item.label} className="flex items-center gap-3">
                    <span
                      className="h-0.5 w-10 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex-1">
            <div
              className="mx-auto rounded-lg overflow-hidden"
              style={{
                backgroundColor: cores.primaria,
                padding: "4px",
                ...(ehPretermo
                  ? { width: 760, height: 960 }
                  : { width: "100%", height: 1200 }),
              }}
            >
              <div
                className="bg-white rounded"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={curvasReferencia}
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
                {curvasReferencia.length > 0 && (
                  <Brush
                    dataKey="semanas"
                    height={26}
                    stroke={cores.primaria}
                    travellerWidth={10}
                    startIndex={indiceInicioZoom}
                    endIndex={indiceFimZoom}
                    onChange={(range) => {
                      if (
                        !range ||
                        range.startIndex == null ||
                        range.endIndex == null
                      ) {
                        return;
                      }
                      const start = curvasReferencia[Math.max(0, range.startIndex)];
                      const end =
                        curvasReferencia[
                          Math.min(curvasReferencia.length - 1, range.endIndex)
                        ];
                      if (start && end) {
                        const inicioSemana = start.semanas;
                        const fimSemana =
                          end.semanas === inicioSemana
                            ? end.semanas + 0.5
                            : end.semanas;
                        setZoomIntervalo([inicioSemana, fimSemana]);
                      }
                    }}
                  />
                )}
              </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        {dadosPacienteScatter.length === 0 && (
          <p className="text-center text-xs text-slate-500">
            Nenhum ponto do paciente para exibir. Adicione atendimentos para visualizar no gráfico.
          </p>
        )}
      </div>

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

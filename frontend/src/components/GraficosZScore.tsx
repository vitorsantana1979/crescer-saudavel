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
  dataNascimento?: string; // Data de nascimento para calcular idade corrigida
}

const PRETERMO_LEGEND = [
  { label: "Z+3 (P99,9)", color: "#DC2626" },
  { label: "Z+2 (P97,7)", color: "#F59E0B" },
  { label: "Z+1 (P84,1)", color: "#1F2937" },
  { label: "Z 0 (P50)", color: "#10B981" },
  { label: "Z-1 (P15,9)", color: "#1F2937" },
  { label: "Z-2 (P2,3)", color: "#F59E0B" },
  { label: "Z-3 (P0,1)", color: "#DC2626" },
];

export default function GraficosZScore({
  consultasSelecionadas = [],
  sexo = "M",
  idadeGestacionalSemanas = 40,
  dataNascimento,
}: GraficosZScoreProps) {
  const [curvasReferencia, setCurvasReferencia] = useState<CurvaReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoCurva, setTipoCurva] = useState<string>("OMS");
  const [exportando, setExportando] = useState(false);
  const [zoomIntervalo, setZoomIntervalo] = useState<[number, number] | null>(null);
  const areaGraficoRef = useRef<HTMLDivElement>(null);
  
  // Determinar se é pré-termo (< 37 semanas gestacionais)
  const ehPretermo = idadeGestacionalSemanas < 37;
  
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
          const nascimento = new Date(dataNascimento);
          const diasDeVida = Math.floor(
            (dataConsulta.getTime() - nascimento.getTime()) / msPorDia
          );
          const semanasVida = diasDeVida / 7;
          semanasTotais = ehPretermo
            ? idadeGestacionalSemanas + semanasVida
            : semanasVida;
        } else {
          const diasDesdePrimeira = Math.floor(
            (dataConsulta.getTime() - primeiroAtendimento.getTime()) / msPorDia
          );
          semanasTotais = diasDesdePrimeira / 7;
        }

        if (!Number.isFinite(semanasTotais)) return null;

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
      .filter((ponto) => {
        if (!ehPretermo) return true;
        return ponto.semanasFracionadas >= 27 && ponto.semanasFracionadas <= 64;
      })
      .sort((a, b) => a.semanasFracionadas - b.semanasFracionadas);

    return { pontos, houveConversao };
  }, [consultasSelecionadas, dataNascimento, ehPretermo, idadeGestacionalSemanas]);

  const pontosPaciente = pontosPacienteMemo.pontos;

  useEffect(() => {
    if (pontosPacienteMemo.houveConversao) {
      toast.success(
        "Alguns pesos foram convertidos de gramas para quilogramas para exibição no gráfico.",
        { id: "peso-convertido-info" }
      );
    }
  }, [pontosPacienteMemo.houveConversao]);

  const semanasDisponiveis = useMemo(() => {
    if (curvasReferencia.length === 0) {
      return {
        min: ehPretermo ? 27 : 0,
        max: ehPretermo ? 64 : 64,
      };
    }

    const semanas = curvasReferencia.map((c) => c.semanas);
    if (pontosPaciente.length > 0) {
      semanas.push(...pontosPaciente.map((p) => p.semanasFracionadas));
    }
    const minSemana = ehPretermo
      ? Math.max(Math.min(...semanas), 27)
      : Math.min(...semanas);
    return {
      min: minSemana,
      max: Math.max(...semanas),
    };
  }, [curvasReferencia, pontosPaciente, ehPretermo]);

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

  const dadosPacienteScatter = useMemo(() => {
    return pontosPaciente.map((p) => ({
      semanas: p.semanasFracionadas,
      semanasInt: p.semanasInt,
      dias: p.dias,
      pesoPaciente: p.peso,
    }));
  }, [pontosPaciente]);

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

  const ticksBase = useMemo(() => {
    if (ehPretermo) {
      const total = semanasDisponiveis.max - semanasDisponiveis.min + 1;
      return Array.from({ length: total }, (_, i) => semanasDisponiveis.min + i);
    }

    return Array.from({ length: 65 }, (_, i) => i); // 0 a 64
  }, [ehPretermo, semanasDisponiveis]);
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

    return Array.from({ length: 60 }, (_, i) => i * 0.2);
  }, [ehPretermo, yAxisPretermoMax]);

  const dominioPadraoX = ehPretermo
    ? ([semanasDisponiveis.min, semanasDisponiveis.max] as [number, number])
    : ([0, 64] as [number, number]);

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

  const yAxisDomain = ehPretermo ? [0, yAxisPretermoMax] : [0, 11.8];

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
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = (legendWidth + width + padding * 3) * pixelRatio;
    outputCanvas.height = (height + padding * 2) * pixelRatio;

    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) {
      throw new Error("Contexto 2D indisponível para exportação final.");
    }
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    outCtx.scale(pixelRatio, pixelRatio);

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

    outCtx.drawImage(
      chartCanvas,
      legendWidth + padding * 2,
      padding,
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

  return (
    <div className="space-y-6">
      {/* Gráfico Peso */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6 gap-4">
          <div className="text-center lg:text-left flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Peso (kg)</h3>
            <p className="text-sm text-gray-600">
              Curvas internacionais de crescimento {tipoCurva} (
              {sexo === "M" ? "meninos" : "meninas"})
              {ehPretermo && (
                <span className="ml-2 text-xs text-orange-600">
                  (Pré-termo - Idade corrigida)
                </span>
              )}
            </p>
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
              className="inline-flex items-center justify-center rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="mx-auto"
              style={
                ehPretermo
                  ? { width: 760, height: 960 }
                  : { width: "100%", height: 1200 }
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={curvasReferencia}
                  margin={{ top: 20, right: 50, left: 50, bottom: 60 }}
                  syncId="peso-chart"
                >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#CBD5F5"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="semanas"
                  type="number"
                  label={{
                    value: "Semanas",
                    position: "insideBottom",
                    offset: -10,
                    style: {
                      fontSize: "14px",
                      fontWeight: "bold",
                      fill: "#475569",
                    },
                  }}
                  stroke="#475569"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  domain={xAxisDomain}
                  ticks={xAxisTicks}
                  interval={0}
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
                      fill: "#475569",
                    },
                  }}
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: "#475569" }}
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
                      fill: "#475569",
                    },
                  }}
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: "#475569" }}
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
                      | { semanasInt: number; dias: number; pesoPaciente: number }
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

                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
                        <p className="font-medium text-gray-900">
                          {semanasLabel}
                        </p>
                        {curvaPayload && (
                          <p className="text-xs text-gray-600 mt-1">
                            Z-3: {curvaPayload.zN3} kg
                            <br />
                            Z-2: {curvaPayload.zN2} kg
                            <br />
                            Z-1: {curvaPayload.zN1} kg
                            <br />Z 0: {curvaPayload.z0} kg
                            <br />
                            Z+1: {curvaPayload.zP1} kg
                            <br />
                            Z+2: {curvaPayload.zP2} kg
                            <br />
                            Z+3: {curvaPayload.zP3} kg
                          </p>
                        )}
                        {pacientePayload && (
                          <p className="text-xs text-blue-700 mt-2 font-semibold">
                            Peso observado: {pacientePayload.pesoPaciente.toFixed(3)} kg
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                {/* Curvas de referência - estilo Intergrowth-21st */}
                <Line
                  type="monotone"
                  dataKey="zN3"
                  stroke="#DC2626"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  yAxisId="left"
                  name="-3"
                />
                <Line
                  type="monotone"
                  dataKey="zN2"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  yAxisId="left"
                  name="-2"
                />
                <Line
                  type="monotone"
                  dataKey="zN1"
                  stroke="#1F2937"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                  yAxisId="left"
                  name="-1"
                />
                <Line
                  type="monotone"
                  dataKey="z0"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                  yAxisId="left"
                  name="0"
                />
                <Line
                  type="monotone"
                  dataKey="zP1"
                  stroke="#1F2937"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                  yAxisId="left"
                  name="+1"
                />
                <Line
                  type="monotone"
                  dataKey="zP2"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  yAxisId="left"
                  name="+2"
                />
                <Line
                  type="monotone"
                  dataKey="zP3"
                  stroke="#DC2626"
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
                        fill="#ef4444"
                        stroke="#b91c1c"
                        strokeWidth={1.2}
                      />
                    )}
                    isAnimationActive={false}
                  />
                )}
                {curvasReferencia.length > 0 && (
                  <Brush
                    dataKey="semanas"
                    height={26}
                    stroke="#059669"
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
        {dadosPacienteScatter.length === 0 && (
          <p className="text-center text-xs text-slate-500">
            Selecione atendimentos e utilize o botão &quot;Plotar selecionados&quot; para visualizar os pontos do paciente.
          </p>
        )}
      </div>
    </div>
  );
}

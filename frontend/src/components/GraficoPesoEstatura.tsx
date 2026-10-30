import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/lib/api";
import {
  IDADE_TROCA_POSICAO_DIAS,
  classificarZ,
  formatarIdadeDias,
  formatarPercentil,
  formatarZ,
  interpolarZ,
  percentilDeZ,
} from "@/lib/crescimento";

// Peso para comprimento (deitado, 45-110 cm, até 2 anos) e peso para estatura (em pé, 65-120 cm,
// de 2 a 5 anos) — WHO Child Growth Standards. Eixo X em centímetros, já corrigidos pela posição.

export type TipoPesoEstatura = "comprimento" | "altura";

export interface PontoPesoEstatura {
  id: string;
  data: string;
  /** Idade usada na OMS (cronológica ou corrigida), em dias. */
  dia: number;
  /** Comprimento/estatura já corrigido pela posição da medida. */
  cm: number;
  pesoKg: number;
  zScorePesoEstatura?: number | null;
}

interface PontoCurva {
  cm: number;
  zN3: number;
  zN2: number;
  zN1: number;
  z0: number;
  zP1: number;
  zP2: number;
  zP3: number;
}

const CORES_LINHAS = { zN3: "#000000", zN2: "#DC2626", zN1: "#D97706", z0: "#15803D", zP1: "#D97706", zP2: "#DC2626", zP3: "#000000" };
const CORES_SEXO = {
  M: { primaria: "#2196F3", secundaria: "#1565C0", rotulo: "Meninos" },
  F: { primaria: "#E91E63", secundaria: "#AD1457", rotulo: "Meninas" },
};
const TIPOS: Record<TipoPesoEstatura, { botao: string; titulo: string; faixa: [number, number]; eixo: string }> = {
  comprimento: { botao: "Peso/comprimento (0–2 anos)", titulo: "Peso para comprimento", faixa: [45, 110], eixo: "Comprimento (cm)" },
  altura: { botao: "Peso/estatura (2–5 anos)", titulo: "Peso para estatura", faixa: [65, 120], eixo: "Estatura (cm)" },
};

const cacheCurvas = new Map<string, Promise<PontoCurva[]>>();

function carregarCurva(tipo: TipoPesoEstatura, sexo: "M" | "F"): Promise<PontoCurva[]> {
  const chave = `${tipo}/${sexo}`;
  const existente = cacheCurvas.get(chave);
  if (existente) return existente;
  const promessa = api
    .get<PontoCurva[]>(`/referencias/oms/peso-estatura/${tipo}/${sexo.toLowerCase()}/curva`)
    .then((r) => r.data)
    .catch((erro: unknown) => {
      cacheCurvas.delete(chave);
      throw erro;
    });
  cacheCurvas.set(chave, promessa);
  return promessa;
}

export default function GraficoPesoEstatura({
  sexo,
  pontos,
  altura = 480,
}: {
  sexo: "M" | "F";
  pontos: PontoPesoEstatura[];
  altura?: number;
}) {
  const ultimoDia = pontos.length ? Math.max(...pontos.map((p) => p.dia)) : 0;
  const [tipo, setTipo] = useState<TipoPesoEstatura>(ultimoDia >= IDADE_TROCA_POSICAO_DIAS ? "altura" : "comprimento");
  const [curva, setCurva] = useState<PontoCurva[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const cores = CORES_SEXO[sexo];
  const info = TIPOS[tipo];

  useEffect(() => {
    let ativo = true;
    setCurva(null);
    setErro(null);
    carregarCurva(tipo, sexo)
      .then((d) => ativo && setCurva(d))
      .catch(() => ativo && setErro("Não foi possível carregar a curva de peso/estatura da OMS."));
    return () => {
      ativo = false;
    };
  }, [tipo, sexo]);

  // Comprimento até 2 anos, estatura depois — cada atendimento cai em um dos dois gráficos
  const pontosTipo = useMemo(() => {
    const [min, max] = info.faixa;
    return pontos
      .filter((p) => (tipo === "comprimento") === p.dia < IDADE_TROCA_POSICAO_DIAS)
      .filter((p) => p.cm >= min && p.cm <= max && p.pesoKg > 0)
      .map((p) => {
        let z = p.zScorePesoEstatura ?? null;
        if (z == null && curva) {
          const ref = curva.reduce((a, b) => (Math.abs(b.cm - p.cm) < Math.abs(a.cm - p.cm) ? b : a));
          z = interpolarZ(p.pesoKg, [ref.zN3, ref.zN2, ref.zN1, ref.z0, ref.zP1, ref.zP2, ref.zP3]);
        }
        return { ...p, z };
      })
      .sort((a, b) => a.cm - b.cm);
  }, [pontos, tipo, info, curva]);

  const { dominioX, dominioY, ticksY } = useMemo(() => {
    const [min, max] = info.faixa;
    const cms = pontosTipo.map((p) => p.cm);
    const inicio = cms.length ? Math.max(min, Math.floor((Math.min(...cms) - 10) / 5) * 5) : min;
    const fim = cms.length ? Math.min(max, Math.ceil((Math.max(...cms) + 10) / 5) * 5) : max;
    const visiveis = (curva ?? []).filter((p) => p.cm >= inicio && p.cm <= fim);
    if (visiveis.length === 0) return { dominioX: [inicio, fim] as [number, number], dominioY: [0, 1] as [number, number], ticksY: [0, 1] };
    const ymin = Math.floor(Math.min(...visiveis.map((p) => p.zN3), ...pontosTipo.map((p) => p.pesoKg)));
    const ymax = Math.ceil(Math.max(...visiveis.map((p) => p.zP3), ...pontosTipo.map((p) => p.pesoKg)));
    const passo = ymax - ymin > 15 ? 2 : 1;
    const y0 = Math.floor(ymin / passo) * passo;
    const ticks: number[] = [];
    for (let v = y0; v <= ymax + passo; v += passo) ticks.push(v);
    return { dominioX: [inicio, fim] as [number, number], dominioY: [y0, ticks[ticks.length - 1]] as [number, number], ticksY: ticks };
  }, [curva, pontosTipo, info]);

  const ticksX = useMemo(() => {
    const t: number[] = [];
    for (let v = dominioX[0]; v <= dominioX[1]; v += 5) t.push(v);
    return t;
  }, [dominioX]);

  const curvaJanela = useMemo(
    () => (curva ?? []).filter((p) => p.cm >= dominioX[0] - 0.5 && p.cm <= dominioX[1] + 0.5),
    [curva, dominioX]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs w-fit">
        {(Object.keys(TIPOS) as TipoPesoEstatura[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`px-3 py-1.5 ${tipo === t ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            style={tipo === t ? { backgroundColor: cores.primaria } : undefined}
          >
            {TIPOS[t].botao}
          </button>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: cores.primaria, padding: 6 }}>
        <div className="flex items-baseline justify-between px-3 py-2 text-white">
          <div>
            <h4 className="text-base font-bold leading-tight">
              {info.titulo} — {cores.rotulo}
            </h4>
            <p className="text-xs opacity-90">
              {info.faixa[0]}–{info.faixa[1]} cm (escores z) · medida corrigida pela posição
            </p>
          </div>
          <span className="text-[10px] opacity-80">WHO Child Growth Standards</span>
        </div>
        <div className="bg-white rounded" style={{ height: altura }}>
          {erro ? (
            <div className="h-full flex items-center justify-center text-sm text-red-600">{erro}</div>
          ) : !curva ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">Carregando curva da OMS...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curvaJanela} margin={{ top: 16, right: 24, left: 8, bottom: 28 }}>
                <CartesianGrid stroke="#E5E7EB" strokeWidth={0.6} />
                <XAxis
                  dataKey="cm"
                  type="number"
                  domain={dominioX}
                  ticks={ticksX}
                  interval={0}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: cores.secundaria }}
                  stroke={cores.primaria}
                  label={{ value: info.eixo, position: "insideBottom", offset: -16, style: { fontSize: 12, fontWeight: "bold", fill: cores.secundaria } }}
                />
                <YAxis
                  yAxisId="y"
                  type="number"
                  domain={dominioY}
                  ticks={ticksY}
                  interval={0}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: cores.secundaria }}
                  stroke={cores.primaria}
                  width={40}
                  label={{ value: "Peso (kg)", angle: -90, position: "insideLeft", style: { fontSize: 12, fontWeight: "bold", fill: cores.secundaria } }}
                />
                {(["zN3", "zN2", "zN1", "z0", "zP1", "zP2", "zP3"] as const).map((k) => (
                  <Line
                    key={k}
                    yAxisId="y"
                    type="monotone"
                    dataKey={k}
                    stroke={CORES_LINHAS[k]}
                    strokeWidth={k === "z0" ? 1.6 : k === "zN1" || k === "zP1" ? 1 : 1.4}
                    strokeDasharray={k === "zN1" || k === "zP1" ? "5 3" : undefined}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                ))}
                {pontosTipo.length > 0 && (
                  <Scatter
                    yAxisId="y"
                    data={pontosTipo}
                    dataKey="pesoKg"
                    name="Atendimentos"
                    isAnimationActive={false}
                    shape={(props: { cx?: number; cy?: number }) => (
                      <circle cx={props.cx} cy={props.cy} r={5} fill={cores.primaria} stroke={cores.secundaria} strokeWidth={2} />
                    )}
                  />
                )}
                <Tooltip
                  cursor={{ stroke: "#9CA3AF", strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const ponto = payload.find((p) => p.name === "Atendimentos")?.payload as
                      | (PontoPesoEstatura & { z: number | null })
                      | undefined;
                    if (!ponto) return null;
                    const classificacao = classificarZ("pesoEstatura", ponto.z);
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-xs">
                        <p className="font-semibold text-gray-900">
                          {new Date(ponto.data).toLocaleDateString("pt-BR")} · {formatarIdadeDias(ponto.dia)}
                        </p>
                        <p className="mt-1" style={{ color: cores.secundaria }}>
                          {ponto.pesoKg.toFixed(3).replace(".", ",")} kg com {ponto.cm.toFixed(1).replace(".", ",")} cm
                        </p>
                        {ponto.z != null && (
                          <p className="mt-1 text-gray-800">
                            Z-score: <strong>{formatarZ(ponto.z)}</strong>
                            <span className="text-gray-500"> · {formatarPercentil(percentilDeZ(ponto.z))}</span>
                            {classificacao && <span className={`ml-2 font-semibold ${classificacao.cor}`}>{classificacao.rotulo}</span>}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {pontosTipo.length === 0 && (
        <p className="text-[11px] text-gray-500">
          Sem atendimentos nesta faixa ({tipo === "comprimento" ? "até 2 anos, 45–110 cm" : "de 2 a 5 anos, 65–120 cm"}).
        </p>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/lib/api";
import {
  DIAS_POR_MES,
  OMS_DIA_MAXIMO,
  classificarZ,
  formatarIdadeDias,
  formatarTipoIdade,
  interpolarZ,
  type TipoIdade,
} from "@/lib/crescimento";

// Gráfico OMS (WHO Child Growth Standards) com os cinco recortes oficiais como filtro.
// Curvas vêm de /referencias/oms/{medida}/{sexo}/curva-diaria (dia 0-1856); eixo X em dias,
// rotulado em semanas/meses/anos completos (1 mês = 30,4375 dias).

export type MedidaOms = "peso" | "estatura" | "perimetro";
export type RecorteOms = "0-6m" | "0-2a" | "6m-2a" | "2-5a" | "0-5a";

export interface PontoPacienteOms {
  id: string;
  data: string;
  dia: number;
  tipoIdade: TipoIdade;
  pesoKg?: number | null;
  estaturaCm?: number | null;
  perimetroCefalicoCm?: number | null;
  zScorePeso?: number | null;
  zScoreAltura?: number | null;
  zScorePerimetro?: number | null;
}

interface PontoCurva {
  dia: number;
  zN3: number;
  zN2: number;
  zN1: number;
  z0: number;
  zP1: number;
  zP2: number;
  zP3: number;
}

interface Props {
  sexo: "M" | "F";
  pontos: PontoPacienteOms[];
  medidaInicial?: MedidaOms;
  recorteInicial?: RecorteOms;
  titulo?: string;
  altura?: number;
}

const MES = DIAS_POR_MES;
const DIA_FIM_INTERGROWTH = 24 * 7; // 64 semanas pós-menstruais = 24 semanas de idade corrigida

const CORES_LINHAS = {
  zN3: "#000000",
  zN2: "#DC2626",
  zN1: "#D97706",
  z0: "#15803D",
  zP1: "#D97706",
  zP2: "#DC2626",
  zP3: "#000000",
};

const CORES_SEXO = {
  M: { primaria: "#2196F3", secundaria: "#1565C0", rotulo: "Meninos" },
  F: { primaria: "#E91E63", secundaria: "#AD1457", rotulo: "Meninas" },
};

const MEDIDAS: Record<MedidaOms, { rotulo: string; unidade: string; eixo: string }> = {
  peso: { rotulo: "Peso para idade", unidade: "kg", eixo: "Peso (kg)" },
  estatura: { rotulo: "Comprimento/estatura para idade", unidade: "cm", eixo: "Comprimento/estatura (cm)" },
  perimetro: { rotulo: "Perímetro cefálico para idade", unidade: "cm", eixo: "Perímetro cefálico (cm)" },
};

interface Tick {
  dia: number;
  rotulo: string;
  forte?: boolean;
}

interface Recorte {
  id: RecorteOms;
  rotulo: string;
  dominio: [number, number];
  ticks: Tick[];
  eixoX: string;
  passoCurva: number;
  // Domínios de peso dos gráficos oficiais da OMS
  dominioPeso: Record<"M" | "F", [number, number]>;
  passoPeso: number;
}

function rotuloMes(m: number): string {
  if (m === 0) return "Nasc.";
  if (m % 12 === 0) return `${m / 12} ${m === 12 ? "ano" : "anos"}`;
  return String(m % 12);
}

function ticksMensais(inicio: number, fim: number, passo: number): Tick[] {
  const ticks: Tick[] = [];
  for (let m = inicio; m <= fim; m += passo) {
    ticks.push({ dia: Math.min(m * MES, OMS_DIA_MAXIMO), rotulo: rotuloMes(m), forte: m % 12 === 0 });
  }
  return ticks;
}

const RECORTES: Recorte[] = [
  {
    id: "0-6m",
    rotulo: "Nascimento a 6 meses",
    dominio: [0, 6 * MES],
    ticks: [
      ...Array.from({ length: 14 }, (_, s) => ({ dia: s * 7, rotulo: String(s), forte: s === 0 })),
      ...[3, 4, 5, 6].map((m) => ({ dia: m * MES, rotulo: `${m} m`, forte: true })),
    ],
    eixoX: "Idade (semanas 0-13; depois meses completos)",
    passoCurva: 1,
    dominioPeso: { F: [2, 10], M: [2, 11] },
    passoPeso: 0.5,
  },
  {
    id: "0-2a",
    rotulo: "Nascimento a 2 anos",
    dominio: [0, 24 * MES],
    ticks: ticksMensais(0, 24, 1),
    eixoX: "Idade (meses e anos completos)",
    passoCurva: 2,
    dominioPeso: { F: [2, 17], M: [2, 17] },
    passoPeso: 0.5,
  },
  {
    id: "6m-2a",
    rotulo: "6 meses a 2 anos",
    dominio: [6 * MES, 24 * MES],
    ticks: ticksMensais(6, 24, 1),
    eixoX: "Idade (meses e anos completos)",
    passoCurva: 2,
    dominioPeso: { F: [5, 17], M: [6, 17] },
    passoPeso: 0.5,
  },
  {
    id: "2-5a",
    rotulo: "2 a 5 anos",
    dominio: [24 * MES, OMS_DIA_MAXIMO],
    ticks: ticksMensais(24, 60, 2),
    eixoX: "Idade (meses e anos completos)",
    passoCurva: 7,
    dominioPeso: { F: [7, 30], M: [8, 28] },
    passoPeso: 1,
  },
  {
    id: "0-5a",
    rotulo: "Nascimento a 5 anos",
    dominio: [0, OMS_DIA_MAXIMO],
    ticks: ticksMensais(0, 60, 2),
    eixoX: "Idade (meses e anos completos)",
    passoCurva: 7,
    dominioPeso: { F: [2, 30], M: [2, 28] },
    passoPeso: 1,
  },
];

const cacheCurvas = new Map<string, Promise<PontoCurva[]>>();

function carregarCurva(medida: MedidaOms, sexo: "M" | "F"): Promise<PontoCurva[]> {
  const chave = `${medida}/${sexo}`;
  const existente = cacheCurvas.get(chave);
  if (existente) return existente;

  const promessa: Promise<PontoCurva[]> = api
    .get<PontoCurva[]>(`/referencias/oms/${medida}/${sexo.toLowerCase()}/curva-diaria`)
    .then((resposta) => resposta.data)
    .catch((erro: unknown) => {
      cacheCurvas.delete(chave);
      throw erro;
    });
  cacheCurvas.set(chave, promessa);
  return promessa;
}

function valorDaMedida(ponto: PontoPacienteOms, medida: MedidaOms): number | null {
  const valor =
    medida === "peso" ? ponto.pesoKg : medida === "estatura" ? ponto.estaturaCm : ponto.perimetroCefalicoCm;
  return valor != null && Number.isFinite(valor) && valor > 0 ? valor : null;
}

function zDaMedida(ponto: PontoPacienteOms, medida: MedidaOms): number | null {
  const z = medida === "peso" ? ponto.zScorePeso : medida === "estatura" ? ponto.zScoreAltura : ponto.zScorePerimetro;
  return z != null && Number.isFinite(z) ? z : null;
}

function arredondar(valor: number, passo: number, paraCima: boolean): number {
  return (paraCima ? Math.ceil(valor / passo) : Math.floor(valor / passo)) * passo;
}

interface PontoPlotado {
  id: string;
  dia: number;
  valor: number;
  data: string;
  tipoIdade: TipoIdade;
  z: number | null;
}

export default function GraficoOms({
  sexo,
  pontos,
  medidaInicial = "peso",
  recorteInicial,
  titulo,
  altura = 560,
}: Props) {
  const [medida, setMedida] = useState<MedidaOms>(medidaInicial);
  const [recorteId, setRecorteId] = useState<RecorteOms>(recorteInicial ?? recorteSugerido(pontos));
  const [mostrarZ1, setMostrarZ1] = useState(false);
  const [curva, setCurva] = useState<PontoCurva[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const cores = CORES_SEXO[sexo];
  const recorte = RECORTES.find((r) => r.id === recorteId) ?? RECORTES[4];
  const infoMedida = MEDIDAS[medida];

  useEffect(() => {
    let ativo = true;
    setCurva(null);
    setErro(null);
    carregarCurva(medida, sexo)
      .then((dados) => ativo && setCurva(dados))
      .catch(() => ativo && setErro("Não foi possível carregar a curva de referência da OMS."));
    return () => {
      ativo = false;
    };
  }, [medida, sexo]);

  const curvaJanela = useMemo(() => {
    if (!curva) return [];
    const [inicio, fim] = recorte.dominio;
    return curva.filter(
      (p) =>
        p.dia >= inicio - recorte.passoCurva &&
        p.dia <= fim + recorte.passoCurva &&
        (p.dia % recorte.passoCurva === 0 || p.dia === OMS_DIA_MAXIMO)
    );
  }, [curva, recorte]);

  const pontosPlotados = useMemo<PontoPlotado[]>(() => {
    return pontos
      .map((p) => {
        const valor = valorDaMedida(p, medida);
        if (valor == null) return null;
        let z = zDaMedida(p, medida);
        if (z == null && curva) {
          const ref = curva[Math.min(Math.max(Math.round(p.dia), 0), OMS_DIA_MAXIMO)];
          if (ref) z = interpolarZ(valor, [ref.zN3, ref.zN2, ref.zN1, ref.z0, ref.zP1, ref.zP2, ref.zP3]);
        }
        return { id: p.id, dia: p.dia, valor, data: p.data, tipoIdade: p.tipoIdade, z };
      })
      .filter((p): p is PontoPlotado => p !== null)
      .sort((a, b) => a.dia - b.dia);
  }, [pontos, medida, curva]);

  const pontosJanela = useMemo(
    () => pontosPlotados.filter((p) => p.dia >= recorte.dominio[0] && p.dia <= recorte.dominio[1]),
    [pontosPlotados, recorte]
  );

  const { dominioY, ticksY, passoY } = useMemo(() => {
    if (medida === "peso") {
      const dominio = recorte.dominioPeso[sexo];
      return { dominioY: dominio, ticksY: gerarTicks(dominio, recorte.passoPeso), passoY: recorte.passoPeso };
    }
    if (curvaJanela.length === 0) {
      return { dominioY: [0, 1] as [number, number], ticksY: [0, 1], passoY: 1 };
    }
    const minimo = Math.min(...curvaJanela.map((p) => p.zN3), ...pontosJanela.map((p) => p.valor));
    const maximo = Math.max(...curvaJanela.map((p) => p.zP3), ...pontosJanela.map((p) => p.valor));
    const amplitude = maximo - minimo;
    const passo = amplitude > 40 ? 5 : amplitude > 20 ? 2 : 1;
    const dominio: [number, number] = [arredondar(minimo - 1, passo, false), arredondar(maximo + 1, passo, true)];
    return { dominioY: dominio, ticksY: gerarTicks(dominio, passo), passoY: passo };
  }, [medida, recorte, sexo, curvaJanela, pontosJanela]);

  const temIdadeCorrigida = pontos.some((p) => p.tipoIdade === "Corrigida");
  const mostrarFimIntergrowth =
    temIdadeCorrigida && DIA_FIM_INTERGROWTH >= recorte.dominio[0] && DIA_FIM_INTERGROWTH <= recorte.dominio[1];
  const pontosForaDoRecorte = pontosPlotados.length - pontosJanela.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(Object.keys(MEDIDAS) as MedidaOms[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMedida(m)}
              className={`px-3 py-1.5 ${medida === m ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              style={medida === m ? { backgroundColor: cores.primaria } : undefined}
            >
              {m === "peso" ? "Peso" : m === "estatura" ? "Comprimento/Estatura" : "Perímetro cefálico"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap rounded-lg border border-gray-200 overflow-hidden text-xs">
          {RECORTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRecorteId(r.id)}
              className={`px-3 py-1.5 ${recorteId === r.id ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              style={recorteId === r.id ? { backgroundColor: cores.primaria } : undefined}
            >
              {r.rotulo}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-700 ml-auto">
          <input type="checkbox" checked={mostrarZ1} onChange={(e) => setMostrarZ1(e.target.checked)} />
          Mostrar linhas ±1
        </label>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: cores.primaria, padding: 6 }}>
        <div className="flex items-baseline justify-between px-3 py-2 text-white">
          <div>
            <h4 className="text-base font-bold leading-tight">
              {titulo ?? `${infoMedida.rotulo} — ${cores.rotulo}`}
            </h4>
            <p className="text-xs opacity-90">{recorte.rotulo} (escores z)</p>
          </div>
          <span className="text-[10px] opacity-80">WHO Child Growth Standards</span>
        </div>

        <div className="bg-white rounded" style={{ height: altura }}>
          {erro ? (
            <div className="h-full flex items-center justify-center text-sm text-red-600">{erro}</div>
          ) : !curva ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">Carregando curvas da OMS...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curvaJanela} margin={{ top: 16, right: 48, left: 8, bottom: 28 }}>
                <CartesianGrid stroke="#E5E7EB" strokeWidth={0.6} />
                <XAxis
                  dataKey="dia"
                  type="number"
                  domain={recorte.dominio}
                  ticks={recorte.ticks.map((t) => t.dia)}
                  interval={0}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: cores.secundaria }}
                  tickFormatter={(dia: number) => recorte.ticks.find((t) => t.dia === dia)?.rotulo ?? ""}
                  stroke={cores.primaria}
                  label={{
                    value: recorte.eixoX,
                    position: "insideBottom",
                    offset: -16,
                    style: { fontSize: 12, fontWeight: "bold", fill: cores.secundaria },
                  }}
                />
                <YAxis
                  yAxisId="y"
                  type="number"
                  domain={dominioY}
                  ticks={ticksY}
                  interval={0}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: cores.secundaria }}
                  tickFormatter={(v: number) => formatarTickY(v, passoY)}
                  stroke={cores.primaria}
                  width={44}
                  label={{
                    value: infoMedida.eixo,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fontWeight: "bold", fill: cores.secundaria },
                  }}
                />
                <YAxis
                  yAxisId="direita"
                  orientation="right"
                  type="number"
                  domain={dominioY}
                  ticks={ticksY}
                  interval={0}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: cores.secundaria }}
                  tickFormatter={(v: number) => formatarTickY(v, passoY)}
                  stroke={cores.primaria}
                  width={44}
                />

                {recorte.ticks
                  .filter((t) => t.forte && t.dia > recorte.dominio[0] && t.dia < recorte.dominio[1])
                  .map((t) => (
                    <ReferenceLine key={t.dia} yAxisId="y" x={t.dia} stroke="#9CA3AF" strokeWidth={1.2} />
                  ))}

                {mostrarFimIntergrowth && (
                  <ReferenceLine
                    yAxisId="y"
                    x={DIA_FIM_INTERGROWTH}
                    stroke="#F97316"
                    strokeDasharray="4 3"
                    label={{ value: "fim INTERGROWTH (64 s)", position: "top", fontSize: 10, fill: "#C2410C" }}
                  />
                )}

                <Line yAxisId="y" type="monotone" dataKey="zN3" stroke={CORES_LINHAS.zN3} strokeWidth={1.4} dot={false} isAnimationActive={false} name="-3" />
                <Line yAxisId="y" type="monotone" dataKey="zN2" stroke={CORES_LINHAS.zN2} strokeWidth={1.4} dot={false} isAnimationActive={false} name="-2" />
                {mostrarZ1 && (
                  <Line yAxisId="y" type="monotone" dataKey="zN1" stroke={CORES_LINHAS.zN1} strokeWidth={1} strokeDasharray="5 3" dot={false} isAnimationActive={false} name="-1" />
                )}
                <Line yAxisId="y" type="monotone" dataKey="z0" stroke={CORES_LINHAS.z0} strokeWidth={1.6} dot={false} isAnimationActive={false} name="0" />
                {mostrarZ1 && (
                  <Line yAxisId="y" type="monotone" dataKey="zP1" stroke={CORES_LINHAS.zP1} strokeWidth={1} strokeDasharray="5 3" dot={false} isAnimationActive={false} name="+1" />
                )}
                <Line yAxisId="y" type="monotone" dataKey="zP2" stroke={CORES_LINHAS.zP2} strokeWidth={1.4} dot={false} isAnimationActive={false} name="+2" />
                <Line yAxisId="y" type="monotone" dataKey="zP3" stroke={CORES_LINHAS.zP3} strokeWidth={1.4} dot={false} isAnimationActive={false} name="+3" />

                {pontosJanela.length > 1 && (
                  <Line
                    yAxisId="y"
                    data={pontosJanela}
                    dataKey="valor"
                    type="linear"
                    stroke={cores.primaria}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    name="paciente-linha"
                    tooltipType="none"
                  />
                )}
                {pontosJanela.length > 0 && (
                  <Scatter
                    yAxisId="y"
                    data={pontosJanela}
                    dataKey="valor"
                    name="Atendimentos"
                    isAnimationActive={false}
                    shape={(props: { cx?: number; cy?: number; payload?: PontoPlotado }) => (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={5}
                        fill={props.payload?.tipoIdade === "Corrigida" ? "#FFFFFF" : cores.primaria}
                        stroke={cores.secundaria}
                        strokeWidth={2}
                      />
                    )}
                  />
                )}

                <Tooltip
                  cursor={{ stroke: "#9CA3AF", strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const ponto = payload.find((p) => p.dataKey === "valor" && p.name === "Atendimentos")?.payload as
                      | PontoPlotado
                      | undefined;
                    const ref = payload.find((p) => typeof p.dataKey === "string" && p.dataKey.startsWith("z"))?.payload as
                      | PontoCurva
                      | undefined;
                    if (!ponto && !ref) return null;
                    const classificacao = ponto ? classificarZ(ponto.z) : null;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-xs">
                        {ponto ? (
                          <>
                            <p className="font-semibold text-gray-900">
                              {new Date(ponto.data).toLocaleDateString("pt-BR")} · {formatarIdadeDias(ponto.dia)}
                              <span className="text-gray-500 font-normal"> ({formatarTipoIdade(ponto.tipoIdade)})</span>
                            </p>
                            <p className="mt-1" style={{ color: cores.secundaria }}>
                              {infoMedida.rotulo.split(" ")[0]}: <strong>{formatarValor(ponto.valor, medida)} {infoMedida.unidade}</strong>
                            </p>
                            {ponto.z != null && (
                              <p className="mt-1 text-gray-800">
                                Z-score: <strong>{ponto.z.toFixed(2).replace(".", ",")}</strong>
                                {classificacao && <span className={`ml-2 font-semibold ${classificacao.cor}`}>{classificacao.rotulo}</span>}
                              </p>
                            )}
                          </>
                        ) : (
                          ref && (
                            <>
                              <p className="font-semibold text-gray-900">{formatarIdadeDias(ref.dia)}</p>
                              <p className="mt-1 text-gray-600 leading-5">
                                +3: {formatarValor(ref.zP3, medida)} · +2: {formatarValor(ref.zP2, medida)} · 0: {formatarValor(ref.z0, medida)}
                                <br />
                                −2: {formatarValor(ref.zN2, medida)} · −3: {formatarValor(ref.zN3, medida)} {infoMedida.unidade}
                              </p>
                            </>
                          )
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
        <Legenda cor={CORES_LINHAS.zP3} texto="±3" />
        <Legenda cor={CORES_LINHAS.zP2} texto="±2" />
        {mostrarZ1 && <Legenda cor={CORES_LINHAS.zP1} texto="±1" tracejada />}
        <Legenda cor={CORES_LINHAS.z0} texto="mediana (0)" />
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: cores.primaria }} /> atendimento
        </span>
        {temIdadeCorrigida && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: cores.secundaria }} /> idade corrigida
          </span>
        )}
        {pontosForaDoRecorte > 0 && (
          <span className="ml-auto text-gray-500">
            {pontosForaDoRecorte} atendimento{pontosForaDoRecorte > 1 ? "s" : ""} fora deste recorte
          </span>
        )}
        {pontosPlotados.length === 0 && <span className="ml-auto text-gray-500">Sem atendimentos com {infoMedida.rotulo.split(" ")[0].toLowerCase()} para plotar.</span>}
      </div>
    </div>
  );
}

function Legenda({ cor, texto, tracejada }: { cor: string; texto: string; tracejada?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-5"
        style={{ borderTop: `2px ${tracejada ? "dashed" : "solid"} ${cor}` }}
      />
      {texto}
    </span>
  );
}

function gerarTicks([inicio, fim]: [number, number], passo: number): number[] {
  const ticks: number[] = [];
  for (let v = inicio; v <= fim + 1e-9; v += passo) ticks.push(Number(v.toFixed(3)));
  return ticks;
}

function formatarTickY(valor: number, passo: number): string {
  // Rotula só os valores inteiros quando o passo é fracionário (as linhas intermediárias ficam na grade)
  if (passo < 1 && !Number.isInteger(valor)) return "";
  return String(valor);
}

function formatarValor(valor: number, medida: MedidaOms): string {
  return valor.toFixed(medida === "peso" ? 3 : 1).replace(".", ",");
}

// Começa no menor recorte que contém o último atendimento
function recorteSugerido(pontos: PontoPacienteOms[]): RecorteOms {
  const ultimo = pontos.length ? Math.max(...pontos.map((p) => p.dia)) : 0;
  if (ultimo <= 6 * MES) return "0-6m";
  if (ultimo <= 24 * MES) return "0-2a";
  return "0-5a";
}

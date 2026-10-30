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
import { useTelaEstreita } from "@/lib/useTelaEstreita";
import {
  INTERGROWTH_SEMANA_MAX,
  INTERGROWTH_SEMANA_MIN,
  classificarZ,
  formatarPercentil,
  formatarZ,
  interpolarZ,
  percentilDeZ,
} from "@/lib/crescimento";

// Gráfico INTERGROWTH-21st (Postnatal Growth Standards for Preterm Infants, Villar 2015):
// peso, comprimento e perímetro cefálico por idade pós-menstrual, 27-64 semanas, linhas z −3..+3.
// Curvas de /referencias/INTERGROWTH/{medida}/{sexo}/curvas (um ponto por semana).

export type MedidaIntergrowth = "peso" | "estatura" | "perimetro";
export type RecorteIntergrowth = "27-40" | "35-50" | "40-64" | "27-64";

export interface PontoPacienteIntergrowth {
  id: string;
  data: string;
  /** Idade pós-menstrual em semanas (fracionária). */
  semanas: number;
  pesoKg?: number | null;
  estaturaCm?: number | null;
  perimetroCefalicoCm?: number | null;
  zScorePeso?: number | null;
  zScoreAltura?: number | null;
  zScorePerimetro?: number | null;
}

interface PontoCurva {
  semanas: number;
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
  pontos: PontoPacienteIntergrowth[];
  medidaInicial?: MedidaIntergrowth;
  altura?: number;
}

const LIMIAR_P10 = -1.28;

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

const MEDIDAS: Record<MedidaIntergrowth, { botao: string; rotulo: string; curto: string; unidade: string; eixo: string }> = {
  peso: { botao: "Peso", rotulo: "Peso para idade pós-menstrual", curto: "Peso", unidade: "kg", eixo: "Peso (kg)" },
  estatura: { botao: "Comprimento", rotulo: "Comprimento para idade pós-menstrual", curto: "Comprimento", unidade: "cm", eixo: "Comprimento (cm)" },
  perimetro: { botao: "Perímetro cefálico", rotulo: "Perímetro cefálico para idade pós-menstrual", curto: "Perímetro cefálico", unidade: "cm", eixo: "Perímetro cefálico (cm)" },
};

const RECORTES: { id: RecorteIntergrowth; rotulo: string; dominio: [number, number] }[] = [
  { id: "27-40", rotulo: "27–40 semanas", dominio: [27, 40] },
  { id: "35-50", rotulo: "35–50 semanas", dominio: [35, 50] },
  { id: "40-64", rotulo: "40–64 semanas", dominio: [40, 64] },
  { id: "27-64", rotulo: "27–64 semanas (completo)", dominio: [INTERGROWTH_SEMANA_MIN, INTERGROWTH_SEMANA_MAX] },
];

const cacheCurvas = new Map<string, Promise<PontoCurva[]>>();

function carregarCurva(medida: MedidaIntergrowth, sexo: "M" | "F"): Promise<PontoCurva[]> {
  const chave = `${medida}/${sexo}`;
  const existente = cacheCurvas.get(chave);
  if (existente) return existente;

  const promessa: Promise<PontoCurva[]> = api
    .get<PontoCurva[]>(`/referencias/INTERGROWTH/${medida}/${sexo.toLowerCase()}/curvas`)
    .then((resposta) => resposta.data)
    .catch((erro: unknown) => {
      cacheCurvas.delete(chave);
      throw erro;
    });
  cacheCurvas.set(chave, promessa);
  return promessa;
}

function valorDaMedida(ponto: PontoPacienteIntergrowth, medida: MedidaIntergrowth): number | null {
  const valor =
    medida === "peso" ? ponto.pesoKg : medida === "estatura" ? ponto.estaturaCm : ponto.perimetroCefalicoCm;
  return valor != null && Number.isFinite(valor) && valor > 0 ? valor : null;
}

function zDaMedida(ponto: PontoPacienteIntergrowth, medida: MedidaIntergrowth): number | null {
  const z = medida === "peso" ? ponto.zScorePeso : medida === "estatura" ? ponto.zScoreAltura : ponto.zScorePerimetro;
  return z != null && Number.isFinite(z) ? z : null;
}

/** Linhas z na semana pós-menstrual (interpolação linear entre semanas, como no backend). */
function linhasNaSemana(curva: PontoCurva[], semanas: number): number[] | null {
  if (curva.length === 0 || semanas < curva[0].semanas || semanas > curva[curva.length - 1].semanas) return null;
  const i = curva.findIndex((p) => p.semanas >= semanas);
  const b = curva[i];
  const a = i > 0 ? curva[i - 1] : b;
  const t = b.semanas === a.semanas ? 0 : (semanas - a.semanas) / (b.semanas - a.semanas);
  const chaves = ["zN3", "zN2", "zN1", "z0", "zP1", "zP2", "zP3"] as const;
  return chaves.map((k) => a[k] + (b[k] - a[k]) * t);
}

/** "34+2 semanas" a partir de semanas fracionárias. */
export function formatarSemanasPosMenstruais(semanas: number): string {
  let inteiras = Math.floor(semanas);
  let dias = Math.round((semanas - inteiras) * 7);
  if (dias === 7) {
    inteiras += 1;
    dias = 0;
  }
  return dias > 0 ? `${inteiras}+${dias} semanas` : `${inteiras} semanas`;
}

interface PontoPlotado {
  id: string;
  semanas: number;
  valor: number;
  data: string;
  z: number | null;
}

export default function GraficoIntergrowth({ sexo, pontos, medidaInicial = "peso", altura = 560 }: Props) {
  const [medida, setMedida] = useState<MedidaIntergrowth>(medidaInicial);
  const [recorteId, setRecorteId] = useState<RecorteIntergrowth>(() => recorteSugerido(pontos));
  const [curva, setCurva] = useState<PontoCurva[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const estreita = useTelaEstreita();

  const cores = CORES_SEXO[sexo];
  const recorte = RECORTES.find((r) => r.id === recorteId) ?? RECORTES[3];
  const infoMedida = MEDIDAS[medida];

  useEffect(() => {
    let ativo = true;
    setCurva(null);
    setErro(null);
    carregarCurva(medida, sexo)
      .then((dados) => ativo && setCurva(dados))
      .catch(() => ativo && setErro("Não foi possível carregar a curva INTERGROWTH-21st."));
    return () => {
      ativo = false;
    };
  }, [medida, sexo]);

  const curvaJanela = useMemo(() => {
    if (!curva) return [];
    const [inicio, fim] = recorte.dominio;
    return curva.filter((p) => p.semanas >= inicio - 1 && p.semanas <= fim + 1);
  }, [curva, recorte]);

  const pontosPlotados = useMemo<PontoPlotado[]>(() => {
    return pontos
      .map((p) => {
        const valor = valorDaMedida(p, medida);
        if (valor == null) return null;
        let z = zDaMedida(p, medida);
        if (z == null && curva) {
          const linhas = linhasNaSemana(curva, p.semanas);
          if (linhas) z = interpolarZ(valor, linhas);
        }
        return { id: p.id, semanas: p.semanas, valor, data: p.data, z };
      })
      .filter((p): p is PontoPlotado => p !== null)
      .sort((a, b) => a.semanas - b.semanas);
  }, [pontos, medida, curva]);

  const pontosJanela = useMemo(
    () => pontosPlotados.filter((p) => p.semanas >= recorte.dominio[0] && p.semanas <= recorte.dominio[1]),
    [pontosPlotados, recorte]
  );

  const { dominioY, ticksY, decimaisY } = useMemo(() => {
    const visiveis = curvaJanela.filter((p) => p.semanas >= recorte.dominio[0] && p.semanas <= recorte.dominio[1]);
    if (visiveis.length === 0) return { dominioY: [0, 1] as [number, number], ticksY: [0, 1], decimaisY: 0 };
    const minimo = Math.min(...visiveis.map((p) => p.zN3), ...pontosJanela.map((p) => p.valor));
    const maximo = Math.max(...visiveis.map((p) => p.zP3), ...pontosJanela.map((p) => p.valor));
    const amplitude = maximo - minimo;
    const passo =
      medida === "peso"
        ? amplitude > 6 ? 0.5 : amplitude > 2.5 ? 0.2 : 0.1
        : amplitude > 30 ? 2 : 1;
    const dominio: [number, number] = [
      Math.max(0, Math.floor((minimo - passo) / passo) * passo),
      Math.ceil((maximo + passo) / passo) * passo,
    ];
    const ticks: number[] = [];
    for (let v = dominio[0]; v <= dominio[1] + 1e-9; v += passo) ticks.push(Number(v.toFixed(2)));
    return { dominioY: dominio, ticksY: ticks, decimaisY: passo < 1 ? 1 : 0 };
  }, [curvaJanela, pontosJanela, recorte, medida]);

  const ticksX = useMemo(() => {
    const [inicio, fim] = recorte.dominio;
    // recortes longos (27-64 s) ficam ilegíveis com 38 rótulos em tela estreita ou no A4: de 2 em 2 semanas
    const passo = estreita ? (fim - inicio > 20 ? 4 : 2) : fim - inicio > 20 ? 2 : 1;
    const ticks: number[] = [];
    for (let s = inicio; s <= fim; s += passo) ticks.push(s);
    // o fim do recorte sempre tem rótulo; se o último ficou colado nele, troca em vez de somar
    const ultimo = ticks[ticks.length - 1];
    if (ultimo !== fim) {
      if (fim - ultimo < passo / 2 + 0.01) ticks[ticks.length - 1] = fim;
      else ticks.push(fim);
    }
    return ticks;
  }, [recorte, estreita]);

  const pontosForaDoRecorte = pontosPlotados.length - pontosJanela.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex flex-wrap rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(Object.keys(MEDIDAS) as MedidaIntergrowth[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMedida(m)}
              className={`px-3 py-1.5 ${medida === m ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              style={medida === m ? { backgroundColor: cores.primaria } : undefined}
            >
              {MEDIDAS[m].botao}
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
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: cores.primaria, padding: 6 }}>
        <div className="flex flex-col gap-1 px-3 py-2 text-white sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h4 className="text-base font-bold leading-tight">
              {infoMedida.rotulo} — {cores.rotulo} pré-termo
            </h4>
            <p className="text-xs opacity-90">{recorte.rotulo} pós-menstruais (escores z)</p>
          </div>
          <span className="text-[10px] opacity-80 text-right">
            INTERGROWTH-21st · Villar et al. 2015
            <br />© University of Oxford
          </span>
        </div>

        <div className="bg-white rounded" style={{ height: `min(${altura}px, 75vw + 120px)` }}>
          {erro ? (
            <div className="h-full flex items-center justify-center text-sm text-red-600">{erro}</div>
          ) : !curva ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">Carregando curvas INTERGROWTH-21st...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curvaJanela} margin={{ top: 16, right: estreita ? 8 : 48, left: estreita ? 0 : 8, bottom: 28 }}>
                <CartesianGrid stroke="#E5E7EB" strokeWidth={0.6} />
                <XAxis
                  dataKey="semanas"
                  type="number"
                  domain={recorte.dominio}
                  ticks={ticksX}
                  interval={0}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: cores.secundaria }}
                  stroke={cores.primaria}
                  label={{
                    value: "Idade pós-menstrual (semanas exatas)",
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
                  tickFormatter={(v: number) => v.toFixed(decimaisY).replace(".", ",")}
                  stroke={cores.primaria}
                  width={44}
                  label={{
                    value: infoMedida.eixo,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fontWeight: "bold", fill: cores.secundaria },
                  }}
                />
{!estreita && (
                <YAxis
                  yAxisId="direita"
                  orientation="right"
                  type="number"
                  domain={dominioY}
                  ticks={ticksY}
                  interval={0}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: cores.secundaria }}
                  tickFormatter={(v: number) => v.toFixed(decimaisY).replace(".", ",")}
                  stroke={cores.primaria}
                  width={44}
                />
                )}

                {recorte.dominio[0] < 40 && recorte.dominio[1] > 40 && (
                  <ReferenceLine
                    yAxisId="y"
                    x={40}
                    stroke="#9CA3AF"
                    strokeDasharray="4 3"
                    label={{ value: "termo (40 s)", position: "top", fontSize: 10, fill: "#6B7280" }}
                  />
                )}

                <Line yAxisId="y" type="monotone" dataKey="zN3" stroke={CORES_LINHAS.zN3} strokeWidth={1.4} dot={false} activeDot={false} isAnimationActive={false} name="-3" />
                <Line yAxisId="y" type="monotone" dataKey="zN2" stroke={CORES_LINHAS.zN2} strokeWidth={1.4} dot={false} activeDot={false} isAnimationActive={false} name="-2" />
                <Line yAxisId="y" type="monotone" dataKey="zN1" stroke={CORES_LINHAS.zN1} strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} name="-1" />
                <Line yAxisId="y" type="monotone" dataKey="z0" stroke={CORES_LINHAS.z0} strokeWidth={1.8} dot={false} activeDot={false} isAnimationActive={false} name="0" />
                <Line yAxisId="y" type="monotone" dataKey="zP1" stroke={CORES_LINHAS.zP1} strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} name="+1" />
                <Line yAxisId="y" type="monotone" dataKey="zP2" stroke={CORES_LINHAS.zP2} strokeWidth={1.4} dot={false} activeDot={false} isAnimationActive={false} name="+2" />
                <Line yAxisId="y" type="monotone" dataKey="zP3" stroke={CORES_LINHAS.zP3} strokeWidth={1.4} dot={false} activeDot={false} isAnimationActive={false} name="+3" />

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
                    shape={(props: { cx?: number; cy?: number }) => (
                      <circle cx={props.cx} cy={props.cy} r={5} fill={cores.primaria} stroke={cores.secundaria} strokeWidth={2} />
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
                    const classificacao = ponto ? classificarZ(medida, ponto.z) : null;
                    const abaixoP10 = ponto && medida === "peso" && ponto.z != null && ponto.z <= LIMIAR_P10;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-xs">
                        {ponto ? (
                          <>
                            <p className="font-semibold text-gray-900">
                              {new Date(ponto.data).toLocaleDateString("pt-BR")} · {formatarSemanasPosMenstruais(ponto.semanas)}
                              <span className="text-gray-500 font-normal"> (pós-menstrual)</span>
                            </p>
                            <p className="mt-1" style={{ color: cores.secundaria }}>
                              {infoMedida.curto}: <strong>{formatarValor(ponto.valor, medida)} {infoMedida.unidade}</strong>
                            </p>
                            {ponto.z != null && (
                              <p className="mt-1 text-gray-800">
                                Z-score: <strong>{formatarZ(ponto.z)}</strong>
                                <span className="text-gray-500"> · {formatarPercentil(percentilDeZ(ponto.z))}</span>
                                {classificacao && <span className={`ml-2 font-semibold ${classificacao.cor}`}>{classificacao.rotulo}</span>}
                              </p>
                            )}
                            {abaixoP10 && (
                              <p className="mt-1 font-semibold text-red-600">Abaixo do P10 — restrição de crescimento extrauterino</p>
                            )}
                          </>
                        ) : (
                          ref && (
                            <>
                              <p className="font-semibold text-gray-900">{ref.semanas} semanas</p>
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
        <Legenda cor={CORES_LINHAS.zP1} texto="±1" />
        <Legenda cor={CORES_LINHAS.z0} texto="mediana (0)" />
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: cores.primaria }} /> atendimento
        </span>
        {pontosForaDoRecorte > 0 && (
          <span className="ml-auto text-gray-500">
            {pontosForaDoRecorte} atendimento{pontosForaDoRecorte > 1 ? "s" : ""} fora deste recorte
          </span>
        )}
        {pontosPlotados.length === 0 && (
          <span className="ml-auto text-gray-500">
            Sem atendimentos com {infoMedida.curto.toLowerCase()} entre 27 e 64 semanas para plotar.
          </span>
        )}
      </div>
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-5" style={{ borderTop: `2px solid ${cor}` }} />
      {texto}
    </span>
  );
}

function formatarValor(valor: number, medida: MedidaIntergrowth): string {
  return valor.toFixed(medida === "peso" ? 3 : 1).replace(".", ",");
}

// Começa no menor recorte que contém todos os atendimentos
function recorteSugerido(pontos: PontoPacienteIntergrowth[]): RecorteIntergrowth {
  if (pontos.length === 0) return "27-64";
  const minimo = Math.min(...pontos.map((p) => p.semanas));
  const maximo = Math.max(...pontos.map((p) => p.semanas));
  const cabe = RECORTES.find((r) => r.id !== "27-64" && minimo >= r.dominio[0] && maximo <= r.dominio[1]);
  return cabe?.id ?? "27-64";
}

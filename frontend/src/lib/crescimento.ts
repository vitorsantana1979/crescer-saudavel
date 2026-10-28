// Regra de seleção da referência de crescimento e utilitários de idade.
// Espelha backend/CrescerSaudavel.Api/Services/Crescimento (ReferenciaCrescimentoService):
// a termo → OMS pela idade cronológica; pré-termo até 64 semanas pós-menstruais → INTERGROWTH-21st;
// depois OMS pela idade corrigida até o limite, em seguida idade cronológica.

export const DIAS_POR_MES = 30.4375; // convenção da OMS para rotular dias em meses
export const DIAS_GESTACAO_TERMO = 280;
export const SEMANAS_TERMO = 37;
export const INTERGROWTH_SEMANA_MIN = 27;
export const INTERGROWTH_SEMANA_MAX = 64;
export const OMS_DIA_MAXIMO = 1856;
// Mesmo valor de Crescimento:LimiteIdadeCorrigidaMeses no appsettings do backend
export const LIMITE_IDADE_CORRIGIDA_MESES = 24;

export type Referencia = "OMS" | "INTERGROWTH";
export type TipoIdade = "Cronologica" | "PosMenstrual" | "Corrigida";

export interface DadosNascimento {
  dataNascimento: string;
  idadeGestacionalSemanas: number;
  idadeGestacionalDias?: number | null;
}

export interface SelecaoReferencia {
  referencia: Referencia | null;
  idadeDias: number;
  tipoIdade: TipoIdade;
  idadeCronologicaDias: number;
  idadePosMenstrualDias?: number;
  idadeCorrigidaDias?: number;
  motivo?: string;
}

const MS_POR_DIA = 86_400_000;

function diaUtc(data: string | Date): number {
  const d = new Date(data);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Dias completos entre duas datas, ignorando a hora. */
export function diasEntre(inicio: string | Date, fim: string | Date): number {
  return Math.round((diaUtc(fim) - diaUtc(inicio)) / MS_POR_DIA);
}

export function idadeGestacionalEmDias(semanas: number, dias?: number | null): number {
  const inteiras = Math.floor(semanas);
  const resto = dias ?? Math.round((semanas - inteiras) * 7);
  return inteiras * 7 + Math.min(6, Math.max(0, resto));
}

export function selecionarReferencia(crianca: DadosNascimento, dataConsulta: string | Date): SelecaoReferencia {
  const idadeCronologica = diasEntre(crianca.dataNascimento, dataConsulta);
  if (idadeCronologica < 0) {
    return {
      referencia: null,
      idadeDias: idadeCronologica,
      tipoIdade: "Cronologica",
      idadeCronologicaDias: idadeCronologica,
      motivo: "Data da consulta anterior ao nascimento",
    };
  }

  if (crianca.idadeGestacionalSemanas >= SEMANAS_TERMO) {
    return selecionarOms(idadeCronologica, "Cronologica", idadeCronologica);
  }

  const idadePosMenstrual =
    idadeGestacionalEmDias(crianca.idadeGestacionalSemanas, crianca.idadeGestacionalDias) + idadeCronologica;

  if (idadePosMenstrual < INTERGROWTH_SEMANA_MIN * 7) {
    return {
      referencia: null,
      idadeDias: idadePosMenstrual,
      tipoIdade: "PosMenstrual",
      idadeCronologicaDias: idadeCronologica,
      idadePosMenstrualDias: idadePosMenstrual,
      motivo: `Idade pós-menstrual abaixo de ${INTERGROWTH_SEMANA_MIN} semanas`,
    };
  }

  if (idadePosMenstrual <= INTERGROWTH_SEMANA_MAX * 7) {
    return {
      referencia: "INTERGROWTH",
      idadeDias: idadePosMenstrual,
      tipoIdade: "PosMenstrual",
      idadeCronologicaDias: idadeCronologica,
      idadePosMenstrualDias: idadePosMenstrual,
    };
  }

  const idadeCorrigida = idadePosMenstrual - DIAS_GESTACAO_TERMO;
  const limiteCorrecao = Math.ceil(LIMITE_IDADE_CORRIGIDA_MESES * DIAS_POR_MES);
  if (idadeCorrigida <= limiteCorrecao) {
    return selecionarOms(idadeCorrigida, "Corrigida", idadeCronologica, idadePosMenstrual, idadeCorrigida);
  }

  return selecionarOms(idadeCronologica, "Cronologica", idadeCronologica, idadePosMenstrual, idadeCorrigida);
}

function selecionarOms(
  idadeDias: number,
  tipoIdade: TipoIdade,
  idadeCronologicaDias: number,
  idadePosMenstrualDias?: number,
  idadeCorrigidaDias?: number
): SelecaoReferencia {
  const base = { idadeDias, tipoIdade, idadeCronologicaDias, idadePosMenstrualDias, idadeCorrigidaDias };
  if (idadeDias > OMS_DIA_MAXIMO) {
    return { ...base, referencia: null, motivo: "Idade acima de 5 anos: fora da faixa das curvas OMS" };
  }
  return { ...base, referencia: "OMS" };
}

export interface ConsultaComRastreabilidade {
  dataHora: string;
  referenciaCurva?: string | null;
  idadeCalculoDias?: number | null;
  tipoIdadeCalculo?: string | null;
}

export interface IdadeConsulta {
  referencia: Referencia | null;
  idadeDias: number;
  tipoIdade: TipoIdade;
}

/**
 * Usa a rastreabilidade gravada pelo backend quando existe; para consultas anteriores ao
 * reprocessamento, aplica a regra localmente.
 */
export function resolverIdadeConsulta(consulta: ConsultaComRastreabilidade, crianca: DadosNascimento): IdadeConsulta {
  if (consulta.idadeCalculoDias != null && consulta.tipoIdadeCalculo) {
    const referencia =
      consulta.referenciaCurva === "OMS" || consulta.referenciaCurva === "INTERGROWTH" ? consulta.referenciaCurva : null;
    return { referencia, idadeDias: consulta.idadeCalculoDias, tipoIdade: consulta.tipoIdadeCalculo as TipoIdade };
  }

  const selecao = selecionarReferencia(crianca, consulta.dataHora);
  return { referencia: selecao.referencia, idadeDias: selecao.idadeDias, tipoIdade: selecao.tipoIdade };
}

/** "3 sem 2 d" até 13 semanas, "7 m 10 d" até 2 anos, depois "3 a 4 m". */
export function formatarIdadeDias(dias: number): string {
  if (!Number.isFinite(dias) || dias < 0) return "—";
  if (dias <= 13 * 7) {
    const semanas = Math.floor(dias / 7);
    const resto = dias % 7;
    return resto ? `${semanas} sem ${resto} d` : `${semanas} sem`;
  }
  if (dias < 24 * DIAS_POR_MES) {
    const meses = Math.floor(dias / DIAS_POR_MES);
    const resto = Math.floor(dias - meses * DIAS_POR_MES);
    return resto ? `${meses} m ${resto} d` : `${meses} m`;
  }
  const anos = Math.floor(dias / (12 * DIAS_POR_MES));
  const meses = Math.floor((dias - anos * 12 * DIAS_POR_MES) / DIAS_POR_MES);
  return meses ? `${anos} a ${meses} m` : `${anos} a`;
}

export function formatarTipoIdade(tipo: TipoIdade): string {
  switch (tipo) {
    case "Corrigida":
      return "idade corrigida";
    case "PosMenstrual":
      return "idade pós-menstrual";
    default:
      return "idade cronológica";
  }
}

export const Z_LINHAS = [-3, -2, -1, 0, 1, 2, 3] as const;

/**
 * Z aproximado por interpolação linear entre as linhas z = -3..+3 (valores em ordem crescente).
 * Usado só para exibição quando a consulta ainda não tem o z calculado pelo backend.
 */
export function interpolarZ(valor: number, valoresPorZ: number[]): number {
  const n = Z_LINHAS.length;
  if (valor <= valoresPorZ[0]) {
    return Z_LINHAS[0] + (valor - valoresPorZ[0]) / (valoresPorZ[1] - valoresPorZ[0]);
  }
  if (valor >= valoresPorZ[n - 1]) {
    return Z_LINHAS[n - 1] + (valor - valoresPorZ[n - 1]) / (valoresPorZ[n - 1] - valoresPorZ[n - 2]);
  }
  for (let i = 0; i < n - 1; i++) {
    if (valor <= valoresPorZ[i + 1]) {
      return Z_LINHAS[i] + (valor - valoresPorZ[i]) / (valoresPorZ[i + 1] - valoresPorZ[i]);
    }
  }
  return Z_LINHAS[n - 1];
}

export type IndicadorZ = "peso" | "estatura" | "perimetro";
export type NivelClassificacao = "Otimo" | "Atencao" | "Cuidado";

export interface ClassificacaoZ {
  codigo: string;
  indicador: IndicadorZ;
  nivel: NivelClassificacao;
  rotulo: string;
  faixa: string;
  cor: string; // classe de texto Tailwind
}

export const COR_TEXTO_NIVEL: Record<NivelClassificacao, string> = {
  Otimo: "text-green-700",
  Atencao: "text-amber-600",
  Cuidado: "text-red-600",
};

export const COR_BADGE_NIVEL: Record<NivelClassificacao, string> = {
  Otimo: "bg-green-100 text-green-800 border-green-300",
  Atencao: "bg-amber-100 text-amber-800 border-amber-300",
  Cuidado: "bg-red-100 text-red-800 border-red-300",
};

function classificacao(
  codigo: string,
  indicador: IndicadorZ,
  nivel: NivelClassificacao,
  rotulo: string,
  faixa: string
): ClassificacaoZ {
  return { codigo, indicador, nivel, rotulo, faixa, cor: COR_TEXTO_NIVEL[nivel] };
}

// Espelha ClassificacaoCrescimento.Tabela do backend: tabela "Como interpretar os gráficos"
// (Brasil 2008 / OMS 2006) para peso e estatura; perímetro cefálico pelo corte de ±2 DP (OMS/SBP).
export const CLASSIFICACOES_Z: ClassificacaoZ[] = [
  classificacao("PesoMuitoBaixo", "peso", "Cuidado", "Muito baixo peso para a idade", "z < −3"),
  classificacao("PesoBaixo", "peso", "Cuidado", "Baixo peso para a idade", "−3 ≤ z < −2"),
  classificacao("PesoVigilanciaBaixo", "peso", "Atencao", "Peso adequado — vigilância para baixo peso", "−2 ≤ z < −1"),
  classificacao("PesoAdequado", "peso", "Otimo", "Peso adequado para a idade", "−1 ≤ z ≤ +1"),
  classificacao("PesoVigilanciaElevado", "peso", "Atencao", "Peso adequado — vigilância para peso elevado", "+1 < z ≤ +2"),
  classificacao("PesoElevado", "peso", "Cuidado", "Peso elevado para a idade", "z > +2"),
  classificacao("EstaturaMuitoBaixa", "estatura", "Cuidado", "Muito baixa estatura para a idade", "z < −3"),
  classificacao("EstaturaBaixa", "estatura", "Cuidado", "Baixa estatura para a idade", "−3 ≤ z < −2"),
  classificacao("EstaturaAdequada", "estatura", "Otimo", "Estatura adequada para a idade", "z ≥ −2"),
  classificacao("PerimetroCefalicoAbaixo", "perimetro", "Cuidado", "Perímetro cefálico abaixo do esperado (microcefalia)", "z < −2"),
  classificacao("PerimetroCefalicoAdequado", "perimetro", "Otimo", "Perímetro cefálico adequado para a idade", "−2 ≤ z ≤ +2"),
  classificacao("PerimetroCefalicoAcima", "perimetro", "Cuidado", "Perímetro cefálico acima do esperado (macrocefalia)", "z > +2"),
];

const classificacoesPorCodigo = new Map(CLASSIFICACOES_Z.map((c) => [c.codigo, c]));

export function classificacaoPorCodigo(codigo: string | null | undefined): ClassificacaoZ | null {
  return (codigo && classificacoesPorCodigo.get(codigo)) || null;
}

export function classificarZ(indicador: IndicadorZ, z: number | null | undefined): ClassificacaoZ | null {
  if (z == null || !Number.isFinite(z)) return null;
  let codigo: string;
  if (indicador === "peso") {
    codigo =
      z < -3 ? "PesoMuitoBaixo"
      : z < -2 ? "PesoBaixo"
      : z < -1 ? "PesoVigilanciaBaixo"
      : z <= 1 ? "PesoAdequado"
      : z <= 2 ? "PesoVigilanciaElevado"
      : "PesoElevado";
  } else if (indicador === "estatura") {
    codigo = z < -3 ? "EstaturaMuitoBaixa" : z < -2 ? "EstaturaBaixa" : "EstaturaAdequada";
  } else {
    codigo = z < -2 ? "PerimetroCefalicoAbaixo" : z <= 2 ? "PerimetroCefalicoAdequado" : "PerimetroCefalicoAcima";
  }
  return classificacaoPorCodigo(codigo);
}

export function formatarZ(z: number | null | undefined): string {
  return z == null || !Number.isFinite(z) ? "—" : z.toFixed(2).replace(".", ",");
}

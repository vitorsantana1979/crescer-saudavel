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

export interface ClassificacaoZ {
  rotulo: string;
  cor: string; // classe de texto Tailwind
}

// Pontos de corte da tabela "Como interpretar os gráficos" (MS 2008 / OMS 2006)
export function classificarZ(z: number | null | undefined): ClassificacaoZ | null {
  if (z == null || !Number.isFinite(z)) return null;
  if (z < -3) return { rotulo: "Muito baixo", cor: "text-red-700" };
  if (z < -2) return { rotulo: "Baixo", cor: "text-red-600" };
  if (z < -1) return { rotulo: "Adequado — vigilância (baixo)", cor: "text-amber-600" };
  if (z <= 1) return { rotulo: "Adequado", cor: "text-green-700" };
  if (z <= 2) return { rotulo: "Adequado — vigilância (elevado)", cor: "text-amber-600" };
  if (z <= 3) return { rotulo: "Elevado", cor: "text-red-600" };
  return { rotulo: "Muito elevado", cor: "text-red-700" };
}

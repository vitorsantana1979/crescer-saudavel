// Interpretação de planilhas de atendimentos para importação em lote: CSV (vírgula ou ponto e vírgula)
// ou texto copiado do Excel (tabulação). Aceita vírgula decimal e datas dd/mm/aaaa ou aaaa-mm-dd.

export interface LinhaPlanilha {
  linha: number; // número da linha no arquivo (cabeçalho = 1)
  dataHora: string; // ISO (UTC), como o formulário de consulta envia
  pesoKg: number;
  estaturaCm: number | null;
  perimetroCefalicoCm: number | null;
  posicaoMedida: "Deitado" | "EmPe" | null;
}

export interface ResultadoPlanilha {
  linhas: LinhaPlanilha[];
  erros: { linha: number; motivo: string }[];
  colunas: Partial<Record<Campo, string>>;
}

type Campo = "data" | "hora" | "pesoKg" | "pesoG" | "estatura" | "perimetro" | "posicao";

const SINONIMOS: Record<Campo, string[]> = {
  data: ["data", "dataconsulta", "datadaconsulta", "dataatendimento", "datadoatendimento", "date"],
  hora: ["hora", "horario", "time"],
  pesoKg: ["peso", "pesokg", "weight", "weightkg"],
  pesoG: ["pesog", "pesogramas", "pesoemgramas", "weightg"],
  estatura: ["comprimento", "comprimentocm", "estatura", "estaturacm", "altura", "alturacm", "length", "lengthcm"],
  perimetro: ["pc", "pccm", "perimetrocefalico", "perimetrocefalicocm", "perimetro", "hc", "headcircumference"],
  posicao: ["posicao", "posicaodamedida", "position"],
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function separador(cabecalho: string): string {
  if (cabecalho.includes("\t")) return "\t";
  return (cabecalho.match(/;/g)?.length ?? 0) > (cabecalho.match(/,/g)?.length ?? 0) ? ";" : ",";
}

/** Divide uma linha respeitando aspas (RFC 4180). */
function dividir(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (aspas) {
      if (ch === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (ch === '"') aspas = false;
      else atual += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) {
      campos.push(atual);
      atual = "";
    } else atual += ch;
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

/** "3,25", "3.25", "1.234,5" → número; vazio → null. */
export function numero(texto: string | undefined): number | null {
  if (!texto) return null;
  let t = texto.replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** dd/mm/aaaa, dd/mm/aa ou aaaa-mm-dd, com hora opcional "hh:mm"; devolve [ano, mês, dia, hora, minuto]. */
export function dataHora(dataTexto: string, horaTexto?: string): [number, number, number, number, number] | null {
  const partes = dataTexto.trim().split(/[ T]+/);
  const d = partes[0];
  let ano: number, mes: number, dia: number;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(d);
  if (m) {
    dia = Number(m[1]);
    mes = Number(m[2]);
    ano = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
  } else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d))) {
    ano = Number(m[1]);
    mes = Number(m[2]);
    dia = Number(m[3]);
  } else return null;

  const hora = /^(\d{1,2}):(\d{2})/.exec((horaTexto || partes[1] || "12:00").trim());
  if (!hora) return null;
  const [h, min] = [Number(hora[1]), Number(hora[2])];
  const teste = new Date(ano, mes - 1, dia, h, min);
  if (teste.getFullYear() !== ano || teste.getMonth() !== mes - 1 || teste.getDate() !== dia || h > 23 || min > 59) return null;
  return [ano, mes, dia, h, min];
}

function posicao(texto: string | undefined): LinhaPlanilha["posicaoMedida"] | undefined {
  const t = normalizar(texto ?? "");
  if (!t) return null;
  if (["deitado", "deitada", "comprimento", "lying", "recumbent", "d"].includes(t)) return "Deitado";
  if (["empe", "estatura", "standing", "p", "e"].includes(t)) return "EmPe";
  return undefined; // inválida
}

export function interpretarPlanilha(conteudo: string): ResultadoPlanilha {
  const linhasTexto = conteudo.replace(/^﻿/, "").split(/\r?\n/);
  const inicio = linhasTexto.findIndex((l) => l.trim() !== "");
  if (inicio < 0) return { linhas: [], erros: [{ linha: 1, motivo: "Planilha vazia" }], colunas: {} };

  const sep = separador(linhasTexto[inicio]);
  const cabecalho = dividir(linhasTexto[inicio], sep);
  const indices: Partial<Record<Campo, number>> = {};
  const colunas: Partial<Record<Campo, string>> = {};
  cabecalho.forEach((titulo, i) => {
    const n = normalizar(titulo);
    for (const campo of Object.keys(SINONIMOS) as Campo[]) {
      if (indices[campo] === undefined && SINONIMOS[campo].includes(n)) {
        indices[campo] = i;
        colunas[campo] = titulo;
      }
    }
  });

  const erros: ResultadoPlanilha["erros"] = [];
  if (indices.data === undefined) erros.push({ linha: inicio + 1, motivo: "Coluna de data não encontrada (use \"data\")" });
  if (indices.pesoKg === undefined && indices.pesoG === undefined)
    erros.push({ linha: inicio + 1, motivo: "Coluna de peso não encontrada (use \"peso_kg\" ou \"peso_g\")" });
  if (erros.length) return { linhas: [], erros, colunas };

  const linhas: LinhaPlanilha[] = [];
  for (let i = inicio + 1; i < linhasTexto.length; i++) {
    if (linhasTexto[i].trim() === "") continue;
    const numeroLinha = i + 1;
    const c = dividir(linhasTexto[i], sep);
    const valor = (campo: Campo) => (indices[campo] !== undefined ? c[indices[campo]!] : undefined);

    const dh = dataHora(valor("data") ?? "", valor("hora"));
    if (!dh) {
      erros.push({ linha: numeroLinha, motivo: `Data inválida: "${valor("data") ?? ""}"` });
      continue;
    }
    const pesoKg = indices.pesoKg !== undefined ? numero(valor("pesoKg")) : (numero(valor("pesoG")) ?? NaN) / 1000;
    const estatura = numero(valor("estatura"));
    const perimetro = numero(valor("perimetro"));
    const pos = posicao(valor("posicao"));
    if (pesoKg == null || Number.isNaN(pesoKg)) {
      erros.push({ linha: numeroLinha, motivo: "Peso vazio ou inválido" });
      continue;
    }
    if (Number.isNaN(estatura) || Number.isNaN(perimetro)) {
      erros.push({ linha: numeroLinha, motivo: "Comprimento ou PC inválido" });
      continue;
    }
    if (pos === undefined) {
      erros.push({ linha: numeroLinha, motivo: `Posição inválida: "${valor("posicao")}" (use deitado ou em pé)` });
      continue;
    }
    const [ano, mes, dia, h, min] = dh;
    linhas.push({
      linha: numeroLinha,
      dataHora: new Date(ano, mes - 1, dia, h, min).toISOString(),
      pesoKg: Number(pesoKg.toFixed(3)),
      estaturaCm: estatura,
      perimetroCefalicoCm: perimetro,
      posicaoMedida: pos,
    });
  }
  return { linhas, erros, colunas };
}

export const MODELO_PLANILHA = "data;hora;peso_kg;comprimento_cm;pc_cm;posicao\n15/07/2026;09:30;2,150;44,5;31,2;deitado\n22/07/2026;10:00;2,320;45,3;31,8;deitado\n";

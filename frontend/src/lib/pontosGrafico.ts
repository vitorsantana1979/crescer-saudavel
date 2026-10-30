import type { PontoPacienteIntergrowth } from "@/components/GraficoIntergrowth";
import type { PontoPacienteOms } from "@/components/GraficoOms";
import type { PontoPesoEstatura } from "@/components/GraficoPesoEstatura";
import { ajustarEstaturaPelaPosicao, resolverIdadeConsulta, type DadosNascimento } from "@/lib/crescimento";

// Converte atendimentos em pontos dos gráficos, pela referência de cada atendimento (rastreabilidade
// gravada pelo backend ou, em consultas antigas, a regra local). Usado pela aba de gráficos e pelo relatório.

export interface AtendimentoGrafico {
  id: string;
  dataHora: string;
  pesoKg: number;
  estaturaCm: number;
  perimetroCefalicoCm: number;
  zScorePeso?: number | null;
  zScoreAltura?: number | null;
  zScorePerimetro?: number | null;
  imc?: number | null;
  zScoreImc?: number | null;
  zScorePesoEstatura?: number | null;
  posicaoMedida?: string | null;
  referenciaCurva?: string | null;
  idadeCalculoDias?: number | null;
  tipoIdadeCalculo?: string | null;
}

export function pontosOms(atendimentos: AtendimentoGrafico[], crianca: DadosNascimento): PontoPacienteOms[] {
  return atendimentos
    .map((a): PontoPacienteOms | null => {
      const idade = resolverIdadeConsulta(a, crianca);
      if (idade.referencia !== "OMS") return null;
      return {
        id: a.id,
        data: a.dataHora,
        dia: idade.idadeDias,
        tipoIdade: idade.tipoIdade,
        pesoKg: a.pesoKg,
        estaturaCm: a.estaturaCm,
        perimetroCefalicoCm: a.perimetroCefalicoCm,
        imc: a.imc,
        zScorePeso: a.zScorePeso,
        zScoreAltura: a.zScoreAltura,
        zScorePerimetro: a.zScorePerimetro,
        zScoreImc: a.zScoreImc,
      };
    })
    .filter((p): p is PontoPacienteOms => p !== null);
}

export function pontosIntergrowth(atendimentos: AtendimentoGrafico[], crianca: DadosNascimento): PontoPacienteIntergrowth[] {
  return atendimentos
    .map((a): PontoPacienteIntergrowth | null => {
      const idade = resolverIdadeConsulta(a, crianca);
      if (idade.referencia !== "INTERGROWTH") return null;
      return {
        id: a.id,
        data: a.dataHora,
        semanas: idade.idadeDias / 7,
        pesoKg: a.pesoKg,
        estaturaCm: a.estaturaCm,
        perimetroCefalicoCm: a.perimetroCefalicoCm,
        zScorePeso: a.zScorePeso,
        zScoreAltura: a.zScoreAltura,
        zScorePerimetro: a.zScorePerimetro,
      };
    })
    .filter((p): p is PontoPacienteIntergrowth => p !== null);
}

export function pontosPesoEstatura(atendimentos: AtendimentoGrafico[], crianca: DadosNascimento): PontoPesoEstatura[] {
  return atendimentos
    .map((a): PontoPesoEstatura | null => {
      const idade = resolverIdadeConsulta(a, crianca);
      if (idade.referencia !== "OMS" || !(a.estaturaCm > 0) || !(a.pesoKg > 0)) return null;
      return {
        id: a.id,
        data: a.dataHora,
        dia: idade.idadeDias,
        cm: ajustarEstaturaPelaPosicao(a.estaturaCm, idade.idadeDias, a.posicaoMedida),
        pesoKg: a.pesoKg,
        zScorePesoEstatura: a.zScorePesoEstatura,
      };
    })
    .filter((p): p is PontoPesoEstatura => p !== null);
}

import { useEffect, useState } from "react";
import { Baby } from "lucide-react";
import api from "@/lib/api";
import {
  ADEQUACAO_NASCIMENTO,
  COR_BADGE_NIVEL,
  formatarPercentil,
  formatarZ,
  type AvaliacaoMedidaNascimento,
  type AvaliacaoTamanhoNascimento,
  type DadosTamanhoNascimento,
} from "@/lib/crescimento";

// Adequação ao nascer pela INTERGROWTH-21st (PIG/AIG/GIG), calculada no backend a partir das medidas
// e da idade gestacional (GET /referencias/nascimento/avaliar).

function parametros(dados: DadosTamanhoNascimento): Record<string, string> | null {
  if (!dados.sexo || !(dados.igSemanas > 0)) return null;
  const p: Record<string, string> = { sexo: dados.sexo, igSemanas: String(dados.igSemanas) };
  if (dados.igDias != null && Number.isFinite(dados.igDias)) p.igDias = String(dados.igDias);
  if (dados.pesoGr && dados.pesoGr > 0) p.pesoGr = String(Math.round(dados.pesoGr));
  if (dados.comprimentoCm && dados.comprimentoCm > 0) p.comprimentoCm = String(dados.comprimentoCm);
  if (dados.perimetroCefalicoCm && dados.perimetroCefalicoCm > 0) p.perimetroCefalicoCm = String(dados.perimetroCefalicoCm);
  return p.pesoGr || p.comprimentoCm || p.perimetroCefalicoCm ? p : null;
}

export default function CardTamanhoNascimento({ dados, atrasoMs = 0 }: { dados: DadosTamanhoNascimento; atrasoMs?: number }) {
  const [avaliacao, setAvaliacao] = useState<AvaliacaoTamanhoNascimento | null>(null);
  const [erro, setErro] = useState(false);
  const chave = JSON.stringify(parametros(dados));

  useEffect(() => {
    const params = chave === "null" ? null : (JSON.parse(chave) as Record<string, string>);
    if (!params) {
      setAvaliacao(null);
      return;
    }
    let ativo = true;
    const timer = setTimeout(() => {
      api
        .get<AvaliacaoTamanhoNascimento>("/referencias/nascimento/avaliar", { params })
        .then((r) => {
          if (!ativo) return;
          setAvaliacao(r.data);
          setErro(false);
        })
        .catch(() => ativo && setErro(true));
    }, atrasoMs);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [chave, atrasoMs]);

  if (erro) {
    return <p className="text-xs text-red-600">Não foi possível avaliar o tamanho ao nascer.</p>;
  }
  if (!avaliacao) return null;

  if (!avaliacao.dentroDaFaixa) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Idade gestacional fora de 24+0 a 42+6 semanas: sem referência INTERGROWTH-21st de tamanho ao nascer.
      </div>
    );
  }

  const adequacao = avaliacao.peso ? ADEQUACAO_NASCIMENTO[avaliacao.peso.adequacao] : null;

  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start gap-3">
        <Baby className="h-6 w-6 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-[16rem]">
          <h4 className="font-semibold text-sm text-gray-900">Adequação ao nascer — INTERGROWTH-21st</h4>
          {adequacao && avaliacao.peso && (
            <p className="mt-2">
              <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-bold ${COR_BADGE_NIVEL[adequacao.nivel]}`}>
                {avaliacao.peso.adequacao}
                <span className="font-medium">{adequacao.rotulo}</span>
              </span>
              <span className="ml-2 text-xs text-gray-500">peso {adequacao.faixa}</span>
            </p>
          )}
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <Linha titulo="Peso" avaliacao={avaliacao.peso} />
            <Linha titulo="Comprimento" avaliacao={avaliacao.comprimento} alerta />
            <Linha titulo="Perímetro cefálico" avaliacao={avaliacao.perimetroCefalico} alerta />
          </dl>
          <p className="mt-3 text-xs text-gray-500">
            {avaliacao.padrao
              ? "Padrão internacional de tamanho ao nascer (33+0 a 42+6 semanas; Villar et al., Lancet 2014)."
              : "Referência para muito pré-termo (24+0 a 32+6 semanas; Villar et al., Lancet 2016)."}{" "}
            Serve para o nascimento; o crescimento pós-natal segue as curvas pós-natais. © University of Oxford.
          </p>
        </div>
      </div>
    </div>
  );
}

function Linha({ titulo, avaliacao, alerta }: { titulo: string; avaliacao: AvaliacaoMedidaNascimento | null; alerta?: boolean }) {
  const foraDe2 = alerta && avaliacao && Math.abs(avaliacao.z) > 2;
  return (
    <div className="rounded-md bg-gray-50 px-3 py-2">
      <dt className="text-xs text-gray-500">{titulo}</dt>
      <dd className={`font-semibold ${foraDe2 ? "text-red-600" : "text-gray-900"}`}>
        {avaliacao ? (
          <>
            z {formatarZ(avaliacao.z)} · {formatarPercentil(avaliacao.percentil)}
            {foraDe2 && <span className="block text-xs font-medium">fora de ±2 DP</span>}
          </>
        ) : (
          <span className="text-gray-400 font-normal">não informado</span>
        )}
      </dd>
    </div>
  );
}

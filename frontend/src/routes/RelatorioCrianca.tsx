import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, FileSpreadsheet, Printer } from "lucide-react";
import api from "@/lib/api";
import { baixarArquivo } from "@/lib/download";
import CardTamanhoNascimento from "@/components/CardTamanhoNascimento";
import CardGanhoEsperado from "@/components/CardGanhoEsperado";
import GraficoIntergrowth from "@/components/GraficoIntergrowth";
import GraficoOms from "@/components/GraficoOms";
import GraficoPesoEstatura from "@/components/GraficoPesoEstatura";
import {
  COR_BADGE_NIVEL,
  LIMITE_IDADE_CORRIGIDA_MESES,
  METODOS_IG,
  classificacaoPorCodigo,
  classificarZ,
  formatarIdadeDias,
  formatarPercentil,
  formatarSemanasDias,
  formatarTipoIdade,
  formatarZ,
  idadesNaData,
  percentilDeZ,
  resolverIdadeConsulta,
  rotuloCurto,
  type IndicadorZ,
  type TipoIdade,
} from "@/lib/crescimento";
import { classificarIdadeGestacional, classificarPesoNascimento } from "@/lib/classificacoes";
import { pontosIntergrowth, pontosOms, pontosPesoEstatura, type AtendimentoGrafico } from "@/lib/pontosGrafico";

// Relatório de acompanhamento para imprimir ou salvar em PDF pelo navegador (A4), no modelo da
// Parte II da Caderneta da Criança: identificação e nascimento, idades, gráficos, atendimentos e dieta.

interface Crianca {
  id: string;
  nome: string;
  sexo: string;
  dataNascimento: string;
  horaNascimento?: string | null;
  idadeGestacionalSemanas: number;
  idadeGestacionalDias?: number | null;
  metodoIG?: string | null;
  dataUltimaMenstruacao?: string | null;
  dataProvavelParto?: string | null;
  tipoParto?: string | null;
  apgar1Minuto?: number | null;
  apgar5Minuto?: number | null;
  pesoNascimentoGr?: number | null;
  comprimentoCm?: number | null;
  perimetroCefalicoCm?: number | null;
}

interface Atendimento extends AtendimentoGrafico {
  classificacaoPeso?: string | null;
  classificacaoEstatura?: string | null;
  classificacaoPerimetro?: string | null;
  classificacaoImc?: string | null;
  velocidadeGanhoPonderal?: number | null;
  alertaRCEU?: boolean;
  alertaQuedaPonderal?: boolean;
}

interface Dieta {
  id: string;
  dataInicio: string;
  dataFim?: string | null;
  frequenciaHoras: number;
  taxaEnergeticaKcalKg?: number | null;
  metaProteinaGKg?: number | null;
  viaAdministracao?: string | null;
  observacoes?: string | null;
  itens?: { id: string; quantidade: number; alimento?: { nome: string; unidade?: string } }[];
}

function data(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

function dietaVigente(dietas: Dieta[]): Dieta | null {
  const hoje = new Date();
  const ativas = dietas.filter((d) => new Date(d.dataInicio) <= hoje && (!d.dataFim || new Date(d.dataFim) >= hoje));
  const lista = ativas.length ? ativas : dietas;
  return lista.length ? [...lista].sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())[0] : null;
}

function CelulaZ({ indicador, z, codigo }: { indicador: IndicadorZ; z?: number | null; codigo?: string | null }) {
  if (z == null) return <span className="text-gray-400">—</span>;
  const c = classificacaoPorCodigo(codigo) ?? classificarZ(indicador, z);
  return (
    <span className="whitespace-nowrap">
      {formatarZ(z)} <span className="text-gray-500">{formatarPercentil(percentilDeZ(z))}</span>
      {c && (
        <span className={`ml-1 rounded border px-1 text-[9px] ${COR_BADGE_NIVEL[c.nivel]}`} title={c.rotulo}>
          {rotuloCurto(c.codigo)}
        </span>
      )}
    </span>
  );
}

function Secao({ titulo, children, quebra }: { titulo: string; children: React.ReactNode; quebra?: boolean }) {
  return (
    <section className={`mt-6 ${quebra ? "break-before-page" : ""}`}>
      <h2 className="mb-2 border-b-2 border-pink-500 pb-1 text-base font-bold text-[#003366]">{titulo}</h2>
      {children}
    </section>
  );
}

export default function RelatorioCrianca() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [crianca, setCrianca] = useState<Crianca | null>(null);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get<Crianca>(`/recemnascido/${id}`),
      api.get<Atendimento[]>(`/consultas/crianca/${id}`),
      api.get<Dieta[]>(`/dietas/crianca/${id}`).catch(() => ({ data: [] as Dieta[] })),
    ])
      .then(([c, a, d]) => {
        if (!ativo) return;
        setCrianca(c.data);
        setAtendimentos([...a.data].sort((x, y) => new Date(x.dataHora).getTime() - new Date(y.dataHora).getTime()));
        setDietas(d.data);
      })
      .catch(() => ativo && setErro("Não foi possível carregar os dados da criança."));
    return () => {
      ativo = false;
    };
  }, [id]);

  const nascimento = useMemo(
    () =>
      crianca
        ? {
            dataNascimento: crianca.dataNascimento,
            idadeGestacionalSemanas: Number(crianca.idadeGestacionalSemanas),
            idadeGestacionalDias: crianca.idadeGestacionalDias,
          }
        : null,
    [crianca]
  );
  const pontosIg = useMemo(() => (nascimento ? pontosIntergrowth(atendimentos, nascimento) : []), [atendimentos, nascimento]);
  const pontosOmsLista = useMemo(() => (nascimento ? pontosOms(atendimentos, nascimento) : []), [atendimentos, nascimento]);
  const pontosPe = useMemo(() => (nascimento ? pontosPesoEstatura(atendimentos, nascimento) : []), [atendimentos, nascimento]);

  if (erro) return <div className="p-8 text-red-600">{erro}</div>;
  if (!crianca || !nascimento) return <div className="p-8 text-gray-500">Carregando relatório...</div>;

  const sexo = crianca.sexo === "F" ? "F" : "M";
  const idades = idadesNaData(nascimento);
  const ultimo = atendimentos.length ? atendimentos[atendimentos.length - 1] : null;
  const dieta = dietaVigente(dietas);
  const classIg = classificarIdadeGestacional(Number(crianca.idadeGestacionalSemanas));
  const classPn = crianca.pesoNascimentoGr ? classificarPesoNascimento(crianca.pesoNascimentoGr) : null;
  const igNascimento = formatarSemanasDias(
    Math.floor(Number(crianca.idadeGestacionalSemanas)) * 7 + (crianca.idadeGestacionalDias ?? 0)
  );
  const temOms = pontosOmsLista.length > 0 || !idades.pretermo;

  const baixarPlanilha = async () => {
    try {
      await baixarArquivo("/exportar/pesquisa", { formato: "xlsx", criancaId: crianca.id }, `crescer_saudavel_${crianca.nome}.xlsx`);
    } catch {
      toast.error("Não foi possível gerar a planilha.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[190mm] flex-wrap gap-2 px-4 print:hidden">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          <Printer className="h-4 w-4" /> Imprimir ou salvar em PDF
        </button>
        <button onClick={baixarPlanilha} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50">
          <FileSpreadsheet className="h-4 w-4" /> Planilha (XLSX)
        </button>
      </div>

      <article className="relatorio mx-auto max-w-[190mm] bg-white px-8 py-6 text-[11px] leading-snug text-gray-800 shadow print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-start justify-between border-b border-gray-200 pb-3">
          <div>
            <h1 className="text-xl font-bold text-[#003366]">Relatório de acompanhamento do crescimento</h1>
            <p className="text-sm text-gray-600">
              {crianca.nome} · {sexo === "F" ? "feminino" : "masculino"} · emitido em {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
          <img src="/logo_crescer_saudavel_completa_800.png" alt="Crescer Saudável" className="h-12" />
        </header>

        <Secao titulo="Nascimento">
          <dl className="grid grid-cols-3 gap-x-6 gap-y-1">
            <div>
              <dt className="text-gray-500">Data e hora</dt>
              <dd className="font-semibold">
                {data(crianca.dataNascimento)}
                {crianca.horaNascimento ? ` às ${String(crianca.horaNascimento).slice(0, 5)}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Idade gestacional</dt>
              <dd className="font-semibold">
                {igNascimento} · {classIg.sigla}
                {crianca.metodoIG && <span className="font-normal text-gray-500"> (por {METODOS_IG[crianca.metodoIG] ?? crianca.metodoIG})</span>}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">DUM / DPP</dt>
              <dd className="font-semibold">
                {data(crianca.dataUltimaMenstruacao)} / {data(crianca.dataProvavelParto)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Parto · Apgar</dt>
              <dd className="font-semibold">
                {crianca.tipoParto || "—"} · {crianca.apgar1Minuto ?? "—"}/{crianca.apgar5Minuto ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Peso · comprimento · PC</dt>
              <dd className="font-semibold">
                {crianca.pesoNascimentoGr ? `${crianca.pesoNascimentoGr.toLocaleString("pt-BR")} g` : "—"} ·{" "}
                {crianca.comprimentoCm ? `${String(crianca.comprimentoCm).replace(".", ",")} cm` : "—"} ·{" "}
                {crianca.perimetroCefalicoCm ? `${String(crianca.perimetroCefalicoCm).replace(".", ",")} cm` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Peso ao nascer (faixa)</dt>
              <dd className="font-semibold">{classPn?.nome ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-3 break-inside-avoid">
            <CardTamanhoNascimento
              dados={{
                sexo: crianca.sexo,
                igSemanas: Number(crianca.idadeGestacionalSemanas),
                igDias: crianca.idadeGestacionalDias ?? null,
                pesoGr: crianca.pesoNascimentoGr ?? null,
                comprimentoCm: crianca.comprimentoCm ?? null,
                perimetroCefalicoCm: crianca.perimetroCefalicoCm ?? null,
              }}
            />
          </div>
        </Secao>

        <Secao titulo="Idades na data do relatório">
          <p>
            Cronológica: <strong>{formatarIdadeDias(idades.cronologicaDias)}</strong> ({idades.diaDeVida}º dia de vida)
            {idades.pretermo && (
              <>
                {" "}
                · pós-menstrual: <strong>{formatarSemanasDias(idades.posMenstrualDias)}</strong> · corrigida:{" "}
                <strong>
                  {idades.corrigidaDias != null
                    ? formatarIdadeDias(idades.corrigidaDias)
                    : idades.correcaoEncerrada
                    ? `encerrada aos ${LIMITE_IDADE_CORRIGIDA_MESES} meses`
                    : "antes do termo"}
                </strong>
              </>
            )}
          </p>
          {ultimo && (
            <div className="mt-3 break-inside-avoid">
              <CardGanhoEsperado consultaId={ultimo.id} dataConsulta={ultimo.dataHora} />
            </div>
          )}
        </Secao>

        {idades.pretermo && (
          <Secao titulo="Curvas INTERGROWTH-21st (pré-termo, 27–64 semanas pós-menstruais)" quebra>
            <div className="space-y-4">
              {(["peso", "estatura", "perimetro"] as const).map((m) => (
                <div key={m} className="break-inside-avoid">
                  <GraficoIntergrowth sexo={sexo} pontos={pontosIg} medidaInicial={m} altura={250} />
                </div>
              ))}
            </div>
          </Secao>
        )}

        {temOms && (
          <Secao titulo={`Curvas OMS${idades.pretermo ? " (após 64 semanas, idade corrigida)" : ""}`} quebra>
            <div className="space-y-4">
              {(["peso", "estatura", "perimetro", "imc"] as const).map((m) => (
                <div key={m} className="break-inside-avoid">
                  <GraficoOms sexo={sexo} pontos={pontosOmsLista} medidaInicial={m} altura={250} />
                </div>
              ))}
              <div className="break-inside-avoid">
                <GraficoPesoEstatura sexo={sexo} pontos={pontosPe} altura={250} />
              </div>
            </div>
          </Secao>
        )}

        <Secao titulo={`Atendimentos (${atendimentos.length})`} quebra>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#003366] text-white">
                <th className="px-1 py-1 text-left">Data</th>
                <th className="px-1 py-1 text-left">Idade</th>
                <th className="px-1 py-1 text-right">Peso</th>
                <th className="px-1 py-1 text-right">Compr.</th>
                <th className="px-1 py-1 text-right">PC</th>
                <th className="px-1 py-1 text-left">z peso</th>
                <th className="px-1 py-1 text-left">z compr.</th>
                <th className="px-1 py-1 text-left">z PC</th>
                <th className="px-1 py-1 text-left">z IMC</th>
                <th className="px-1 py-1 text-right">VGP</th>
                <th className="px-1 py-1 text-left">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {atendimentos.map((a) => {
                const idade = resolverIdadeConsulta(a, nascimento);
                return (
                  <tr key={a.id} className="break-inside-avoid border-b border-gray-200 align-top">
                    <td className="px-1 py-1 whitespace-nowrap">{data(a.dataHora)}</td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      {idade.tipoIdade === "PosMenstrual" ? formatarSemanasDias(idade.idadeDias) : formatarIdadeDias(idade.idadeDias)}
                      <span className="block text-[9px] text-gray-500" title={formatarTipoIdade(idade.tipoIdade as TipoIdade)}>
                        {idade.referencia === "INTERGROWTH" ? "IG-21st" : idade.referencia ?? "sem ref."} ·{" "}
                        {idade.tipoIdade === "PosMenstrual" ? "IPM" : idade.tipoIdade === "Corrigida" ? "IC" : "cron."}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-right">{a.pesoKg.toFixed(3).replace(".", ",")}</td>
                    <td className="px-1 py-1 text-right">{a.estaturaCm > 0 ? a.estaturaCm.toFixed(1).replace(".", ",") : "—"}</td>
                    <td className="px-1 py-1 text-right">{a.perimetroCefalicoCm > 0 ? a.perimetroCefalicoCm.toFixed(1).replace(".", ",") : "—"}</td>
                    <td className="px-1 py-1"><CelulaZ indicador="peso" z={a.zScorePeso} codigo={a.classificacaoPeso} /></td>
                    <td className="px-1 py-1"><CelulaZ indicador="estatura" z={a.zScoreAltura} codigo={a.classificacaoEstatura} /></td>
                    <td className="px-1 py-1"><CelulaZ indicador="perimetro" z={a.zScorePerimetro} codigo={a.classificacaoPerimetro} /></td>
                    <td className="px-1 py-1"><CelulaZ indicador="imc" z={a.zScoreImc} codigo={a.classificacaoImc} /></td>
                    <td className="px-1 py-1 text-right">{a.velocidadeGanhoPonderal != null ? a.velocidadeGanhoPonderal.toFixed(1).replace(".", ",") : "—"}</td>
                    <td className="px-1 py-1 font-semibold text-red-700">
                      {[a.alertaRCEU && "RCEU", a.alertaQuedaPonderal && "Queda ≥ 0,5 DP"].filter(Boolean).join(" · ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[9px] text-gray-500">
            z-score · percentil · classificação (tabela "Como interpretar os gráficos", MS/OMS). IG-21st = INTERGROWTH-21st;
            IPM = idade pós-menstrual; IC = idade corrigida; cron. = idade cronológica. VGP em g/kg/dia (Patel et al., 2005).
          </p>
        </Secao>

        {dieta && (
          <Secao titulo="Dietoterapia vigente">
            <p>
              Desde {data(dieta.dataInicio)}
              {dieta.viaAdministracao ? ` · via ${dieta.viaAdministracao}` : ""} · a cada {dieta.frequenciaHoras} h
              {dieta.taxaEnergeticaKcalKg ? ` · meta ${dieta.taxaEnergeticaKcalKg} kcal/kg/dia` : ""}
              {dieta.metaProteinaGKg ? ` · ${dieta.metaProteinaGKg} g/kg/dia de proteína` : ""}
            </p>
            {dieta.itens && dieta.itens.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {dieta.itens.map((item) => (
                  <li key={item.id}>
                    {item.alimento?.nome ?? "Alimento"}: {item.quantidade} {item.alimento?.unidade ?? "ml"}
                  </li>
                ))}
              </ul>
            )}
            {dieta.observacoes && <p className="mt-1 text-gray-600">{dieta.observacoes}</p>}
          </Secao>
        )}

        <footer className="mt-8 border-t border-gray-200 pt-2 text-[9px] text-gray-500">
          Referências: WHO Child Growth Standards (2006); INTERGROWTH-21st — Postnatal Growth Standards for Preterm
          Infants (Villar et al., Lancet Glob Health 2015) e International Newborn Size Standards/References (Villar et al.,
          Lancet 2014 e 2016), © University of Oxford; Ministério da Saúde — Caderneta da Criança, 6ª ed. (2024).
          Documento gerado pelo Crescer Saudável; não substitui a avaliação clínica.
        </footer>
      </article>
    </div>
  );
}

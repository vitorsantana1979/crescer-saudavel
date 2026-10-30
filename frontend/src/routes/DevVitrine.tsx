import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import CardTamanhoNascimento from "@/components/CardTamanhoNascimento";
import CardGanhoEsperado from "@/components/CardGanhoEsperado";
import GraficoIntergrowth, { type MedidaIntergrowth } from "@/components/GraficoIntergrowth";
import GraficoOms, { type MedidaOms } from "@/components/GraficoOms";
import GraficoPesoEstatura from "@/components/GraficoPesoEstatura";
import ImportarAtendimentos from "@/components/ImportarAtendimentos";
import { pontosIntergrowth, pontosOms, pontosPesoEstatura, type AtendimentoGrafico } from "@/lib/pontosGrafico";

// Só em `vite dev`: renderiza um componente por vez, com os dados de demonstração do mock, para
// capturas de tela (apresentação). Rota: /dev/vitrine?item=intergrowth-perimetro

interface CriancaDemo {
  id: string;
  sexo: string;
  dataNascimento: string;
  idadeGestacionalSemanas: number;
  idadeGestacionalDias?: number | null;
}

function useDemo(id: string) {
  const [crianca, setCrianca] = useState<CriancaDemo | null>(null);
  const [atendimentos, setAtendimentos] = useState<AtendimentoGrafico[]>([]);
  useEffect(() => {
    api.get<CriancaDemo>(`/recemnascido/${id}`).then((r) => setCrianca(r.data));
    api.get<AtendimentoGrafico[]>(`/consultas/crianca/${id}`).then((r) => setAtendimentos(r.data));
  }, [id]);
  return { crianca, atendimentos };
}

export default function DevVitrine() {
  const [params] = useSearchParams();
  const item = params.get("item") ?? "";
  const largura = Number(params.get("largura") ?? 960);
  const helena = useDemo("demo-helena");
  const miguel = useDemo("demo-miguel");

  const dadosHelena = helena.crianca && {
    dataNascimento: helena.crianca.dataNascimento,
    idadeGestacionalSemanas: helena.crianca.idadeGestacionalSemanas,
    idadeGestacionalDias: helena.crianca.idadeGestacionalDias,
  };
  const dadosMiguel = miguel.crianca && {
    dataNascimento: miguel.crianca.dataNascimento,
    idadeGestacionalSemanas: miguel.crianca.idadeGestacionalSemanas,
    idadeGestacionalDias: miguel.crianca.idadeGestacionalDias,
  };
  const ig = useMemo(() => (dadosHelena ? pontosIntergrowth(helena.atendimentos, dadosHelena) : []), [helena.atendimentos, dadosHelena]);
  const omsMiguel = useMemo(() => (dadosMiguel ? pontosOms(miguel.atendimentos, dadosMiguel) : []), [miguel.atendimentos, dadosMiguel]);
  const peMiguel = useMemo(() => (dadosMiguel ? pontosPesoEstatura(miguel.atendimentos, dadosMiguel) : []), [miguel.atendimentos, dadosMiguel]);

  const pronto = helena.crianca && miguel.crianca && helena.atendimentos.length && miguel.atendimentos.length;
  if (!pronto) return null;

  const ultimoHelena = helena.atendimentos[helena.atendimentos.length - 1];
  const [tipo, medida] = item.split("-");

  return (
    <div style={{ width: largura, padding: 16, background: "#fff" }} id="vitrine">
      {tipo === "intergrowth" && (
        <GraficoIntergrowth sexo="F" pontos={ig} medidaInicial={(medida || "peso") as MedidaIntergrowth} altura={420} />
      )}
      {tipo === "oms" && (
        <GraficoOms sexo="M" pontos={omsMiguel} medidaInicial={(medida || "peso") as MedidaOms} recorteInicial="0-5a" altura={420} />
      )}
      {item === "peso-estatura" && <GraficoPesoEstatura sexo="M" pontos={peMiguel} altura={420} />}
      {item === "nascimento-pig" && (
        <CardTamanhoNascimento dados={{ sexo: "F", igSemanas: 39, igDias: 2, pesoGr: 2540, comprimentoCm: 46.5, perimetroCefalicoCm: 32 }} />
      )}
      {item === "nascimento-muito-pretermo" && (
        <CardTamanhoNascimento dados={{ sexo: "F", igSemanas: 30, igDias: 2, pesoGr: 1180, comprimentoCm: 38.5, perimetroCefalicoCm: 27.6 }} />
      )}
      {item === "ganho-pretermo" && (
        <CardGanhoEsperado consultaId={helena.atendimentos[9].id} dataConsulta={helena.atendimentos[9].dataHora} />
      )}
      {item === "ganho" && <CardGanhoEsperado consultaId={ultimoHelena.id} dataConsulta={ultimoHelena.dataHora} />}
      {item === "importar" && (
        <div style={{ position: "relative", height: 760 }}>
          <ImportarAtendimentos
            criancaId="demo-helena"
            onFechar={() => undefined}
            onImportado={() => undefined}
            textoInicial={"Data\tPeso (g)\tComprimento\tPC\tPosição\n20/10/2026\t7420\t66,6\t42,9\tdeitado\n27/10/2026\t\t67\t43\tdeitado\n28/10/2026\t7510\t67,1\t43,0\tdeitado"}
          />
        </div>
      )}
    </div>
  );
}

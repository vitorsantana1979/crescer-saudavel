import { useState } from "react";
import GraficoOms, { type PontoPacienteOms } from "@/components/GraficoOms";
import GraficoIntergrowth, { type PontoPacienteIntergrowth } from "@/components/GraficoIntergrowth";
import CardTamanhoNascimento from "@/components/CardTamanhoNascimento";
import CardGanhoEsperado from "@/components/CardGanhoEsperado";
import GraficoPesoEstatura, { type PontoPesoEstatura } from "@/components/GraficoPesoEstatura";

// Página de desenvolvimento (só em `vite dev`): exercita GraficoOms e GraficoIntergrowth com pontos fictícios.
// Rota: /dev/grafico-oms

const NASCIMENTO = new Date(2025, 0, 1);

function ponto(dia: number, pesoKg: number, estaturaCm: number, perimetroCefalicoCm: number, tipoIdade: PontoPacienteOms["tipoIdade"] = "Cronologica"): PontoPacienteOms {
  return {
    id: `p${dia}`,
    data: new Date(NASCIMENTO.getTime() + dia * 86_400_000).toISOString(),
    dia,
    tipoIdade,
    pesoKg,
    estaturaCm,
    perimetroCefalicoCm,
    imc: Number((pesoKg / (estaturaCm / 100) ** 2).toFixed(2)),
  };
}

function pontoPe(p: PontoPacienteOms): PontoPesoEstatura {
  return { id: p.id, data: p.data, dia: p.dia, cm: p.estaturaCm ?? 0, pesoKg: p.pesoKg ?? 0 };
}

// Menina a termo acompanhada do nascimento aos 5 anos, oscilando em torno da mediana
const TERMO: PontoPacienteOms[] = [
  ponto(0, 3.2, 49.1, 33.9),
  ponto(3, 3.05, 49.4, 34.0),
  ponto(7, 3.3, 50.2, 34.4),
  ponto(14, 3.6, 51.5, 35.1),
  ponto(30, 4.0, 53.6, 36.5),
  ponto(61, 5.0, 57.0, 38.2),
  ponto(91, 5.6, 59.8, 39.4),
  ponto(183, 7.1, 65.7, 42.0),
  ponto(365, 8.7, 74.0, 44.8),
  ponto(548, 10.0, 80.5, 46.0),
  ponto(731, 11.3, 86.0, 47.1),
  ponto(1096, 13.5, 95.0, 48.4),
  ponto(1461, 15.6, 102.5, 49.2),
  ponto(1826, 17.5, 109.0, 49.8),
];

// Menino pré-termo após 64 semanas pós-menstruais: pontos em idade corrigida, depois cronológica
const PRETERMO: PontoPacienteOms[] = [
  ponto(169, 6.9, 64.0, 42.5, "Corrigida"),
  ponto(200, 7.4, 66.0, 43.2, "Corrigida"),
  ponto(260, 8.3, 69.5, 44.5, "Corrigida"),
  ponto(365, 9.1, 74.0, 45.9, "Corrigida"),
  ponto(548, 10.4, 80.0, 47.2, "Corrigida"),
  ponto(731, 11.8, 86.5, 48.2, "Corrigida"),
  ponto(820, 12.4, 88.0, 48.5, "Cronologica"),
];

// Menina nascida com 30 semanas, acompanhada até 64 semanas pós-menstruais (INTERGROWTH-21st).
// Peso cai abaixo do P10 por volta de 36 semanas (RCEU) e recupera; PC abaixo de −2 em 34 semanas.
function pontoIg(semanas: number, pesoKg: number, estaturaCm: number, perimetroCefalicoCm: number): PontoPacienteIntergrowth {
  return {
    id: `ig${semanas}`,
    data: new Date(NASCIMENTO.getTime() + (semanas - 30) * 7 * 86_400_000).toISOString(),
    semanas,
    pesoKg,
    estaturaCm,
    perimetroCefalicoCm,
  };
}

const INTERGROWTH: PontoPacienteIntergrowth[] = [
  pontoIg(30, 1.25, 39.0, 27.5),
  pontoIg(32, 1.45, 41.0, 28.3),
  pontoIg(34, 1.7, 42.8, 27.9),
  pontoIg(36, 1.95, 44.5, 30.6),
  pontoIg(38 + 3 / 7, 2.55, 47.0, 32.4),
  pontoIg(40, 2.95, 48.6, 33.6),
  pontoIg(44, 4.0, 52.5, 36.0),
  pontoIg(48, 5.0, 56.0, 38.0),
  pontoIg(52, 5.8, 59.0, 39.4),
  pontoIg(58, 6.8, 62.6, 41.0),
  pontoIg(64, 7.5, 65.5, 42.2),
];

export default function DevGraficoOms() {
  const [sexo, setSexo] = useState<"M" | "F">("F");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Dev — gráficos OMS e INTERGROWTH</h1>
        <button className="px-3 py-1 rounded border text-sm" onClick={() => setSexo(sexo === "F" ? "M" : "F")}>
          Sexo: {sexo}
        </button>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Ganho esperado para manter o canal (exemplo do mock)</h2>
        <CardGanhoEsperado consultaId="dev" dataConsulta={new Date(2025, 1, 12).toISOString()} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Tamanho ao nascer (INTERGROWTH-21st)</h2>
        <CardTamanhoNascimento dados={{ sexo: "F", igSemanas: 40, igDias: 0, pesoGr: 2700, comprimentoCm: 49, perimetroCefalicoCm: 33.8 }} />
        <CardTamanhoNascimento dados={{ sexo: "M", igSemanas: 26, igDias: 3, pesoGr: 1150, comprimentoCm: 36, perimetroCefalicoCm: 21.5 }} />
        <CardTamanhoNascimento dados={{ sexo: "M", igSemanas: 23, igDias: 4, pesoGr: 550 }} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Pré-termo, 27–64 semanas (INTERGROWTH-21st)</h2>
        <GraficoIntergrowth sexo={sexo} pontos={INTERGROWTH} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">A termo, 0–5 anos</h2>
        <GraficoOms sexo={sexo} pontos={TERMO} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Peso para comprimento/estatura (a termo)</h2>
        <GraficoPesoEstatura sexo={sexo} pontos={TERMO.map(pontoPe)} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Pré-termo após 64 semanas (idade corrigida)</h2>
        <GraficoOms sexo="M" pontos={PRETERMO} recorteInicial="0-2a" />
      </section>
    </div>
  );
}

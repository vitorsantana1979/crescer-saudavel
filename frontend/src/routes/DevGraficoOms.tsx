import { useState } from "react";
import GraficoOms, { type PontoPacienteOms } from "@/components/GraficoOms";

// Página de desenvolvimento (só em `vite dev`): exercita o GraficoOms com pontos fictícios.
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
  };
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

export default function DevGraficoOms() {
  const [sexo, setSexo] = useState<"M" | "F">("F");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Dev — GraficoOms</h1>
        <button className="px-3 py-1 rounded border text-sm" onClick={() => setSexo(sexo === "F" ? "M" : "F")}>
          Sexo: {sexo}
        </button>
      </div>

      <section>
        <h2 className="font-semibold mb-2">A termo, 0–5 anos</h2>
        <GraficoOms sexo={sexo} pontos={TERMO} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Pré-termo após 64 semanas (idade corrigida)</h2>
        <GraficoOms sexo="M" pontos={PRETERMO} recorteInicial="0-2a" />
      </section>
    </div>
  );
}

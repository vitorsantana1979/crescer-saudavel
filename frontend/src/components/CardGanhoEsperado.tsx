import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import api from "@/lib/api";
import { formatarPercentil, formatarZ, percentilDeZ } from "@/lib/crescimento";

// Quanto cada medida precisa variar para manter o mesmo z no próximo período
// (GET /consultas/{id}/ganho-esperado): 7 dias na INTERGROWTH-21st, 30 dias na OMS.

export interface GanhoEsperado {
  medida: "peso" | "estatura" | "perimetro";
  referencia: "OMS" | "INTERGROWTH";
  horizonteDias: number;
  z: number;
  valorAtual: number;
  valorEsperado: number;
  ganho: number;
  velocidadeGKgDia: number | null;
}

const ROTULOS: Record<GanhoEsperado["medida"], string> = {
  peso: "Peso",
  estatura: "Comprimento/estatura",
  perimetro: "Perímetro cefálico",
};

function formatarGanho(g: GanhoEsperado): string {
  if (g.medida === "peso") {
    const gramas = Math.round(g.ganho * 1000);
    return `${gramas >= 0 ? "+" : ""}${gramas.toLocaleString("pt-BR")} g`;
  }
  return `${g.ganho >= 0 ? "+" : ""}${g.ganho.toFixed(1).replace(".", ",")} cm`;
}

function formatarValor(g: GanhoEsperado, valor: number): string {
  return g.medida === "peso" ? `${valor.toFixed(3).replace(".", ",")} kg` : `${valor.toFixed(1).replace(".", ",")} cm`;
}

export default function CardGanhoEsperado({ consultaId, dataConsulta }: { consultaId: string; dataConsulta: string }) {
  const [ganhos, setGanhos] = useState<GanhoEsperado[] | null>(null);

  useEffect(() => {
    let ativo = true;
    setGanhos(null);
    api
      .get<GanhoEsperado[]>(`/consultas/${consultaId}/ganho-esperado`)
      .then((r) => ativo && setGanhos(r.data))
      .catch(() => ativo && setGanhos([]));
    return () => {
      ativo = false;
    };
  }, [consultaId]);

  if (!ganhos || ganhos.length === 0) return null;
  const { referencia, horizonteDias } = ganhos[0];

  return (
    <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <Target className="h-4 w-4" /> Para manter o canal atual nos próximos {horizonteDias} dias
        </h4>
        <span className="text-xs text-indigo-700">
          a partir do atendimento de {new Date(dataConsulta).toLocaleDateString("pt-BR")} ·{" "}
          {referencia === "INTERGROWTH" ? "INTERGROWTH-21st" : "OMS"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {ganhos.map((g) => (
          <div key={g.medida} className="rounded-md bg-white px-3 py-2 border border-indigo-100">
            <p className="text-xs text-gray-500">
              {ROTULOS[g.medida]} · z {formatarZ(g.z)} ({formatarPercentil(percentilDeZ(g.z))})
            </p>
            <p className="text-lg font-bold text-indigo-900">{formatarGanho(g)}</p>
            <p className="text-xs text-gray-600">
              {formatarValor(g, g.valorAtual)} → {formatarValor(g, g.valorEsperado)}
              {g.velocidadeGKgDia != null && (
                <> · ≈ {g.velocidadeGKgDia.toFixed(1).replace(".", ",")} g/kg/dia</>
              )}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Referência de canal (mesmo escore z), não meta nutricional. Compare com a VGP observada entre atendimentos.
      </p>
    </div>
  );
}

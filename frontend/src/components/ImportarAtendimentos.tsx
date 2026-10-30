import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileDown, Upload, X } from "lucide-react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errorHandler";
import { salvarBlob } from "@/lib/download";
import { MODELO_PLANILHA, interpretarPlanilha } from "@/lib/planilha";

// Importação em lote de atendimentos de uma criança: arquivo CSV/TSV ou colagem direta do Excel.
// O servidor valida cada linha, recusa duplicatas e reavalia todos os atendimentos na ordem.

interface Resultado {
  importadas: number;
  rejeitadas: { linha: number; motivo: string }[];
}

const ROTULOS_COLUNAS: Record<string, string> = {
  data: "data",
  hora: "hora",
  pesoKg: "peso (kg)",
  pesoG: "peso (g)",
  estatura: "comprimento/estatura",
  perimetro: "PC",
  posicao: "posição",
};

export default function ImportarAtendimentos({
  criancaId,
  onFechar,
  onImportado,
}: {
  criancaId: string;
  onFechar: () => void;
  onImportado: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const leitura = useMemo(() => (texto.trim() ? interpretarPlanilha(texto) : null), [texto]);

  const lerArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setResultado(null);
    setTexto(await arquivo.text());
  };

  const importar = async () => {
    if (!leitura?.linhas.length) return;
    setEnviando(true);
    try {
      const resposta = await api.post<Resultado>(`/consultas/crianca/${criancaId}/importar`, { linhas: leitura.linhas });
      setResultado(resposta.data);
      if (resposta.data.importadas > 0) {
        toast.success(`${resposta.data.importadas} atendimento(s) importado(s).`);
        onImportado();
      }
    } catch (erro) {
      toast.error(getErrorMessage(erro as Parameters<typeof getErrorMessage>[0]) || "Não foi possível importar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Importar atendimentos de planilha</h3>
          <button type="button" onClick={onFechar} className="text-gray-500 hover:text-gray-800" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4 text-sm">
          <p className="text-gray-600">
            Colunas reconhecidas: <strong>data</strong> (dd/mm/aaaa), hora, <strong>peso_kg</strong> ou peso_g,
            comprimento_cm, pc_cm e posicao (deitado/em pé). Aceita CSV, texto com tabulação copiado do Excel e
            vírgula decimal. Comprimento e PC podem ficar em branco.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50">
              <Upload className="h-4 w-4" /> Escolher arquivo (.csv, .tsv, .txt)
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => lerArquivo(e.target.files?.[0])} />
            </label>
            <button
              type="button"
              onClick={() => salvarBlob(new Blob([MODELO_PLANILHA], { type: "text/csv" }), "modelo_atendimentos.csv")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
            >
              <FileDown className="h-4 w-4" /> Baixar modelo
            </button>
          </div>
          <textarea
            value={texto}
            onChange={(e) => {
              setResultado(null);
              setTexto(e.target.value);
            }}
            rows={8}
            placeholder={"…ou cole aqui as linhas da planilha (com o cabeçalho)\n" + MODELO_PLANILHA}
            className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs"
          />

          {leitura && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p>
                <strong>{leitura.linhas.length}</strong> linha(s) prontas para importar
                {Object.keys(leitura.colunas).length > 0 && (
                  <span className="text-gray-500">
                    {" "}
                    · colunas:{" "}
                    {Object.entries(leitura.colunas)
                      .map(([campo, titulo]) => `${titulo} → ${ROTULOS_COLUNAS[campo]}`)
                      .join(", ")}
                  </span>
                )}
              </p>
              {leitura.erros.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-amber-800">
                  {leitura.erros.slice(0, 20).map((e) => (
                    <li key={`${e.linha}-${e.motivo}`}>
                      Linha {e.linha}: {e.motivo}
                    </li>
                  ))}
                  {leitura.erros.length > 20 && <li>… e mais {leitura.erros.length - 20}</li>}
                </ul>
              )}
            </div>
          )}

          {resultado && (
            <div className={`rounded-lg p-3 ${resultado.rejeitadas.length ? "bg-amber-50" : "bg-green-50"}`}>
              <p className="font-semibold">
                {resultado.importadas} importado(s) · {resultado.rejeitadas.length} recusado(s) pelo servidor
              </p>
              {resultado.rejeitadas.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-amber-800">
                  {resultado.rejeitadas.map((r) => (
                    <li key={r.linha}>
                      Linha {r.linha}: {r.motivo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onFechar} className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
            Fechar
          </button>
          <button
            type="button"
            onClick={importar}
            disabled={!leitura?.linhas.length || enviando || resultado != null}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {enviando ? "Importando..." : `Importar ${leitura?.linhas.length ?? 0} atendimento(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

import api from "@/lib/api";

/** Baixa um arquivo de um endpoint autenticado (o link direto não levaria o token). */
export async function baixarArquivo(url: string, params: Record<string, string>, nomePadrao: string): Promise<void> {
  const resposta = await api.get<Blob>(url, { params, responseType: "blob" });
  const disposicao = String(resposta.headers["content-disposition"] ?? "");
  const nome = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposicao)?.[1] ?? nomePadrao;
  salvarBlob(resposta.data, decodeURIComponent(nome));
}

export function salvarBlob(blob: Blob, nome: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

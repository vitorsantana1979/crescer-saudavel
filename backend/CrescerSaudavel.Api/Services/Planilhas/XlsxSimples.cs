using System.Globalization;
using System.IO.Compression;
using System.Security;
using System.Text;

namespace CrescerSaudavel.Api.Services.Planilhas;

/// <summary>
/// Gera um .xlsx de uma aba (SpreadsheetML mínimo: texto como inlineStr, números como valor numérico,
/// primeira linha em negrito e congelada). Evita dependência externa e o problema do CSV no Excel em
/// português (vírgula decimal e ponto e vírgula como separador).
/// </summary>
public static class XlsxSimples
{
    public static byte[] Gerar(string nomeAba, IReadOnlyList<string> cabecalho, IEnumerable<IReadOnlyList<object?>> linhas)
    {
        using var memoria = new MemoryStream();
        using (var zip = new ZipArchive(memoria, ZipArchiveMode.Create, leaveOpen: true))
        {
            Escrever(zip, "[Content_Types].xml",
                """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>""");
            Escrever(zip, "_rels/.rels",
                """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>""");
            Escrever(zip, "xl/workbook.xml",
                $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="{Xml(NomeAbaValido(nomeAba))}" sheetId="1" r:id="rId1"/></sheets></workbook>""");
            Escrever(zip, "xl/_rels/workbook.xml.rels",
                """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>""");
            // Estilo 0: padrão; 1: negrito (cabeçalho)
            Escrever(zip, "xl/styles.xml",
                """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>""");

            var folha = new StringBuilder();
            folha.Append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>""");
            AdicionarLinha(folha, 1, cabecalho.Cast<object?>().ToList(), estilo: 1);
            var numero = 2;
            foreach (var linha in linhas) AdicionarLinha(folha, numero++, linha, estilo: 0);
            folha.Append("</sheetData></worksheet>");
            Escrever(zip, "xl/worksheets/sheet1.xml", folha.ToString());
        }

        return memoria.ToArray();
    }

    private static void AdicionarLinha(StringBuilder folha, int numero, IReadOnlyList<object?> celulas, int estilo)
    {
        folha.Append($"<row r=\"{numero}\">");
        for (var c = 0; c < celulas.Count; c++)
        {
            var referencia = $"{Coluna(c)}{numero}";
            var estiloAttr = estilo > 0 ? $" s=\"{estilo}\"" : "";
            switch (celulas[c])
            {
                case null:
                    break;
                case decimal or double or float or int or long or short:
                    var valor = Convert.ToString(celulas[c], CultureInfo.InvariantCulture);
                    folha.Append($"<c r=\"{referencia}\"{estiloAttr}><v>{valor}</v></c>");
                    break;
                case bool b:
                    folha.Append($"<c r=\"{referencia}\" t=\"b\"{estiloAttr}><v>{(b ? 1 : 0)}</v></c>");
                    break;
                default:
                    var texto = Convert.ToString(celulas[c], CultureInfo.InvariantCulture) ?? "";
                    folha.Append($"<c r=\"{referencia}\" t=\"inlineStr\"{estiloAttr}><is><t xml:space=\"preserve\">{Xml(texto)}</t></is></c>");
                    break;
            }
        }
        folha.Append("</row>");
    }

    /// <summary>Índice 0 → A, 25 → Z, 26 → AA.</summary>
    public static string Coluna(int indice)
    {
        var nome = "";
        for (var n = indice + 1; n > 0; n = (n - 1) / 26) nome = (char)('A' + (n - 1) % 26) + nome;
        return nome;
    }

    private static string NomeAbaValido(string nome)
    {
        var limpo = new string(nome.Where(ch => !"[]:*?/\\".Contains(ch)).ToArray());
        return string.IsNullOrWhiteSpace(limpo) ? "Planilha" : limpo[..Math.Min(31, limpo.Length)];
    }

    // Remove caracteres de controle inválidos em XML e escapa o resto
    private static string Xml(string texto) =>
        SecurityElement.Escape(new string(texto.Where(ch => ch is '\t' or '\n' or '\r' || ch >= ' ').ToArray())) ?? "";

    private static void Escrever(ZipArchive zip, string caminho, string conteudo)
    {
        var entrada = zip.CreateEntry(caminho, CompressionLevel.Optimal);
        using var fluxo = new StreamWriter(entrada.Open(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        fluxo.Write(conteudo);
    }
}

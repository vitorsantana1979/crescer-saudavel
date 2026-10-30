using System.IO.Compression;
using CrescerSaudavel.Api.Controllers;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Crescimento;
using CrescerSaudavel.Api.Services.Planilhas;
using Xunit;

namespace CrescerSaudavel.Tests;

public class ImportacaoEExportacaoTests
{
    private static readonly DateTime Agora = new(2026, 10, 30, 12, 0, 0);
    private static readonly RecemNascido Crianca = new() { Id = Guid.NewGuid(), DataNascimento = new DateTime(2026, 6, 1), Sexo = 'F', IdadeGestacionalSemanas = 39 };

    private static LinhaImportacao Linha(int n, DateTime data, decimal peso = 4m, decimal? est = 55m, decimal? pc = 37m, string? pos = null) =>
        new(n, data, peso, est, pc, pos);

    [Fact]
    public void Planejar_aceita_linhas_validas_e_recusa_com_motivo()
    {
        var existentes = new[] { new DateTime(2026, 7, 1, 10, 0, 30) };
        var linhas = new[]
        {
            Linha(2, new DateTime(2026, 7, 1, 10, 0, 0)),             // duplica a existente no minuto
            Linha(3, new DateTime(2026, 7, 15, 9, 0, 0)),             // ok
            Linha(4, new DateTime(2026, 5, 30)),                      // antes do nascimento
            Linha(5, new DateTime(2026, 8, 1), peso: 4200m),          // gramas no lugar de kg
            Linha(6, new DateTime(2026, 8, 2), est: 5.5m),            // fora da faixa
            Linha(7, new DateTime(2026, 8, 3), est: null, pc: null),  // comprimento e PC podem faltar
            Linha(8, new DateTime(2026, 7, 15, 9, 0, 0)),             // duplica a linha 3
            Linha(9, new DateTime(2026, 8, 4), pos: "Sentado"),
            Linha(10, Agora.AddDays(3)),
        };

        var (aceitas, rejeitadas) = ImportacaoConsultas.Planejar(Crianca, existentes, linhas, Agora);

        Assert.Equal(2, aceitas.Count);
        Assert.All(aceitas, c => Assert.Equal(Crianca.Id, c.RecemNascidoId));
        Assert.Equal(0m, aceitas.Single(c => c.DataHora.Day == 3).EstaturaCm);
        Assert.Equal(new[] { 2, 4, 5, 6, 8, 9, 10 }, rejeitadas.Select(r => r.Linha));
        Assert.Contains("Já existe", rejeitadas.Single(r => r.Linha == 2).Motivo);
        Assert.Contains("kg", rejeitadas.Single(r => r.Linha == 5).Motivo);
    }

    [Fact]
    public void Validar_medidas_usa_as_faixas_do_formulario()
    {
        var data = new DateTime(2026, 7, 1);
        Assert.Null(ImportacaoConsultas.ValidarMedidas(Crianca, data, 0.3m, 20m, 15m, PosicaoMedida.Deitado, Agora));
        Assert.Null(ImportacaoConsultas.ValidarMedidas(Crianca, data, 35m, 130m, 60m, PosicaoMedida.EmPe, Agora));
        Assert.NotNull(ImportacaoConsultas.ValidarMedidas(Crianca, data, 0.29m, 50m, 35m, null, Agora));
        Assert.NotNull(ImportacaoConsultas.ValidarMedidas(Crianca, data, 4m, 50m, 61m, null, Agora));
    }

    [Theory]
    [InlineData(0, "A")]
    [InlineData(25, "Z")]
    [InlineData(26, "AA")]
    [InlineData(45, "AT")]
    [InlineData(701, "ZZ")]
    public void Coluna_da_planilha(int indice, string esperado)
    {
        Assert.Equal(esperado, XlsxSimples.Coluna(indice));
    }

    [Fact]
    public void Xlsx_tem_as_partes_obrigatorias_e_os_valores()
    {
        var bytes = XlsxSimples.Gerar("Atendimentos", ["Nome", "Peso", "RCEU"], [["Ana \"Bia\" & <cia>", 3.25m, true], [null, 4, false]]);

        using var zip = new ZipArchive(new MemoryStream(bytes));
        Assert.NotNull(zip.GetEntry("[Content_Types].xml"));
        Assert.NotNull(zip.GetEntry("xl/workbook.xml"));
        using var leitor = new StreamReader(zip.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var folha = leitor.ReadToEnd();
        Assert.Contains("<v>3.25</v>", folha);
        Assert.Contains("Ana &quot;Bia&quot; &amp; &lt;cia&gt;", folha);
        Assert.Contains("t=\"b\"", folha);
        Assert.Contains("<c r=\"B3\"><v>4</v></c>", folha);
    }

    [Theory]
    [InlineData("simples", "simples")]
    [InlineData("com, vírgula", "\"com, vírgula\"")]
    [InlineData("com \"aspas\"", "\"com \"\"aspas\"\"\"")]
    public void Celula_csv_escapa_texto(string valor, string esperado)
    {
        Assert.Equal(esperado, ExportController.CelulaCsv(valor));
    }

    [Fact]
    public void Celula_csv_usa_ponto_decimal_e_vazio_para_nulo()
    {
        Assert.Equal("3.25", ExportController.CelulaCsv(3.25m));
        Assert.Equal("", ExportController.CelulaCsv(null));
        Assert.Equal("True", ExportController.CelulaCsv(true));
    }
}

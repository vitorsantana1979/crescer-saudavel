using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Crescimento;

namespace CrescerSaudavel.Tests;

internal static class Referencias
{
    private static readonly Lazy<ZScoreService> _servico = new(() => new ZScoreService(Caminho()));
    private static readonly Lazy<TamanhoNascimentoService> _nascimento = new(() => new TamanhoNascimentoService(Caminho()));

    public static ZScoreService Servico => _servico.Value;
    public static TamanhoNascimentoService Nascimento => _nascimento.Value;

    // Sobe a partir do diretório de saída dos testes até achar backend/CrescerSaudavel.Api/Data/Referencias
    public static string Caminho()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidato = Path.Combine(dir.FullName, "CrescerSaudavel.Api", "Data", "Referencias");
            if (Directory.Exists(candidato)) return candidato;
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Diretório CrescerSaudavel.Api/Data/Referencias não encontrado");
    }
}

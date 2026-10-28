namespace CrescerSaudavel.Api.Services.Crescimento;

public class CrescimentoOptions
{
    public const string Secao = "Crescimento";

    /// <summary>
    /// Até esta idade corrigida (em meses) o pré-termo, após 64 semanas pós-menstruais, é avaliado na OMS
    /// pela idade corrigida; depois, pela idade cronológica.
    /// </summary>
    public int LimiteIdadeCorrigidaMeses { get; set; } = 24;
}

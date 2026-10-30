namespace CrescerSaudavel.Api.Services.Crescimento;

/// <summary>
/// Posição em que o comprimento/estatura foi medido. A OMS mede deitado (comprimento) até 2 anos
/// (&lt; 731 dias) e em pé (estatura) a partir daí; medida na posição trocada é corrigida em 0,7 cm
/// (em pé antes de 2 anos: +0,7; deitado depois de 2 anos: −0,7), como no WHO Anthro.
/// Sem posição informada, assume-se a posição esperada para a idade.
/// </summary>
public static class PosicaoMedida
{
    public const string Deitado = "Deitado";
    public const string EmPe = "EmPe";
    public const int IdadeTrocaDias = 731;
    public const decimal DiferencaCm = 0.7m;

    public static bool Valida(string? posicao) => posicao is null or Deitado or EmPe;

    /// <summary>true quando a idade pede comprimento (deitado): menos de 731 dias.</summary>
    public static bool DeitadoParaIdade(int idadeDias) => idadeDias < IdadeTrocaDias;

    public static decimal Ajustar(decimal cm, int idadeDias, string? posicao)
    {
        if (cm <= 0 || posicao is null) return cm;
        if (posicao == EmPe && DeitadoParaIdade(idadeDias)) return cm + DiferencaCm;
        if (posicao == Deitado && !DeitadoParaIdade(idadeDias)) return cm - DiferencaCm;
        return cm;
    }
}

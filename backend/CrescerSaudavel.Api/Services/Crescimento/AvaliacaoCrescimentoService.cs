using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Crescimento;

public interface IAvaliacaoCrescimentoService
{
    /// <summary>
    /// Seleciona a referência para a consulta, calcula os z-scores de peso, estatura e perímetro cefálico
    /// e grava na consulta os z-scores e a rastreabilidade do cálculo (referência, idade e tipo de idade).
    /// </summary>
    SelecaoReferencia AplicarZScores(Consulta consulta, RecemNascido crianca);
}

public class AvaliacaoCrescimentoService : IAvaliacaoCrescimentoService
{
    private readonly ZScoreService _zScoreService;
    private readonly IReferenciaCrescimentoService _referenciaService;

    public AvaliacaoCrescimentoService(ZScoreService zScoreService, IReferenciaCrescimentoService referenciaService)
    {
        _zScoreService = zScoreService;
        _referenciaService = referenciaService;
    }

    public SelecaoReferencia AplicarZScores(Consulta consulta, RecemNascido crianca)
    {
        var selecao = _referenciaService.Selecionar(crianca, consulta.DataHora);

        consulta.ReferenciaCurva = selecao.Referencia?.ToString();
        consulta.IdadeCalculoDias = selecao.IdadeDias;
        consulta.TipoIdadeCalculo = selecao.TipoIdade.ToString();

        if (selecao.Referencia is not { } referencia)
        {
            consulta.ZScorePeso = null;
            consulta.ZScoreAltura = null;
            consulta.ZScorePerimetro = null;
            return selecao;
        }

        consulta.ZScorePeso = Calcular(referencia, Medida.Peso, crianca.Sexo, selecao.IdadeDias, consulta.PesoKg);
        consulta.ZScoreAltura = Calcular(referencia, Medida.Estatura, crianca.Sexo, selecao.IdadeDias, consulta.EstaturaCm);
        consulta.ZScorePerimetro = Calcular(referencia, Medida.PerimetroCefalico, crianca.Sexo, selecao.IdadeDias, consulta.PerimetroCefalicoCm);
        return selecao;
    }

    private decimal? Calcular(TipoReferencia referencia, Medida medida, char sexo, int idadeDias, decimal valor)
    {
        if (valor <= 0) return null;
        var z = _zScoreService.CalcularZ(referencia, medida, sexo, idadeDias, (double)valor);
        return z.HasValue ? (decimal)z.Value : null;
    }
}

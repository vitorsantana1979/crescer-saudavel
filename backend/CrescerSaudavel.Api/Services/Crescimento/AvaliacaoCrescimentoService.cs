using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Crescimento;

public interface IAvaliacaoCrescimentoService
{
    /// <summary>
    /// Avalia a consulta por completo: seleciona a referência, calcula os z-scores de peso, estatura e
    /// perímetro cefálico, classifica cada indicador, aplica os alertas (RCEU, queda ponderal) e a
    /// velocidade de ganho ponderal em relação à consulta anterior, gravando tudo na consulta.
    /// </summary>
    SelecaoReferencia Avaliar(Consulta consulta, RecemNascido crianca, Consulta? consultaAnterior);
}

public class AvaliacaoCrescimentoService : IAvaliacaoCrescimentoService
{
    /// <summary>z do percentil 10: RCEU para pré-termo com peso ≤ p10 na curva INTERGROWTH-21st.</summary>
    public const decimal LimiarAlertaRceu = -1.28m;

    /// <summary>Queda de 0,5 DP no z de peso em relação à consulta anterior, na mesma referência.</summary>
    public const decimal LimiarQuedaPonderal = -0.5m;

    private readonly ZScoreService _zScoreService;
    private readonly IReferenciaCrescimentoService _referenciaService;

    public AvaliacaoCrescimentoService(ZScoreService zScoreService, IReferenciaCrescimentoService referenciaService)
    {
        _zScoreService = zScoreService;
        _referenciaService = referenciaService;
    }

    public SelecaoReferencia Avaliar(Consulta consulta, RecemNascido crianca, Consulta? consultaAnterior)
    {
        var selecao = AplicarZScores(consulta, crianca);
        AplicarClassificacoes(consulta);
        AplicarAlertas(consulta, consultaAnterior);
        AplicarVelocidadeGanhoPonderal(consulta, consultaAnterior);
        return selecao;
    }

    private SelecaoReferencia AplicarZScores(Consulta consulta, RecemNascido crianca)
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

    private static void AplicarClassificacoes(Consulta consulta)
    {
        consulta.ClassificacaoPeso = ClassificacaoCrescimento.Classificar(Indicador.PesoIdade, consulta.ZScorePeso)?.Codigo;
        consulta.ClassificacaoEstatura = ClassificacaoCrescimento.Classificar(Indicador.EstaturaIdade, consulta.ZScoreAltura)?.Codigo;
        consulta.ClassificacaoPerimetro = ClassificacaoCrescimento.Classificar(Indicador.PerimetroCefalicoIdade, consulta.ZScorePerimetro)?.Codigo;
    }

    private static void AplicarAlertas(Consulta consulta, Consulta? anterior)
    {
        // RCEU (restrição de crescimento extrauterino) é um conceito do pré-termo: peso ≤ p10 na
        // curva INTERGROWTH-21st. Depois de 64 semanas a leitura passa a ser a classificação OMS.
        consulta.AlertaRCEU =
            consulta.ReferenciaCurva == nameof(TipoReferencia.INTERGROWTH)
            && consulta.ZScorePeso.HasValue
            && consulta.ZScorePeso.Value <= LimiarAlertaRceu;

        // A queda só é comparável entre z-scores da mesma referência (INTERGROWTH → OMS muda a escala).
        consulta.AlertaQuedaPonderal =
            anterior?.ZScorePeso != null
            && consulta.ZScorePeso.HasValue
            && anterior.ReferenciaCurva == consulta.ReferenciaCurva
            && consulta.ZScorePeso.Value - anterior.ZScorePeso.Value <= LimiarQuedaPonderal;
    }

    private static void AplicarVelocidadeGanhoPonderal(Consulta consulta, Consulta? anterior)
    {
        // Velocidade de Ganho Ponderal (VGP) - Método Exponencial de Patel et al. (2005)
        // VGP = 1000 × ln(P2/P1) / (D2 - D1)
        consulta.VelocidadeGanhoPonderal = null;
        if (anterior == null || anterior.PesoKg <= 0 || consulta.PesoKg <= 0) return;

        var intervaloDias = (consulta.DataHora.Date - anterior.DataHora.Date).Days;
        if (intervaloDias <= 0) return;

        var p1 = (double)anterior.PesoKg;
        var p2 = (double)consulta.PesoKg;
        consulta.VelocidadeGanhoPonderal = (decimal)(1000.0 * Math.Log(p2 / p1) / intervaloDias);
    }
}

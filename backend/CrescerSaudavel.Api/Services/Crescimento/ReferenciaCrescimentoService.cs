using CrescerSaudavel.Api.Models;
using Microsoft.Extensions.Options;

namespace CrescerSaudavel.Api.Services.Crescimento;

public enum TipoIdade
{
    Cronologica,
    PosMenstrual,
    Corrigida
}

/// <summary>Referência e idade a usar no cálculo do z-score de uma consulta.</summary>
public record SelecaoReferencia(
    TipoReferencia? Referencia,
    int IdadeDias,
    TipoIdade TipoIdade,
    int IdadeCronologicaDias,
    int? IdadePosMenstrualDias,
    int? IdadeCorrigidaDias,
    string? Motivo)
{
    public bool PossuiReferencia => Referencia.HasValue;
}

public interface IReferenciaCrescimentoService
{
    SelecaoReferencia Selecionar(RecemNascido crianca, DateTime dataConsulta);
}

/// <summary>
/// Regra de seleção da curva de referência:
/// - a termo (IG ≥ 37 s): OMS pela idade cronológica, até 1856 dias;
/// - pré-termo até 64 semanas pós-menstruais: INTERGROWTH-21st (a partir de 27 semanas);
/// - pré-termo após 64 semanas: OMS pela idade corrigida até o limite configurado, depois idade cronológica.
/// (SBP, Manual de Orientação nº 64/2023; INTERGROWTH-21st Postnatal Growth Standards.)
/// </summary>
public class ReferenciaCrescimentoService : IReferenciaCrescimentoService
{
    public const int SemanasTermo = 37;
    public const int DiasGestacaoTermo = 280;
    public const double DiasPorMes = 30.4375;

    private readonly CrescimentoOptions _options;

    public ReferenciaCrescimentoService(IOptions<CrescimentoOptions> options)
    {
        _options = options.Value;
    }

    public SelecaoReferencia Selecionar(RecemNascido crianca, DateTime dataConsulta)
    {
        var idadeCronologica = (dataConsulta.Date - crianca.DataNascimento.Date).Days;
        if (idadeCronologica < 0)
        {
            return new SelecaoReferencia(null, idadeCronologica, TipoIdade.Cronologica, idadeCronologica, null, null,
                "Data da consulta anterior ao nascimento");
        }

        if (crianca.IdadeGestacionalSemanas >= SemanasTermo)
        {
            return SelecionarOms(idadeCronologica, TipoIdade.Cronologica, idadeCronologica, null, null);
        }

        var idadePosMenstrual = IdadeGestacionalDias(crianca) + idadeCronologica;
        if (idadePosMenstrual < ZScoreService.IntergrowthSemanaMinima * 7)
        {
            return new SelecaoReferencia(null, idadePosMenstrual, TipoIdade.PosMenstrual, idadeCronologica, idadePosMenstrual, null,
                $"Idade pós-menstrual abaixo de {ZScoreService.IntergrowthSemanaMinima} semanas: sem referência INTERGROWTH");
        }

        if (idadePosMenstrual <= ZScoreService.IntergrowthSemanaMaxima * 7)
        {
            return new SelecaoReferencia(TipoReferencia.INTERGROWTH, idadePosMenstrual, TipoIdade.PosMenstrual, idadeCronologica,
                idadePosMenstrual, null, null);
        }

        var idadeCorrigida = idadePosMenstrual - DiasGestacaoTermo;
        var limiteCorrecao = (int)Math.Ceiling(_options.LimiteIdadeCorrigidaMeses * DiasPorMes);
        if (idadeCorrigida <= limiteCorrecao)
        {
            return SelecionarOms(idadeCorrigida, TipoIdade.Corrigida, idadeCronologica, idadePosMenstrual, idadeCorrigida);
        }

        return SelecionarOms(idadeCronologica, TipoIdade.Cronologica, idadeCronologica, idadePosMenstrual, idadeCorrigida);
    }

    public static int IdadeGestacionalDias(RecemNascido crianca)
    {
        var semanasInteiras = (int)Math.Floor(crianca.IdadeGestacionalSemanas);
        var dias = crianca.IdadeGestacionalDias
                   ?? (int)Math.Round((double)(crianca.IdadeGestacionalSemanas - semanasInteiras) * 7);
        return semanasInteiras * 7 + Math.Clamp(dias, 0, 6);
    }

    private static SelecaoReferencia SelecionarOms(int idadeDias, TipoIdade tipoIdade, int idadeCronologica,
        int? idadePosMenstrual, int? idadeCorrigida)
    {
        if (idadeDias > ZScoreService.OmsDiaMaximo)
        {
            return new SelecaoReferencia(null, idadeDias, tipoIdade, idadeCronologica, idadePosMenstrual, idadeCorrigida,
                "Idade acima de 5 anos: fora da faixa das curvas OMS");
        }

        return new SelecaoReferencia(TipoReferencia.OMS, idadeDias, tipoIdade, idadeCronologica, idadePosMenstrual, idadeCorrigida, null);
    }
}

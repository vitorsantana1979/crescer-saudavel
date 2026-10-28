using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Crescimento;
using Microsoft.Extensions.Options;
using Xunit;

namespace CrescerSaudavel.Tests;

public class AvaliacaoCrescimentoServiceTests
{
    private static readonly DateTime Nascimento = new(2026, 1, 1);

    private static AvaliacaoCrescimentoService Servico() =>
        new(Referencias.Servico, new ReferenciaCrescimentoService(Options.Create(new CrescimentoOptions())));

    private static RecemNascido Crianca(decimal igSemanas) => new()
    {
        Sexo = 'F',
        DataNascimento = Nascimento,
        IdadeGestacionalSemanas = igSemanas,
        IdadeGestacionalDias = 0
    };

    [Fact]
    public void Termo_calcula_os_tres_z_scores_na_oms()
    {
        var consulta = new Consulta
        {
            DataHora = Nascimento,
            PesoKg = 3.232m,
            EstaturaCm = 49.148m,
            PerimetroCefalicoCm = 33.879m
        };

        var selecao = Servico().AplicarZScores(consulta, Crianca(39));

        Assert.True(selecao.PossuiReferencia);
        Assert.Equal("OMS", consulta.ReferenciaCurva);
        Assert.Equal("Cronologica", consulta.TipoIdadeCalculo);
        Assert.Equal(0, consulta.IdadeCalculoDias);
        Assert.Equal(0m, consulta.ZScorePeso!.Value, 1);
        Assert.Equal(0m, consulta.ZScoreAltura!.Value, 1);
        Assert.Equal(0m, consulta.ZScorePerimetro!.Value, 1);
    }

    [Fact]
    public void Pretermo_calcula_o_peso_no_intergrowth_e_deixa_as_outras_medidas_sem_z()
    {
        var consulta = new Consulta
        {
            DataHora = Nascimento.AddDays(70), // IG 30 + 10 semanas = 40 semanas pós-menstruais
            PesoKg = 3.13m,
            EstaturaCm = 50m,
            PerimetroCefalicoCm = 35m
        };

        Servico().AplicarZScores(consulta, Crianca(30));

        Assert.Equal("INTERGROWTH", consulta.ReferenciaCurva);
        Assert.Equal("PosMenstrual", consulta.TipoIdadeCalculo);
        Assert.Equal(280, consulta.IdadeCalculoDias);
        Assert.Equal(0m, consulta.ZScorePeso!.Value, 1);
        Assert.Null(consulta.ZScoreAltura);
        Assert.Null(consulta.ZScorePerimetro);
    }

    [Fact]
    public void Sem_referencia_zera_os_z_scores_e_registra_o_tipo_de_idade()
    {
        var consulta = new Consulta
        {
            DataHora = Nascimento.AddDays(7),
            PesoKg = 0.8m,
            EstaturaCm = 32m,
            PerimetroCefalicoCm = 23m,
            ZScorePeso = 1m
        };

        var selecao = Servico().AplicarZScores(consulta, Crianca(25));

        Assert.False(selecao.PossuiReferencia);
        Assert.Null(consulta.ReferenciaCurva);
        Assert.Equal("PosMenstrual", consulta.TipoIdadeCalculo);
        Assert.Null(consulta.ZScorePeso);
    }

    [Fact]
    public void Medida_nao_informada_fica_sem_z()
    {
        var consulta = new Consulta
        {
            DataHora = Nascimento.AddDays(30),
            PesoKg = 4.0m,
            EstaturaCm = 0m,
            PerimetroCefalicoCm = 0m
        };

        Servico().AplicarZScores(consulta, Crianca(40));

        Assert.NotNull(consulta.ZScorePeso);
        Assert.Null(consulta.ZScoreAltura);
        Assert.Null(consulta.ZScorePerimetro);
    }
}

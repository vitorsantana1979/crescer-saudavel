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

    private static Consulta ConsultaTermoNaMediana(int dia = 0) => new()
    {
        DataHora = Nascimento.AddDays(dia),
        PesoKg = 3.232m,
        EstaturaCm = 49.148m,
        PerimetroCefalicoCm = 33.879m
    };

    [Fact]
    public void Termo_calcula_os_tres_z_scores_na_oms()
    {
        var consulta = ConsultaTermoNaMediana();

        var selecao = Servico().Avaliar(consulta, Crianca(39), null);

        Assert.True(selecao.PossuiReferencia);
        Assert.Equal("OMS", consulta.ReferenciaCurva);
        Assert.Equal("Cronologica", consulta.TipoIdadeCalculo);
        Assert.Equal(0, consulta.IdadeCalculoDias);
        Assert.Equal(0m, consulta.ZScorePeso!.Value, 1);
        Assert.Equal(0m, consulta.ZScoreAltura!.Value, 1);
        Assert.Equal(0m, consulta.ZScorePerimetro!.Value, 1);
    }

    [Fact]
    public void Termo_na_mediana_e_classificado_como_adequado_sem_alertas()
    {
        var consulta = ConsultaTermoNaMediana();

        Servico().Avaliar(consulta, Crianca(39), null);

        Assert.Equal("PesoAdequado", consulta.ClassificacaoPeso);
        Assert.Equal("EstaturaAdequada", consulta.ClassificacaoEstatura);
        Assert.Equal("PerimetroCefalicoAdequado", consulta.ClassificacaoPerimetro);
        Assert.False(consulta.AlertaRCEU);
        Assert.False(consulta.AlertaQuedaPonderal);
        Assert.Null(consulta.VelocidadeGanhoPonderal);
    }

    [Fact]
    public void Termo_com_baixo_peso_e_classificado_mas_nao_dispara_rceu()
    {
        var consulta = new Consulta { DataHora = Nascimento, PesoKg = 2.3m, EstaturaCm = 49m, PerimetroCefalicoCm = 34m };

        Servico().Avaliar(consulta, Crianca(39), null);

        Assert.InRange(consulta.ZScorePeso!.Value, -3m, -2m);
        Assert.Equal("PesoBaixo", consulta.ClassificacaoPeso);
        Assert.False(consulta.AlertaRCEU);
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

        Servico().Avaliar(consulta, Crianca(30), null);

        Assert.Equal("INTERGROWTH", consulta.ReferenciaCurva);
        Assert.Equal("PosMenstrual", consulta.TipoIdadeCalculo);
        Assert.Equal(280, consulta.IdadeCalculoDias);
        Assert.Equal(0m, consulta.ZScorePeso!.Value, 1);
        Assert.Equal("PesoAdequado", consulta.ClassificacaoPeso);
        Assert.Null(consulta.ZScoreAltura);
        Assert.Null(consulta.ClassificacaoEstatura);
        Assert.Null(consulta.ZScorePerimetro);
        Assert.Null(consulta.ClassificacaoPerimetro);
        Assert.False(consulta.AlertaRCEU);
    }

    [Fact]
    public void Pretermo_abaixo_do_p10_no_intergrowth_dispara_rceu()
    {
        var consulta = new Consulta { DataHora = Nascimento.AddDays(70), PesoKg = 2.0m, EstaturaCm = 0m, PerimetroCefalicoCm = 0m };

        Servico().Avaliar(consulta, Crianca(30), null);

        Assert.Equal("INTERGROWTH", consulta.ReferenciaCurva);
        Assert.True(consulta.ZScorePeso!.Value <= AvaliacaoCrescimentoService.LimiarAlertaRceu);
        Assert.True(consulta.AlertaRCEU);
        Assert.True(ClassificacaoCrescimento.EhCuidado(consulta.ClassificacaoPeso));
    }

    [Fact]
    public void Queda_ponderal_compara_o_z_com_a_consulta_anterior_na_mesma_referencia()
    {
        var consulta = ConsultaTermoNaMediana(dia: 10);
        var zAtual = ZAtual(consulta);
        var anterior = new Consulta { DataHora = Nascimento, PesoKg = 3.5m, ZScorePeso = zAtual + 0.6m, ReferenciaCurva = "OMS" };

        Servico().Avaliar(consulta, Crianca(39), anterior);
        Assert.True(consulta.AlertaQuedaPonderal);

        anterior.ReferenciaCurva = "INTERGROWTH";
        Servico().Avaliar(consulta, Crianca(39), anterior);
        Assert.False(consulta.AlertaQuedaPonderal);
    }

    [Fact]
    public void Queda_menor_que_meio_desvio_nao_dispara_alerta()
    {
        var consulta = ConsultaTermoNaMediana(dia: 10);
        var zAtual = ZAtual(consulta);
        var anterior = new Consulta { DataHora = Nascimento, PesoKg = 3.3m, ZScorePeso = zAtual + 0.4m, ReferenciaCurva = "OMS" };

        Servico().Avaliar(consulta, Crianca(39), anterior);

        Assert.False(consulta.AlertaQuedaPonderal);
    }

    private static decimal ZAtual(Consulta consulta)
    {
        Servico().Avaliar(consulta, Crianca(39), null);
        return consulta.ZScorePeso!.Value;
    }

    [Fact]
    public void Velocidade_de_ganho_ponderal_segue_o_metodo_exponencial_de_patel()
    {
        var anterior = new Consulta { DataHora = Nascimento, PesoKg = 3.0m };
        var consulta = new Consulta { DataHora = Nascimento.AddDays(10), PesoKg = 3.3m, EstaturaCm = 50m, PerimetroCefalicoCm = 35m };

        Servico().Avaliar(consulta, Crianca(39), anterior);

        var esperado = (decimal)(1000.0 * Math.Log(3.3 / 3.0) / 10);
        Assert.Equal(esperado, consulta.VelocidadeGanhoPonderal!.Value, 3);
    }

    [Fact]
    public void Sem_referencia_zera_os_z_scores_classificacoes_e_alertas()
    {
        var consulta = new Consulta
        {
            DataHora = Nascimento.AddDays(7),
            PesoKg = 0.8m,
            EstaturaCm = 32m,
            PerimetroCefalicoCm = 23m,
            ZScorePeso = 1m,
            ClassificacaoPeso = "PesoAdequado",
            AlertaRCEU = true
        };

        var selecao = Servico().Avaliar(consulta, Crianca(25), null);

        Assert.False(selecao.PossuiReferencia);
        Assert.Null(consulta.ReferenciaCurva);
        Assert.Equal("PosMenstrual", consulta.TipoIdadeCalculo);
        Assert.Null(consulta.ZScorePeso);
        Assert.Null(consulta.ClassificacaoPeso);
        Assert.False(consulta.AlertaRCEU);
    }

    [Fact]
    public void Medida_nao_informada_fica_sem_z_nem_classificacao()
    {
        var consulta = new Consulta
        {
            DataHora = Nascimento.AddDays(30),
            PesoKg = 4.0m,
            EstaturaCm = 0m,
            PerimetroCefalicoCm = 0m
        };

        Servico().Avaliar(consulta, Crianca(40), null);

        Assert.NotNull(consulta.ZScorePeso);
        Assert.NotNull(consulta.ClassificacaoPeso);
        Assert.Null(consulta.ZScoreAltura);
        Assert.Null(consulta.ClassificacaoEstatura);
        Assert.Null(consulta.ZScorePerimetro);
        Assert.Null(consulta.ClassificacaoPerimetro);
    }
}

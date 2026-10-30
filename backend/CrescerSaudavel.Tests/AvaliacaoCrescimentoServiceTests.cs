using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services;
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
    public void Pretermo_calcula_as_tres_medidas_no_intergrowth()
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
        // meninas, 40 semanas: comprimento mediana 49,3 / +1 51,2; PC mediana 34,2 / +1 35,2
        Assert.InRange(consulta.ZScoreAltura!.Value, 0.3m, 0.45m);
        Assert.Equal("EstaturaAdequada", consulta.ClassificacaoEstatura);
        Assert.InRange(consulta.ZScorePerimetro!.Value, 0.75m, 0.85m);
        Assert.Equal("PerimetroCefalicoAdequado", consulta.ClassificacaoPerimetro);
        Assert.False(consulta.AlertaRCEU);
    }

    [Fact]
    public void Pretermo_com_perimetro_abaixo_de_menos_2_e_classificado_mas_rceu_continua_so_pelo_peso()
    {
        var consulta = new Consulta { DataHora = Nascimento.AddDays(70), PesoKg = 3.13m, EstaturaCm = 49.3m, PerimetroCefalicoCm = 31.8m };

        Servico().Avaliar(consulta, Crianca(30), null);

        Assert.Equal("INTERGROWTH", consulta.ReferenciaCurva);
        Assert.True(consulta.ZScorePerimetro < -2m);
        Assert.Equal("PerimetroCefalicoAbaixo", consulta.ClassificacaoPerimetro);
        Assert.Equal("EstaturaAdequada", consulta.ClassificacaoEstatura);
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
    public void Ganho_esperado_no_termo_usa_30_dias_da_oms()
    {
        var consulta = ConsultaTermoNaMediana();

        var ganhos = Servico().GanhoParaManterCanal(consulta, Crianca(39));

        var peso = Assert.Single(ganhos, g => g.Medida == "peso");
        Assert.Equal("OMS", peso.Referencia);
        Assert.Equal(30, peso.HorizonteDias);
        var esperado = Referencias.Servico.ValorNoZ(TipoReferencia.OMS, Medida.Peso, 'f', 30, (double)peso.Z)!.Value;
        Assert.Equal(Math.Round((decimal)esperado, 3), peso.ValorEsperado);
        Assert.Equal(peso.ValorEsperado - 3.232m, peso.Ganho);
        Assert.Equal(3, ganhos.Count);
    }

    [Fact]
    public void Ganho_esperado_no_pretermo_usa_7_dias_da_intergrowth()
    {
        var consulta = new Consulta { DataHora = Nascimento.AddDays(70), PesoKg = 3.13m, EstaturaCm = 49.3m, PerimetroCefalicoCm = 34.2m };

        var ganhos = Servico().GanhoParaManterCanal(consulta, Crianca(30));

        var peso = ganhos.Single(g => g.Medida == "peso");
        Assert.Equal("INTERGROWTH", peso.Referencia);
        Assert.Equal(7, peso.HorizonteDias);
        Assert.Equal(3.35m, peso.ValorEsperado);   // mediana de meninas às 41 semanas
        Assert.Equal(0.22m, peso.Ganho);
        Assert.Equal(Math.Round((decimal)(1000 * Math.Log(3.35 / 3.13) / 7), 1), peso.VelocidadeGKgDia);
        Assert.Null(ganhos.Single(g => g.Medida == "estatura").VelocidadeGKgDia);
    }

    [Fact]
    public void Ganho_esperado_encurta_o_horizonte_no_fim_da_intergrowth()
    {
        // IG 30 s; 64 s pós-menstruais menos 3 dias
        var consulta = new Consulta { DataHora = Nascimento.AddDays(34 * 7 - 3), PesoKg = 7.0m, EstaturaCm = 0m, PerimetroCefalicoCm = 0m };

        var peso = Assert.Single(Servico().GanhoParaManterCanal(consulta, Crianca(30)));

        Assert.Equal(3, peso.HorizonteDias);
    }

    [Fact]
    public void Sem_referencia_nao_ha_ganho_esperado()
    {
        var consulta = new Consulta { DataHora = Nascimento.AddDays(7), PesoKg = 0.8m };

        Assert.Empty(Servico().GanhoParaManterCanal(consulta, Crianca(25)));
    }

    [Fact]
    public void Termo_calcula_imc_e_peso_para_comprimento_com_classificacao()
    {
        var consulta = ConsultaTermoNaMediana();

        Servico().Avaliar(consulta, Crianca(39), null);

        Assert.Equal(Math.Round(3.232m / (0.49148m * 0.49148m), 2), consulta.Imc);
        Assert.NotNull(consulta.ZScoreImc);
        Assert.NotNull(consulta.ZScorePesoEstatura);
        Assert.Equal("ImcEutrofia", consulta.ClassificacaoImc);
        Assert.Equal("PesoEstaturaEutrofia", consulta.ClassificacaoPesoEstatura);
    }

    [Fact]
    public void Estatura_medida_em_pe_antes_de_2_anos_ganha_0_7_cm()
    {
        var semPosicao = new Consulta { DataHora = Nascimento.AddDays(400), PesoKg = 9.5m, EstaturaCm = 75m, PerimetroCefalicoCm = 45m };
        var emPe = new Consulta { DataHora = Nascimento.AddDays(400), PesoKg = 9.5m, EstaturaCm = 74.3m, PerimetroCefalicoCm = 45m, PosicaoMedida = PosicaoMedida.EmPe };

        Servico().Avaliar(semPosicao, Crianca(39), null);
        Servico().Avaliar(emPe, Crianca(39), null);

        Assert.Equal(semPosicao.ZScoreAltura, emPe.ZScoreAltura);
        Assert.Equal(semPosicao.Imc, emPe.Imc);
        Assert.Equal(semPosicao.ZScorePesoEstatura, emPe.ZScorePesoEstatura);
    }

    [Fact]
    public void Estatura_medida_deitado_depois_de_2_anos_perde_0_7_cm_e_usa_peso_para_estatura()
    {
        var deitado = new Consulta { DataHora = Nascimento.AddDays(800), PesoKg = 12m, EstaturaCm = 87.7m, PerimetroCefalicoCm = 48m, PosicaoMedida = PosicaoMedida.Deitado };
        var emPe = new Consulta { DataHora = Nascimento.AddDays(800), PesoKg = 12m, EstaturaCm = 87m, PerimetroCefalicoCm = 48m };

        Servico().Avaliar(deitado, Crianca(39), null);
        Servico().Avaliar(emPe, Crianca(39), null);

        Assert.Equal(emPe.ZScoreAltura, deitado.ZScoreAltura);
        var esperado = Referencias.Servico.CalcularZPesoEstatura('F', deitado: false, 87.0, 12.0);
        Assert.Equal((decimal)esperado!.Value, deitado.ZScorePesoEstatura);
    }

    [Fact]
    public void Pretermo_no_intergrowth_tem_imc_calculado_mas_sem_z_de_imc()
    {
        var consulta = new Consulta { DataHora = Nascimento.AddDays(70), PesoKg = 3.13m, EstaturaCm = 49.3m, PerimetroCefalicoCm = 34.2m };

        Servico().Avaliar(consulta, Crianca(30), null);

        Assert.NotNull(consulta.Imc);
        Assert.Null(consulta.ZScoreImc);
        Assert.Null(consulta.ZScorePesoEstatura);
        Assert.Null(consulta.ClassificacaoImc);
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

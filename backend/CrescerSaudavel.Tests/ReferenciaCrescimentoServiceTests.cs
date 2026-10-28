using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Crescimento;
using Microsoft.Extensions.Options;
using Xunit;

namespace CrescerSaudavel.Tests;

public class ReferenciaCrescimentoServiceTests
{
    private static readonly DateTime Nascimento = new(2026, 1, 1);

    private static ReferenciaCrescimentoService Servico(int limiteMeses = 24) =>
        new(Options.Create(new CrescimentoOptions { LimiteIdadeCorrigidaMeses = limiteMeses }));

    private static RecemNascido Crianca(decimal igSemanas, int? igDias = 0) => new()
    {
        Sexo = 'F',
        DataNascimento = Nascimento,
        IdadeGestacionalSemanas = igSemanas,
        IdadeGestacionalDias = igDias
    };

    [Fact]
    public void Termo_usa_oms_pela_idade_cronologica()
    {
        var selecao = Servico().Selecionar(Crianca(39), Nascimento.AddDays(100));

        Assert.Equal(TipoReferencia.OMS, selecao.Referencia);
        Assert.Equal(TipoIdade.Cronologica, selecao.TipoIdade);
        Assert.Equal(100, selecao.IdadeDias);
        Assert.Null(selecao.IdadePosMenstrualDias);
    }

    [Fact]
    public void Termo_acima_de_5_anos_fica_sem_referencia()
    {
        var selecao = Servico().Selecionar(Crianca(40), Nascimento.AddDays(ZScoreService.OmsDiaMaximo + 1));

        Assert.Null(selecao.Referencia);
        Assert.Contains("5 anos", selecao.Motivo);
    }

    [Fact]
    public void Pretermo_ate_64_semanas_usa_intergrowth_pela_idade_pos_menstrual()
    {
        var selecao = Servico().Selecionar(Crianca(30), Nascimento.AddDays(10));

        Assert.Equal(TipoReferencia.INTERGROWTH, selecao.Referencia);
        Assert.Equal(TipoIdade.PosMenstrual, selecao.TipoIdade);
        Assert.Equal(30 * 7 + 10, selecao.IdadeDias);
        Assert.Equal(10, selecao.IdadeCronologicaDias);
    }

    [Fact]
    public void Idade_pos_menstrual_soma_os_dias_da_idade_gestacional()
    {
        var selecao = Servico().Selecionar(Crianca(32, igDias: 3), Nascimento);

        Assert.Equal(32 * 7 + 3, selecao.IdadeDias);
    }

    [Fact]
    public void Idade_gestacional_fracionaria_sem_dias_informados_e_convertida()
    {
        Assert.Equal(32 * 7, ReferenciaCrescimentoService.IdadeGestacionalDias(Crianca(32.0m, igDias: null)));
        Assert.Equal(32 * 7 + 3, ReferenciaCrescimentoService.IdadeGestacionalDias(Crianca(32.43m, igDias: null)));
    }

    [Fact]
    public void Pretermo_abaixo_de_27_semanas_pos_menstruais_fica_sem_referencia()
    {
        var selecao = Servico().Selecionar(Crianca(25), Nascimento.AddDays(7));

        Assert.Null(selecao.Referencia);
        Assert.Equal(TipoIdade.PosMenstrual, selecao.TipoIdade);
        Assert.Contains("27", selecao.Motivo);
    }

    [Fact]
    public void Pretermo_no_limite_de_64_semanas_ainda_usa_intergrowth()
    {
        var selecao = Servico().Selecionar(Crianca(30), Nascimento.AddDays(64 * 7 - 30 * 7));

        Assert.Equal(TipoReferencia.INTERGROWTH, selecao.Referencia);
        Assert.Equal(64 * 7, selecao.IdadeDias);
    }

    [Fact]
    public void Pretermo_apos_64_semanas_usa_oms_pela_idade_corrigida()
    {
        var selecao = Servico().Selecionar(Crianca(30), Nascimento.AddDays(300));

        Assert.Equal(TipoReferencia.OMS, selecao.Referencia);
        Assert.Equal(TipoIdade.Corrigida, selecao.TipoIdade);
        Assert.Equal(30 * 7 + 300 - 280, selecao.IdadeDias);
        Assert.Equal(300, selecao.IdadeCronologicaDias);
        Assert.Equal(30 * 7 + 300, selecao.IdadePosMenstrualDias);
    }

    [Fact]
    public void Transicao_intergrowth_para_oms_e_continua_na_idade()
    {
        var servico = Servico();
        var ultimoDiaIntergrowth = servico.Selecionar(Crianca(30), Nascimento.AddDays(64 * 7 - 30 * 7));
        var primeiroDiaOms = servico.Selecionar(Crianca(30), Nascimento.AddDays(64 * 7 - 30 * 7 + 1));

        Assert.Equal(TipoReferencia.INTERGROWTH, ultimoDiaIntergrowth.Referencia);
        Assert.Equal(TipoReferencia.OMS, primeiroDiaOms.Referencia);
        // 64 semanas pós-menstruais = 24 semanas de idade corrigida; o dia seguinte é 169 dias corrigidos
        Assert.Equal(24 * 7 + 1, primeiroDiaOms.IdadeDias);
    }

    [Fact]
    public void Pretermo_apos_o_limite_de_correcao_usa_oms_pela_idade_cronologica()
    {
        // limite 24 meses = 730,5 dias → 731 dias corrigidos
        var servico = Servico(limiteMeses: 24);
        var dentro = servico.Selecionar(Crianca(30), Nascimento.AddDays(731 + 70));
        var fora = servico.Selecionar(Crianca(30), Nascimento.AddDays(732 + 70));

        Assert.Equal(TipoIdade.Corrigida, dentro.TipoIdade);
        Assert.Equal(731, dentro.IdadeDias);
        Assert.Equal(TipoIdade.Cronologica, fora.TipoIdade);
        Assert.Equal(802, fora.IdadeDias);
        Assert.Equal(732, fora.IdadeCorrigidaDias);
    }

    [Fact]
    public void Limite_de_correcao_e_configuravel()
    {
        var selecao = Servico(limiteMeses: 12).Selecionar(Crianca(30), Nascimento.AddDays(500));

        Assert.Equal(TipoIdade.Cronologica, selecao.TipoIdade);
        Assert.Equal(500, selecao.IdadeDias);
    }

    [Fact]
    public void Consulta_anterior_ao_nascimento_fica_sem_referencia()
    {
        var selecao = Servico().Selecionar(Crianca(40), Nascimento.AddDays(-1));

        Assert.Null(selecao.Referencia);
        Assert.Contains("anterior ao nascimento", selecao.Motivo);
    }
}

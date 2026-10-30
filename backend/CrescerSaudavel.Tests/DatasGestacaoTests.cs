using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Crescimento;
using Xunit;

namespace CrescerSaudavel.Tests;

public class DatasGestacaoTests
{
    private static readonly DateTime Nascimento = new(2026, 3, 10);

    [Fact]
    public void Dpp_pela_regra_de_naegele_e_dum_mais_280_dias()
    {
        Assert.Equal(new DateTime(2026, 10, 8), DatasGestacao.DppPelaDum(new DateTime(2026, 1, 1)));
    }

    [Fact]
    public void Ig_pela_dum_e_pela_dpp_concordam_quando_a_dpp_vem_da_dum()
    {
        var dum = Nascimento.AddDays(-(34 * 7 + 2));
        var dpp = DatasGestacao.DppPelaDum(dum);

        Assert.Equal(34 * 7 + 2, DatasGestacao.IgPelaDum(dum, Nascimento));
        Assert.Equal(34 * 7 + 2, DatasGestacao.IgPelaDpp(dpp, Nascimento));
    }

    [Fact]
    public void Ig_pela_dpp_no_dia_da_dpp_e_40_semanas()
    {
        Assert.Equal(280, DatasGestacao.IgPelaDpp(Nascimento, Nascimento));
    }

    private static RecemNascido Rn() => new() { DataNascimento = Nascimento, IdadeGestacionalSemanas = 34 };

    [Fact]
    public void Validar_aceita_campos_vazios_e_datas_coerentes()
    {
        Assert.Null(DatasGestacao.Validar(Rn()));

        var rn = Rn();
        rn.MetodoIG = "USG";
        rn.HoraNascimento = new TimeSpan(14, 30, 0);
        rn.DataUltimaMenstruacao = Nascimento.AddDays(-238);
        rn.DataProvavelParto = DatasGestacao.DppPelaDum(rn.DataUltimaMenstruacao.Value);
        Assert.Null(DatasGestacao.Validar(rn));
    }

    [Fact]
    public void Validar_recusa_metodo_desconhecido_e_datas_implausiveis()
    {
        var metodo = Rn();
        metodo.MetodoIG = "Capurro";
        Assert.NotNull(DatasGestacao.Validar(metodo));

        var dumDepois = Rn();
        dumDepois.DataUltimaMenstruacao = Nascimento.AddDays(5);
        Assert.NotNull(DatasGestacao.Validar(dumDepois));

        var dppLonge = Rn();
        dppLonge.DataProvavelParto = Nascimento.AddDays(200); // IG de 80 dias
        Assert.NotNull(DatasGestacao.Validar(dppLonge));

        var hora = Rn();
        hora.HoraNascimento = TimeSpan.FromHours(25);
        Assert.NotNull(DatasGestacao.Validar(hora));
    }
}

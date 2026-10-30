using CrescerSaudavel.Api.Services;
using Xunit;

namespace CrescerSaudavel.Tests;

public class ZScoreServiceTests
{
    private readonly ZScoreService _servico = Referencias.Servico;

    [Theory]
    [InlineData('f', 0, 4.230, 2.00)]      // SD2 no dia 0 (tabela expandida meninas)
    [InlineData('f', 0, 2.395, -2.00)]     // SD2neg no dia 0
    [InlineData('f', 364, 7.035, -2.00)]   // SD2neg no dia 364
    [InlineData('f', 1856, 18.389, 0.00)]  // SD0 no último dia
    [InlineData('m', 0, 3.346, 0.00)]      // SD0 meninos no dia 0
    [InlineData('m', 1856, 24.411, 2.00)]  // SD2 meninos no último dia
    public void Oms_peso_reproduz_as_linhas_da_tabela_expandida(char sexo, int dia, double peso, double zEsperado)
    {
        var z = _servico.CalcularZ(TipoReferencia.OMS, Medida.Peso, sexo, dia, peso);

        Assert.NotNull(z);
        // a tabela publica os valores com 3 casas; tolerância de 0,01 em z
        Assert.InRange(z!.Value, zEsperado - 0.01, zEsperado + 0.01);
    }

    [Theory]
    [InlineData(1825, 10.5, -3.92)]
    [InlineData(1825, 30.0, 3.10)]
    public void Oms_peso_alem_de_3_usa_o_ajuste_de_caudas_da_oms(int dia, double peso, double zEsperado)
    {
        var z = _servico.CalcularZ(TipoReferencia.OMS, Medida.Peso, 'f', dia, peso);

        Assert.NotNull(z);
        Assert.Equal(zEsperado, z!.Value, 2);
    }

    [Fact]
    public void Oms_estatura_e_perimetro_nao_restringem_as_caudas()
    {
        // L = 1 nessas tabelas: SD4neg do dia 0 (meninas) deve dar exatamente -4
        var zEstatura = _servico.CalcularZ(TipoReferencia.OMS, Medida.Estatura, 'f', 0, 41.697);
        var zPerimetro = _servico.CalcularZ(TipoReferencia.OMS, Medida.PerimetroCefalico, 'f', 0, 29.141);

        Assert.Equal(-4.00, zEstatura!.Value, 2);
        Assert.Equal(-4.00, zPerimetro!.Value, 2);
    }

    [Fact]
    public void Oms_estatura_e_perimetro_reproduzem_a_mediana()
    {
        Assert.Equal(0.00, _servico.CalcularZ(TipoReferencia.OMS, Medida.Estatura, 'm', 1856, 110.4969)!.Value, 2);
        Assert.Equal(0.00, _servico.CalcularZ(TipoReferencia.OMS, Medida.PerimetroCefalico, 'm', 0, 34.4618)!.Value, 2);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1857)]
    public void Oms_fora_da_faixa_de_idade_retorna_null(int dia)
    {
        Assert.Null(_servico.CalcularZ(TipoReferencia.OMS, Medida.Peso, 'f', dia, 5.0));
    }

    [Fact]
    public void Valor_nao_positivo_retorna_null()
    {
        Assert.Null(_servico.CalcularZ(TipoReferencia.OMS, Medida.Peso, 'f', 10, 0));
        Assert.Null(_servico.CalcularZ(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', 280, -1));
    }

    [Fact]
    public void Oms_interpola_entre_dias()
    {
        // mediana do dia 7 = 3.339 e do dia 8 = 3.369 (meninas): no meio, 3.354 deve dar z ≈ 0
        var z = _servico.CalcularZ(TipoReferencia.OMS, Medida.Peso, 'f', 7.5, 3.354);

        Assert.Equal(0.00, z!.Value, 1);
    }

    [Theory]
    [InlineData(27 * 7, 0.33, -3.00)]
    [InlineData(40 * 7, 3.13, 0.00)]
    [InlineData(40 * 7, 2.37, -2.00)]
    [InlineData(64 * 7, 10.45, 3.00)]
    public void Intergrowth_peso_reproduz_a_tabela_oficial(int idadePosMenstrualDias, double peso, double zEsperado)
    {
        var z = _servico.CalcularZ(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', idadePosMenstrualDias, peso);

        Assert.NotNull(z);
        Assert.Equal(zEsperado, z!.Value, 2);
    }

    [Fact]
    public void Intergrowth_interpola_entre_semanas()
    {
        // mediana sobe de 3.13 (40 s) para 3.35 (41 s): 3.13 aos 40 s + 3 d fica um pouco abaixo da mediana
        var z = _servico.CalcularZ(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', 40 * 7 + 3, 3.13);

        Assert.NotNull(z);
        Assert.InRange(z!.Value, -0.5, -0.01);
    }

    [Fact]
    public void Intergrowth_extrapola_alem_das_linhas_extremas()
    {
        var acima = _servico.CalcularZ(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', 40 * 7, 5.5);
        var abaixo = _servico.CalcularZ(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', 40 * 7, 1.5);

        Assert.True(acima > 3);
        Assert.True(abaixo < -3);
    }

    [Theory]
    [InlineData(26 * 7)]
    [InlineData(64 * 7 + 1)]
    public void Intergrowth_fora_de_27_a_64_semanas_retorna_null(int idadePosMenstrualDias)
    {
        Assert.Null(_servico.CalcularZ(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', idadePosMenstrualDias, 3.0));
    }

    [Theory]
    [InlineData(Medida.Estatura, 'm', 27 * 7, 26.6, -3.00)]
    [InlineData(Medida.Estatura, 'm', 40 * 7, 50.9, 0.00)]
    [InlineData(Medida.Estatura, 'f', 40 * 7, 45.8, -2.00)]
    [InlineData(Medida.Estatura, 'f', 64 * 7, 71.8, 3.00)]
    [InlineData(Medida.PerimetroCefalico, 'f', 27 * 7, 18.8, -3.00)]
    [InlineData(Medida.PerimetroCefalico, 'f', 40 * 7, 34.2, 0.00)]
    [InlineData(Medida.PerimetroCefalico, 'm', 40 * 7, 33.1, -2.00)]
    [InlineData(Medida.PerimetroCefalico, 'm', 64 * 7, 46.6, 3.00)]
    public void Intergrowth_comprimento_e_perimetro_reproduzem_a_tabela_oficial(
        Medida medida, char sexo, int idadePosMenstrualDias, double valor, double zEsperado)
    {
        var z = _servico.CalcularZ(TipoReferencia.INTERGROWTH, medida, sexo, idadePosMenstrualDias, valor);

        Assert.NotNull(z);
        Assert.Equal(zEsperado, z!.Value, 2);
    }

    [Fact]
    public void Intergrowth_possui_as_tres_medidas_para_os_dois_sexos()
    {
        foreach (var medida in Enum.GetValues<Medida>())
        foreach (var sexo in new[] { 'f', 'm' })
            Assert.True(_servico.PossuiReferencia(TipoReferencia.INTERGROWTH, medida, sexo), $"{medida} {sexo}");
    }

    [Theory]
    [InlineData(TipoReferencia.OMS, Medida.Peso, 'f', 0, 2.0, 4.230)]
    [InlineData(TipoReferencia.OMS, Medida.Peso, 'f', 364, -2.0, 7.035)]
    [InlineData(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', 280, 0.0, 3.13)]
    [InlineData(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', 280, -2.0, 2.37)]
    [InlineData(TipoReferencia.INTERGROWTH, Medida.PerimetroCefalico, 'm', 280, -2.0, 33.1)]
    public void Valor_no_z_reproduz_as_tabelas(TipoReferencia tipo, Medida medida, char sexo, int idade, double z, double esperado)
    {
        Assert.Equal(esperado, _servico.ValorNoZ(tipo, medida, sexo, idade, z)!.Value, 3);
    }

    [Theory]
    [InlineData(TipoReferencia.OMS, Medida.Peso, 'm', 100, -3.7)]
    [InlineData(TipoReferencia.OMS, Medida.Peso, 'm', 100, 3.4)]
    [InlineData(TipoReferencia.OMS, Medida.Estatura, 'f', 500, -1.23)]
    [InlineData(TipoReferencia.INTERGROWTH, Medida.Estatura, 'f', 250, 0.57)]
    [InlineData(TipoReferencia.INTERGROWTH, Medida.Peso, 'm', 300, -3.4)]
    [InlineData(TipoReferencia.INTERGROWTH, Medida.Peso, 'm', 300, 3.2)]
    public void Valor_no_z_e_o_inverso_do_calculo_de_z(TipoReferencia tipo, Medida medida, char sexo, double idade, double z)
    {
        var valor = _servico.ValorNoZ(tipo, medida, sexo, idade, z)!.Value;

        Assert.Equal(z, _servico.CalcularZ(tipo, medida, sexo, idade, valor)!.Value, 2);
    }

    [Fact]
    public void Valor_no_z_fora_da_faixa_retorna_null()
    {
        Assert.Null(_servico.ValorNoZ(TipoReferencia.OMS, Medida.Peso, 'f', 1857, 0));
        Assert.Null(_servico.ValorNoZ(TipoReferencia.INTERGROWTH, Medida.Peso, 'f', 64 * 7 + 1, 0));
    }

    [Fact]
    public void Curvas_semanais_oms_cobrem_0_a_265_semanas()
    {
        var curvas = _servico.ObterCurvasPesoPadrao("f")!;

        Assert.Equal(266, curvas.Count);
        Assert.Equal(0, curvas[0].Semanas);
        Assert.Equal(3.232, curvas[0].Z0, 3);
        Assert.Equal(265, curvas[^1].Semanas);
        Assert.All(curvas, c => Assert.True(c.ZN3 < c.ZN2 && c.ZN2 < c.ZN1 && c.ZN1 < c.Z0 && c.Z0 < c.ZP1 && c.ZP1 < c.ZP2 && c.ZP2 < c.ZP3));
    }

    [Fact]
    public void Curvas_intergrowth_cobrem_27_a_64_semanas()
    {
        var curvas = _servico.ObterCurvasPesoPretermo("m")!;

        Assert.Equal(38, curvas.Count);
        Assert.Equal(27, curvas[0].Semanas);
        Assert.Equal(64, curvas[^1].Semanas);
    }

    [Fact]
    public void Curva_diaria_oms_tem_um_ponto_por_dia()
    {
        var curva = _servico.ObterCurvaDiaria(Medida.Estatura, 'm')!;

        Assert.Equal(1857, curva.Count);
        Assert.Equal(49.884, curva[0].Z0, 3);
        Assert.Equal(1856, curva[^1].Dia);
    }
}

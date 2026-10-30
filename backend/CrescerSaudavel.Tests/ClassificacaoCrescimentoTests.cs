using CrescerSaudavel.Api.Services.Crescimento;
using Xunit;

namespace CrescerSaudavel.Tests;

public class ClassificacaoCrescimentoTests
{
    [Theory]
    [InlineData(-3.01, "PesoMuitoBaixo")]
    [InlineData(-3.0, "PesoBaixo")]
    [InlineData(-2.01, "PesoBaixo")]
    [InlineData(-2.0, "PesoVigilanciaBaixo")]
    [InlineData(-1.01, "PesoVigilanciaBaixo")]
    [InlineData(-1.0, "PesoAdequado")]
    [InlineData(0.0, "PesoAdequado")]
    [InlineData(1.0, "PesoAdequado")]
    [InlineData(1.01, "PesoVigilanciaElevado")]
    [InlineData(2.0, "PesoVigilanciaElevado")]
    [InlineData(2.01, "PesoElevado")]
    [InlineData(3.5, "PesoElevado")]
    public void Peso_para_idade_segue_a_tabela_de_interpretacao(double z, string codigoEsperado)
    {
        var classificacao = ClassificacaoCrescimento.Classificar(Indicador.PesoIdade, (decimal)z);

        Assert.Equal(codigoEsperado, classificacao!.Codigo);
        Assert.Equal(Indicador.PesoIdade, classificacao.Indicador);
    }

    [Theory]
    [InlineData(-3.01, "EstaturaMuitoBaixa")]
    [InlineData(-3.0, "EstaturaBaixa")]
    [InlineData(-2.01, "EstaturaBaixa")]
    [InlineData(-2.0, "EstaturaAdequada")]
    [InlineData(0.0, "EstaturaAdequada")]
    [InlineData(3.5, "EstaturaAdequada")]
    public void Estatura_para_idade_so_classifica_a_parte_inferior(double z, string codigoEsperado)
    {
        Assert.Equal(codigoEsperado, ClassificacaoCrescimento.Classificar(Indicador.EstaturaIdade, (decimal)z)!.Codigo);
    }

    [Theory]
    [InlineData(-2.01, "PerimetroCefalicoAbaixo")]
    [InlineData(-2.0, "PerimetroCefalicoAdequado")]
    [InlineData(2.0, "PerimetroCefalicoAdequado")]
    [InlineData(2.01, "PerimetroCefalicoAcima")]
    public void Perimetro_cefalico_usa_o_corte_de_dois_desvios(double z, string codigoEsperado)
    {
        Assert.Equal(codigoEsperado, ClassificacaoCrescimento.Classificar(Indicador.PerimetroCefalicoIdade, (decimal)z)!.Codigo);
    }

    [Fact]
    public void Sem_z_nao_ha_classificacao()
    {
        Assert.Null(ClassificacaoCrescimento.Classificar(Indicador.PesoIdade, null));
        Assert.Null(ClassificacaoCrescimento.PorCodigo(null));
        Assert.Null(ClassificacaoCrescimento.PorCodigo("Inexistente"));
    }

    [Theory]
    [InlineData(-3.01, "MagrezaAcentuada")]
    [InlineData(-3.0, "Magreza")]
    [InlineData(-2.01, "Magreza")]
    [InlineData(-2.0, "Eutrofia")]
    [InlineData(1.0, "Eutrofia")]
    [InlineData(1.01, "RiscoSobrepeso")]
    [InlineData(2.0, "RiscoSobrepeso")]
    [InlineData(2.01, "Sobrepeso")]
    [InlineData(3.0, "Sobrepeso")]
    [InlineData(3.01, "Obesidade")]
    public void Imc_e_peso_estatura_seguem_a_tabela_de_estado_nutricional(double z, string faixa)
    {
        Assert.Equal($"Imc{faixa}", ClassificacaoCrescimento.Classificar(Indicador.ImcIdade, (decimal)z)!.Codigo);
        Assert.Equal($"PesoEstatura{faixa}", ClassificacaoCrescimento.Classificar(Indicador.PesoEstatura, (decimal)z)!.Codigo);
    }

    [Fact]
    public void Niveis_de_cuidado_sao_os_extremos_de_cada_indicador()
    {
        Assert.Equal(
            [
                "PesoMuitoBaixo", "PesoBaixo", "PesoElevado", "EstaturaMuitoBaixa", "EstaturaBaixa",
                "PerimetroCefalicoAbaixo", "PerimetroCefalicoAcima",
                "ImcMagrezaAcentuada", "ImcMagreza", "ImcSobrepeso", "ImcObesidade",
                "PesoEstaturaMagrezaAcentuada", "PesoEstaturaMagreza", "PesoEstaturaSobrepeso", "PesoEstaturaObesidade"
            ],
            ClassificacaoCrescimento.CodigosCuidado);

        Assert.True(ClassificacaoCrescimento.EhCuidado("PesoBaixo"));
        Assert.False(ClassificacaoCrescimento.EhCuidado("PesoVigilanciaBaixo"));
        Assert.False(ClassificacaoCrescimento.EhCuidado(null));
    }

    [Fact]
    public void Tabela_tem_codigos_unicos_e_recupera_por_codigo()
    {
        Assert.Equal(ClassificacaoCrescimento.Tabela.Count, ClassificacaoCrescimento.Tabela.Select(c => c.Codigo).Distinct().Count());

        var adequado = ClassificacaoCrescimento.PorCodigo("PesoAdequado");
        Assert.Equal(NivelClassificacao.Otimo, adequado!.Nivel);
        Assert.Equal("Peso adequado para a idade", adequado.Rotulo);
    }
}

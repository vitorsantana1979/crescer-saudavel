using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Crescimento;
using Xunit;

namespace CrescerSaudavel.Tests;

public class TamanhoNascimentoServiceTests
{
    private readonly TamanhoNascimentoService _servico = Referencias.Nascimento;

    [Theory]
    [InlineData(Medida.Peso, 'm', 40 * 7, 3.38, 0.00)]            // mediana, meninos 40+0
    [InlineData(Medida.Peso, 'm', 40 * 7, 2.58, -2.00)]           // linha z −2
    [InlineData(Medida.Peso, 'm', 26 * 7, 0.83, 0.00)]            // muito pré-termo, 26+0
    [InlineData(Medida.PerimetroCefalico, 'f', 40 * 7, 37.5, 3.00)]
    [InlineData(Medida.Estatura, 'm', 33 * 7, 39.4, -2.00)]       // primeiro dia do padrão (33+0)
    public void Reproduz_as_linhas_z_publicadas(Medida medida, char sexo, int ig, double valor, double zEsperado)
    {
        var avaliacao = _servico.Avaliar(medida, sexo, ig, valor);

        Assert.NotNull(avaliacao);
        Assert.Equal((decimal)zEsperado, avaliacao!.Z);
    }

    [Fact]
    public void Centil_10_publicado_cai_exatamente_no_percentil_10_e_e_aig()
    {
        // meninos 40+0: P10 = 2,88 kg (tabela de centis)
        var noP10 = _servico.Avaliar(Medida.Peso, 'm', 280, 2.88)!;
        var abaixo = _servico.Avaliar(Medida.Peso, 'm', 280, 2.87)!;

        Assert.Equal(-1.28m, noP10.Z);
        Assert.Equal(10.0m, noP10.Percentil);
        Assert.Equal("AIG", noP10.Adequacao);
        Assert.Equal("PIG", abaixo.Adequacao);
    }

    [Fact]
    public void Acima_do_centil_90_e_gig()
    {
        // meninas 40+0: P90 = 3,80 kg
        Assert.Equal("AIG", _servico.Avaliar(Medida.Peso, 'f', 280, 3.80)!.Adequacao);
        Assert.Equal("GIG", _servico.Avaliar(Medida.Peso, 'f', 280, 3.81)!.Adequacao);
    }

    [Fact]
    public void Muito_pre_termo_usa_a_referencia_e_termo_usa_o_padrao()
    {
        Assert.False(_servico.Avaliar(Medida.Peso, 'm', 32 * 7 + 6, 1.8)!.Padrao);
        Assert.True(_servico.Avaliar(Medida.Peso, 'm', 33 * 7, 1.9)!.Padrao);
    }

    [Theory]
    [InlineData(24 * 7 - 1)]
    [InlineData(43 * 7)]
    public void Fora_de_24_a_42_semanas_e_6_dias_nao_avalia(int ig)
    {
        Assert.Null(_servico.Avaliar(Medida.Peso, 'm', ig, 2.0));
    }

    [Fact]
    public void Extrapola_alem_de_menos_3()
    {
        var z = _servico.Avaliar(Medida.Peso, 'm', 280, 1.8)!.Z;

        Assert.True(z < -3m);
        Assert.Equal("PIG", _servico.Avaliar(Medida.Peso, 'm', 280, 1.8)!.Adequacao);
    }

    [Fact]
    public void Aplicar_grava_z_das_tres_medidas_e_adequacao_do_peso()
    {
        var rn = new RecemNascido
        {
            Sexo = 'F',
            DataNascimento = new DateTime(2026, 1, 1),
            IdadeGestacionalSemanas = 40,
            IdadeGestacionalDias = 0,
            PesoNascimentoGr = 2700,
            ComprimentoCm = 49m,
            PerimetroCefalicoCm = 33.8m
        };

        _servico.Aplicar(rn);

        Assert.Equal("PIG", rn.AdequacaoPesoNascimento);   // P10 meninas 40+0 = 2,78 kg
        Assert.True(rn.ZNascimentoPeso < -1.28m);
        Assert.NotNull(rn.ZNascimentoComprimento);
        Assert.Equal(0m, rn.ZNascimentoPerimetro);
    }

    [Fact]
    public void Aplicar_limpa_os_campos_quando_a_ig_sai_da_faixa()
    {
        var rn = new RecemNascido
        {
            Sexo = 'M',
            IdadeGestacionalSemanas = 23,
            IdadeGestacionalDias = 5,
            PesoNascimentoGr = 600,
            ZNascimentoPeso = 1m,
            AdequacaoPesoNascimento = "AIG"
        };

        _servico.Aplicar(rn);

        Assert.Null(rn.ZNascimentoPeso);
        Assert.Null(rn.AdequacaoPesoNascimento);
    }

    [Theory]
    [InlineData(0, 50.0)]
    [InlineData(-1.2815515655446004, 10.0)]
    [InlineData(1.6448536269514729, 95.0)]
    [InlineData(-3, 0.135)]
    [InlineData(3.5, 99.977)]
    public void Percentil_da_normal_padrao(double z, double esperado)
    {
        Assert.Equal(esperado, Percentil.DeZ(z), 3);
    }
}

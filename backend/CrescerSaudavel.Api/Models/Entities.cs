using Microsoft.AspNetCore.Identity;

namespace CrescerSaudavel.Api.Models;

public class ProfissionalSaude : IdentityUser<Guid>
{
    public Guid TenantId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Conselho { get; set; } = string.Empty;
    public string RegistroConselho { get; set; } = string.Empty;
    public string Especialidade { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}

public class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = "hospital";
    public int IdadePreTermoLimite { get; set; } = 37;
    public bool Ativo { get; set; } = true;
}

public class RecemNascido
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public char Sexo { get; set; }
    public DateTime DataNascimento { get; set; }
    public decimal IdadeGestacionalSemanas { get; set; }
    public int? PesoNascimentoGr { get; set; }
    public decimal? ComprimentoCm { get; set; }
    public decimal? PerimetroCefalicoCm { get; set; }
    public ICollection<Consulta> Consultas { get; set; } = new List<Consulta>();
}

public class Consulta
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecemNascidoId { get; set; }
    public DateTime DataHora { get; set; }
    public decimal PesoKg { get; set; }
    public decimal EstaturaCm { get; set; }
    public decimal PerimetroCefalicoCm { get; set; }
    public decimal? ZScorePeso { get; set; }
    public decimal? ZScoreAltura { get; set; }
    public decimal? ZScorePerimetro { get; set; }
}

public class Alimento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Categoria { get; set; } = "leite";
    public string Unidade { get; set; } = "ml";
    public double EnergiaKcalPor100 { get; set; }
    public double ProteinaGPor100 { get; set; }
    public bool Ativo { get; set; } = true;
}

public class Dieta
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecemNascidoId { get; set; }
    public DateTime DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public ICollection<DietaItem> Itens { get; set; } = new List<DietaItem>();
}

public class DietaItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DietaId { get; set; }
    public Guid AlimentoId { get; set; }
    public decimal Quantidade { get; set; }
    public decimal? EnergiaTotalKcal { get; set; }
    public decimal? ProteinaTotalG { get; set; }
}

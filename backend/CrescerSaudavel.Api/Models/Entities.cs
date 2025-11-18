using Microsoft.AspNetCore.Identity;

namespace CrescerSaudavel.Api.Models;

public abstract class EntidadeAuditavel
{
    public DateTimeOffset CriadoEm { get; set; }
    public Guid? CriadoPorUserId { get; set; }
    public DateTimeOffset? AtualizadoEm { get; set; }
    public Guid? AtualizadoPorUserId { get; set; }
}

public class TipoConselho
{
    public int Id { get; set; }
    public string Sigla { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string TipoProfissional { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
}

public class GrupoSaude : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = "Secretaria de Saúde";
    public string? Cnpj { get; set; }
    public string? Telefone { get; set; }
    public string? Endereco { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string? Cep { get; set; }
    public bool Ativo { get; set; } = true;

    public ICollection<Tenant> Unidades { get; set; } = new List<Tenant>();
}

public class ProfissionalSaude : IdentityUser<Guid>
{
    public Guid? GrupoSaudeId { get; set; }
    public GrupoSaude? GrupoSaude { get; set; }
    public Guid? TenantId { get; set; }
    public Tenant? TenantAtual { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int TipoConselhoId { get; set; }
    public TipoConselho? TipoConselho { get; set; }
    public string NumeroRegistro { get; set; } = string.Empty;
    public string? Especialidade { get; set; }
    public bool Ativo { get; set; } = true;
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<ProfissionalSaudeUnidade> UnidadesPermitidas { get; set; } = new List<ProfissionalSaudeUnidade>();
}

public class ProfissionalSaudeUnidade : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProfissionalSaudeId { get; set; }
    public ProfissionalSaude? ProfissionalSaude { get; set; }
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public bool Principal { get; set; } = false;
}

public class Tenant : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GrupoSaudeId { get; set; }
    public GrupoSaude? GrupoSaude { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = "hospital";
    public string? TipoUnidade { get; set; }
    public string? Cnpj { get; set; }
    public string? Telefone { get; set; }
    public string? Endereco { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string? Cep { get; set; }
    public int IdadePreTermoLimite { get; set; } = 37;
    public bool Ativo { get; set; } = true;
    public ICollection<ProfissionalSaudeUnidade> Profissionais { get; set; } = new List<ProfissionalSaudeUnidade>();
}

public class RecemNascido : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public string Nome { get; set; } = string.Empty;
    public char Sexo { get; set; }
    public DateTime DataNascimento { get; set; }
    public decimal IdadeGestacionalSemanas { get; set; }
    public int? IdadeGestacionalDias { get; set; } // 0-6 dias
    public decimal? IdadeGestacionalCorrigidaSemanas { get; set; }
    public int? IdadeGestacionalCorrigidaDias { get; set; } // 0-6 dias
    
    // Classificação segundo a Idade Gestacional
    public string? ClassificacaoIG { get; set; } // RNPTE, RNPTM, RNPTT, RNPT, RNT, RNP
    
    public string? TipoParto { get; set; } // "Cesáreo", "Normal", "Fórceps", etc.
    public int? Apgar1Minuto { get; set; } // 0-10
    public int? Apgar5Minuto { get; set; } // 0-10
    public int? PesoNascimentoGr { get; set; }
    
    // Classificação segundo o Peso ao Nascer
    public string? ClassificacaoPN { get; set; } // Macrossomia, Adequado, Insuficiente, Baixo, Muito Baixo, Extremo Baixo
    
    public decimal? ComprimentoCm { get; set; }
    public decimal? PerimetroCefalicoCm { get; set; }
    public ICollection<Consulta> Consultas { get; set; } = new List<Consulta>();
}

public class Consulta : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecemNascidoId { get; set; }
    public RecemNascido? RecemNascido { get; set; }
    public DateTime DataHora { get; set; }
    public decimal PesoKg { get; set; }
    public decimal EstaturaCm { get; set; }
    public decimal PerimetroCefalicoCm { get; set; }
    public decimal? ZScorePeso { get; set; }
    public decimal? ZScoreAltura { get; set; }
    public decimal? ZScorePerimetro { get; set; }
}

public class Alimento : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Categoria { get; set; } = "leite";
    public string Unidade { get; set; } = "ml";
    public double EnergiaKcalPor100 { get; set; }
    public double ProteinaGPor100 { get; set; }
    public int? IdadeMinimaSemanas { get; set; }
    public int? IdadeMaximaSemanas { get; set; }
    public bool EhPreTermo { get; set; } = false;
    public bool Excluido { get; set; } = false;
    public bool Ativo { get; set; } = true;
}

public class Dieta : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecemNascidoId { get; set; }
    public RecemNascido? RecemNascido { get; set; }
    public DateTime DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public double FrequenciaHoras { get; set; } = 3;
    public ICollection<DietaItem> Itens { get; set; } = new List<DietaItem>();
}

public class DietaItem : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DietaId { get; set; }
    public Dieta? Dieta { get; set; }
    public Guid AlimentoId { get; set; }
    public Alimento? Alimento { get; set; }
    public decimal Quantidade { get; set; }
    public decimal? EnergiaTotalKcal { get; set; }
    public decimal? ProteinaTotalG { get; set; }
}

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
    public TimeSpan? HoraNascimento { get; set; }
    public decimal IdadeGestacionalSemanas { get; set; }
    public int? IdadeGestacionalDias { get; set; } // 0-6 dias
    public string? MetodoIG { get; set; } // DUM, USG ou ExameRN (Caderneta p. 69)
    public DateTime? DataUltimaMenstruacao { get; set; }
    public DateTime? DataProvavelParto { get; set; }
    // Legado: IGC digitada no cadastro; a idade corrigida é sempre calculada (ReferenciaCrescimentoService)
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

    // Tamanho ao nascer pela INTERGROWTH-21st (24+0 a 42+6 semanas), calculado pelo TamanhoNascimentoService
    public decimal? ZNascimentoPeso { get; set; }
    public decimal? ZNascimentoComprimento { get; set; }
    public decimal? ZNascimentoPerimetro { get; set; }
    public string? AdequacaoPesoNascimento { get; set; } // PIG (< P10), AIG, GIG (> P90)
    
    // Dados demográficos expandidos para conformidade com PDQ (IHE PDQV3)
    public string? NomeMae { get; set; }
    public string? NomePai { get; set; }
    public string? EnderecoLogradouro { get; set; }
    public string? EnderecoNumero { get; set; }
    public string? EnderecoComplemento { get; set; }
    public string? EnderecoBairro { get; set; }
    public string? EnderecoCidade { get; set; }
    public string? EnderecoUf { get; set; }
    public string? EnderecoCep { get; set; }
    public string? Telefone { get; set; }
    public string? TelefoneCelular { get; set; }
    public string? Email { get; set; }
    
    // Relacionamentos
    public ICollection<Consulta> Consultas { get; set; } = new List<Consulta>();
    public ICollection<PacienteIdentificador> Identificadores { get; set; } = new List<PacienteIdentificador>();
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
    
    // Dados de pesquisa (Comparação Manual vs Automático)
    public string? ClassificacaoManualEquipe { get; set; }
    public decimal? ZScoreManualEquipe { get; set; }
    
    // Alertas automatizados para pesquisa e acompanhamento
    public bool AlertaQuedaPonderal { get; set; } = false; // Queda > 0.5 SD
    public bool AlertaRCEU { get; set; } = false; // ZScore <= -1.28
    
    // Velocidade de Ganho Ponderal (g/kg/dia) - Método Exponencial de Patel et al. (2005)
    // VGP = 1000 × ln(P2/P1) / (D2 - D1)
    public decimal? VelocidadeGanhoPonderal { get; set; }

    // Rastreabilidade do cálculo dos z-scores
    public string? ReferenciaCurva { get; set; } // "OMS" | "INTERGROWTH"; null quando sem referência aplicável
    public int? IdadeCalculoDias { get; set; } // idade usada no cálculo, em dias
    public string? TipoIdadeCalculo { get; set; } // "Cronologica" | "PosMenstrual" | "Corrigida"

    // Classificação por z-score de cada indicador (códigos de ClassificacaoCrescimento.Tabela)
    public string? ClassificacaoPeso { get; set; }
    public string? ClassificacaoEstatura { get; set; }
    public string? ClassificacaoPerimetro { get; set; }

    // Posição da medida de comprimento/estatura ("Deitado" ou "EmPe"); null = esperada para a idade
    public string? PosicaoMedida { get; set; }
    // Estado nutricional (OMS): IMC = peso / estatura² com a estatura corrigida pela posição
    public decimal? Imc { get; set; }
    public decimal? ZScoreImc { get; set; }
    public decimal? ZScorePesoEstatura { get; set; } // peso para comprimento (< 2 anos) ou para estatura
    public string? ClassificacaoImc { get; set; }
    public string? ClassificacaoPesoEstatura { get; set; }
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
    
    // Parâmetros nutricionais definidos pelo profissional de saúde
    /// <summary>
    /// Taxa de conversão energética em kcal/kg/dia (ex: 110, 120, 130, 140)
    /// </summary>
    public double? TaxaEnergeticaKcalKg { get; set; }
    
    /// <summary>
    /// Meta de proteína em g/kg/dia (ex: 2.5, 3.0, 3.5, 4.0)
    /// </summary>
    public double? MetaProteinaGKg { get; set; }
    
    /// <summary>
    /// Peso de referência usado para cálculo das necessidades (em kg)
    /// </summary>
    public double? PesoReferenciaKg { get; set; }
    
    /// <summary>
    /// Via de administração: Oral, Enteral (Sonda), NPT, Mista
    /// </summary>
    public string? ViaAdministracao { get; set; }
    
    /// <summary>
    /// Observações do profissional sobre a dietoterapia
    /// </summary>
    public string? Observacoes { get; set; }
    
    public ICollection<DietaItem> Itens { get; set; } = new List<DietaItem>();
}

public class DietaItem : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DietaId { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public Dieta? Dieta { get; set; }
    public Guid AlimentoId { get; set; }
    public Alimento? Alimento { get; set; }
    public decimal Quantidade { get; set; }
    public decimal? EnergiaTotalKcal { get; set; }
    public decimal? ProteinaTotalG { get; set; }
}

/// <summary>
/// Armazena múltiplos identificadores de um paciente para conformidade com IHE PIX.
/// Permite correlacionar informações de um mesmo paciente entre múltiplas aplicações.
/// </summary>
public class PacienteIdentificador : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecemNascidoId { get; set; }
    public RecemNascido? RecemNascido { get; set; }
    
    /// <summary>
    /// Tipo do identificador conforme padrão IHE PIX.
    /// Valores possíveis: CNS, ID_LOCAL, ID_PLANO, ID_HOSPITAL, ID_EXTERNO
    /// </summary>
    public string TipoIdentificador { get; set; } = string.Empty;
    
    /// <summary>
    /// Valor do identificador (ex: número do CNS, GUID interno, etc.)
    /// </summary>
    public string Valor { get; set; } = string.Empty;
    
    /// <summary>
    /// Sistema emissor/origem do identificador (ex: "CadSUS", "CrescerSaudavel", "Hospital X")
    /// </summary>
    public string SistemaEmissor { get; set; } = string.Empty;
    
    /// <summary>
    /// Indica se este é o identificador principal/preferencial para o paciente
    /// </summary>
    public bool Principal { get; set; } = false;
    
    /// <summary>
    /// Indica se o identificador está ativo
    /// </summary>
    public bool Ativo { get; set; } = true;
    
    /// <summary>
    /// Data de expiração do identificador (se aplicável)
    /// </summary>
    public DateTime? DataExpiracao { get; set; }
    
    /// <summary>
    /// Observações sobre o identificador
    /// </summary>
    public string? Observacoes { get; set; }
}

/// <summary>
/// Registra auditoria de acesso a dados de pacientes para conformidade com LGPD e Portaria 2.073/2011.
/// </summary>
public class AuditoriaAcessoPaciente : EntidadeAuditavel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecemNascidoId { get; set; }
    public RecemNascido? RecemNascido { get; set; }
    public Guid UsuarioId { get; set; }
    public ProfissionalSaude? Usuario { get; set; }
    
    /// <summary>
    /// Tipo de operação: Leitura, Criacao, Atualizacao, Exclusao, ConsultaPDQ, ConsultaPIX
    /// </summary>
    public string TipoOperacao { get; set; } = string.Empty;
    
    /// <summary>
    /// Endpoint/rota acessada
    /// </summary>
    public string? Endpoint { get; set; }
    
    /// <summary>
    /// IP de origem da requisição
    /// </summary>
    public string? IpOrigem { get; set; }
    
    /// <summary>
    /// User-Agent do cliente
    /// </summary>
    public string? UserAgent { get; set; }
    
    /// <summary>
    /// Resumo dos dados acessados (sem dados sensíveis completos)
    /// </summary>
    public string? ResumoDadosAcessados { get; set; }
    
    /// <summary>
    /// Indica se a operação foi bem-sucedida
    /// </summary>
    public bool Sucesso { get; set; } = true;
    
    /// <summary>
    /// Mensagem de erro (se houver)
    /// </summary>
    public string? MensagemErro { get; set; }
}

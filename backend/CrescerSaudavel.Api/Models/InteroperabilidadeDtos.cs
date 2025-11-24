namespace CrescerSaudavel.Api.Models;

/// <summary>
/// DTOs para interoperabilidade com padrões IHE PIX/PDQ baseados em HL7 v3
/// </summary>

/// <summary>
/// Dados demográficos de paciente para consulta PDQ (Patient Demographics Query)
/// </summary>
public class PdqQueryRequest
{
    public string? Nome { get; set; }
    public string? NomeMae { get; set; }
    public DateTime? DataNascimento { get; set; }
    public char? Sexo { get; set; }
    public string? Cns { get; set; }
    public string? Municipio { get; set; }
    public string? Uf { get; set; }
    public string? Cep { get; set; }
}

/// <summary>
/// Resultado de uma consulta PDQ - lista de possíveis pacientes encontrados
/// </summary>
public class PdqQueryResponse
{
    public List<PdqPatientMatch> Pacientes { get; set; } = new();
    public int TotalEncontrados { get; set; }
    public bool Sucesso { get; set; }
    public string? MensagemErro { get; set; }
}

/// <summary>
/// Paciente encontrado em uma consulta PDQ
/// </summary>
public class PdqPatientMatch
{
    public string? Cns { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? NomeMae { get; set; }
    public DateTime DataNascimento { get; set; }
    public char Sexo { get; set; }
    public string? Municipio { get; set; }
    public string? Uf { get; set; }
    public decimal? ScoreConfianca { get; set; } // 0-100, indica quão provável é que seja o mesmo paciente
}

/// <summary>
/// Requisição para registrar/atualizar correlação de identificadores via PIX
/// </summary>
public class PixRegisterRequest
{
    /// <summary>
    /// Identificador local do paciente no sistema Crescer Saudável
    /// </summary>
    public Guid IdLocal { get; set; }
    
    /// <summary>
    /// CNS (Cartão Nacional de Saúde) - identificador principal nacional
    /// </summary>
    public string? Cns { get; set; }
    
    /// <summary>
    /// Outros identificadores externos
    /// </summary>
    public List<PixIdentifier> IdentificadoresExternos { get; set; } = new();
    
    /// <summary>
    /// Dados demográficos do paciente para validação
    /// </summary>
    public PdqQueryRequest? DadosDemograficos { get; set; }
}

/// <summary>
/// Identificador externo para registro no PIX
/// </summary>
public class PixIdentifier
{
    public string Tipo { get; set; } = string.Empty; // ID_PLANO, ID_HOSPITAL, ID_EXTERNO
    public string Valor { get; set; } = string.Empty;
    public string SistemaEmissor { get; set; } = string.Empty;
}

/// <summary>
/// Resposta de registro/atualização PIX
/// </summary>
public class PixRegisterResponse
{
    public bool Sucesso { get; set; }
    public string? MensagemErro { get; set; }
    public List<PixIdentifierCorrelation> Correlacoes { get; set; } = new();
}

/// <summary>
/// Correlação de identificadores retornada pelo PIX
/// </summary>
public class PixIdentifierCorrelation
{
    public string TipoIdentificador { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
    public string SistemaEmissor { get; set; } = string.Empty;
    public bool Principal { get; set; }
}

/// <summary>
/// Requisição para consultar correlações de identificadores via PIX
/// </summary>
public class PixQueryRequest
{
    /// <summary>
    /// Identificador conhecido (pode ser CNS, ID_LOCAL, ou outro)
    /// </summary>
    public string Identificador { get; set; } = string.Empty;
    
    /// <summary>
    /// Tipo do identificador fornecido
    /// </summary>
    public string TipoIdentificador { get; set; } = string.Empty;
}

/// <summary>
/// Resposta de consulta PIX com todas as correlações de identificadores
/// </summary>
public class PixQueryResponse
{
    public bool Sucesso { get; set; }
    public string? MensagemErro { get; set; }
    public List<PixIdentifierCorrelation> IdentificadoresCorrelacionados { get; set; } = new();
}



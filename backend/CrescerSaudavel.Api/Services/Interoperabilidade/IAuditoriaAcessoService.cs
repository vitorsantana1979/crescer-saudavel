namespace CrescerSaudavel.Api.Services.Interoperabilidade;

/// <summary>
/// Serviço para registrar auditoria de acesso a dados de pacientes (conformidade LGPD e Portaria 2.073/2011)
/// </summary>
public interface IAuditoriaAcessoService
{
    /// <summary>
    /// Registra um acesso a dados de paciente
    /// </summary>
    Task RegistrarAcessoAsync(
        Guid pacienteId,
        string tipoOperacao,
        string? endpoint = null,
        string? ipOrigem = null,
        string? userAgent = null,
        string? resumoDadosAcessados = null,
        bool sucesso = true,
        string? mensagemErro = null,
        CancellationToken cancellationToken = default);
}



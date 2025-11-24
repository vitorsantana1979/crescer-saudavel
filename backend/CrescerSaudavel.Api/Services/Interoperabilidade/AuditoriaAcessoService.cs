using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Time;

namespace CrescerSaudavel.Api.Services.Interoperabilidade;

/// <summary>
/// Implementação do serviço de auditoria de acesso a pacientes
/// </summary>
public class AuditoriaAcessoService : IAuditoriaAcessoService
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AuditoriaAcessoService> _logger;

    public AuditoriaAcessoService(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService,
        ILogger<AuditoriaAcessoService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task RegistrarAcessoAsync(
        Guid pacienteId,
        string tipoOperacao,
        string? endpoint = null,
        string? ipOrigem = null,
        string? userAgent = null,
        string? resumoDadosAcessados = null,
        bool sucesso = true,
        string? mensagemErro = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var auditoria = new AuditoriaAcessoPaciente
            {
                RecemNascidoId = pacienteId,
                UsuarioId = _currentUserService.UserId ?? Guid.Empty,
                TipoOperacao = tipoOperacao,
                Endpoint = endpoint,
                IpOrigem = ipOrigem,
                UserAgent = userAgent,
                ResumoDadosAcessados = resumoDadosAcessados,
                Sucesso = sucesso,
                MensagemErro = mensagemErro,
                CriadoEm = DateTimeOffset.UtcNow
            };

            _context.AuditoriaAcessoPacientes.Add(auditoria);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Auditoria registrada: {TipoOperacao} para paciente {PacienteId} por usuário {UsuarioId}",
                tipoOperacao,
                pacienteId,
                _currentUserService.UserId);
        }
        catch (Exception ex)
        {
            // Não falhar a operação principal se a auditoria falhar, mas registrar no log
            _logger.LogError(ex, 
                "Erro ao registrar auditoria de acesso para paciente {PacienteId}",
                pacienteId);
        }
    }
}



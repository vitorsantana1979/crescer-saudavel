using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Interoperabilidade;

/// <summary>
/// Interface para serviço PIX (Patient Identifier Cross-referencing) conforme padrão IHE PIXV3.
/// Permite registrar e consultar correlações de identificadores de pacientes entre múltiplas aplicações.
/// </summary>
public interface IPixService
{
    /// <summary>
    /// Registra ou atualiza correlações de identificadores de um paciente.
    /// Quando a integração real com SOA-SUS estiver disponível, este método fará chamadas ao barramento.
    /// </summary>
    Task<PixRegisterResponse> RegistrarIdentificadoresAsync(PixRegisterRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Consulta todas as correlações de identificadores de um paciente a partir de um identificador conhecido.
    /// </summary>
    Task<PixQueryResponse> ConsultarIdentificadoresAsync(PixQueryRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Verifica se o serviço PIX está habilitado e disponível.
    /// </summary>
    bool EstaHabilitado();
}



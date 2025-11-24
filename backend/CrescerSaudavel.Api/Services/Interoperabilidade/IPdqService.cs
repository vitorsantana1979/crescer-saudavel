using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Interoperabilidade;

/// <summary>
/// Interface para serviço PDQ (Patient Demographics Query) conforme padrão IHE PDQV3.
/// Permite consultar dados demográficos de pacientes em um servidor central (CadSUS).
/// </summary>
public interface IPdqService
{
    /// <summary>
    /// Consulta pacientes por dados demográficos.
    /// Retorna uma lista de possíveis pacientes que correspondem aos critérios de busca.
    /// Quando a integração real com SOA-SUS estiver disponível, este método fará chamadas ao barramento.
    /// </summary>
    Task<PdqQueryResponse> ConsultarPacientesAsync(PdqQueryRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Consulta paciente específico por CNS (Cartão Nacional de Saúde).
    /// </summary>
    Task<PdqPatientMatch?> ConsultarPorCnsAsync(string cns, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Verifica se o serviço PDQ está habilitado e disponível.
    /// </summary>
    bool EstaHabilitado();
}



using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Location;

public interface ILocationService
{
    Task<CepInfoDto?> BuscarCepAsync(string cep, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<EstadoDto>> ObterEstadosAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<MunicipioDto>> ObterMunicipiosPorEstadoAsync(string uf, CancellationToken cancellationToken = default);
}

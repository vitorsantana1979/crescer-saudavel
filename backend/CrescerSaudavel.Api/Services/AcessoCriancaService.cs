using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Models.ML;
using CrescerSaudavel.Api.Services.Time;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Services;

// O ml-service enxerga todas as unidades: quem o chama limita o acesso às unidades do usuário.
public class AcessoCriancaService
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public AcessoCriancaService(CrescerSaudavelDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public IQueryable<RecemNascido> CriancasAcessiveis()
    {
        var tenantIds = _currentUserService.TenantIds.ToList();
        return _context.RecemNascidos.Where(r => tenantIds.Contains(r.TenantId));
    }

    public Task<bool> PodeAcessarAsync(Guid criancaId, CancellationToken cancellationToken = default) =>
        CriancasAcessiveis().AnyAsync(r => r.Id == criancaId, cancellationToken);

    public async Task<List<SimilarCase>> ManterAcessiveisAsync(
        IReadOnlyCollection<SimilarCase> casos,
        CancellationToken cancellationToken = default)
    {
        var ids = casos.Select(c => c.CriancaId).Distinct().ToList();
        var acessiveis = await CriancasAcessiveis()
            .Where(r => ids.Contains(r.Id))
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        return casos.Where(c => acessiveis.Contains(c.CriancaId)).ToList();
    }
}

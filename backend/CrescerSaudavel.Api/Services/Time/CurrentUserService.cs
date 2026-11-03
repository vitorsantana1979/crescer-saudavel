using System.Security.Claims;
using CrescerSaudavel.Api.Authorization;
using Microsoft.AspNetCore.Http;

namespace CrescerSaudavel.Api.Services.Time;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private const string TenantClaim = "tenant_id";
    private const string TenantsClaim = "tenant_ids";
    private const string GrupoClaim = "grupo_id";

    private IReadOnlyCollection<Guid>? _tenantIdsCache;

    public Guid? UserId => ParseGuidClaim(ClaimTypes.NameIdentifier) ?? ParseGuidClaim(ClaimTypes.Sid);

    public Guid? TenantId
    {
        get
        {
            var unidadeDoCabecalho = ObterUnidadeDoCabecalho();
            return unidadeDoCabecalho.HasValue && TenantIds.Contains(unidadeDoCabecalho.Value)
                ? unidadeDoCabecalho
                : ParseGuidClaim(TenantClaim);
        }
    }

    public Guid? GrupoSaudeId => ParseGuidClaim(GrupoClaim);

    public IReadOnlyCollection<Guid> TenantIds
    {
        get
        {
            if (_tenantIdsCache != null)
            {
                return _tenantIdsCache;
            }

            var claim = _httpContextAccessor.HttpContext?.User?.FindFirst(TenantsClaim);
            var ids = (claim?.Value ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => Guid.TryParse(value, out var id) ? id : (Guid?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToArray();

            if (ids.Length == 0)
            {
                // Só o SuperAdmin, que não tem unidades no token, escolhe a unidade pelo cabeçalho.
                var unidade = IsInRole(SystemRoles.SuperAdmin) ? ObterUnidadeDoCabecalho() : null;
                unidade ??= ParseGuidClaim(TenantClaim);
                ids = unidade.HasValue ? new[] { unidade.Value } : Array.Empty<Guid>();
            }

            _tenantIdsCache = ids;
            return _tenantIdsCache;
        }
    }

    public bool IsInRole(string role)
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        return principal?.IsInRole(role) ?? false;
    }

    private Guid? ObterUnidadeDoCabecalho()
    {
        var valor = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        return Guid.TryParse(valor, out var id) ? id : null;
    }

    private Guid? ParseGuidClaim(string claimType)
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        var claim = principal?.FindFirst(claimType);
        if (claim == null)
        {
            return null;
        }

        return Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}

using System.Security.Claims;
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
            var headerTenant = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(headerTenant) && Guid.TryParse(headerTenant, out var headerId))
            {
                return headerId;
            }

            return ParseGuidClaim(TenantClaim);
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

            var httpContext = _httpContextAccessor.HttpContext;

            var claim = httpContext?.User?.FindFirst(TenantsClaim);
            if (claim == null || string.IsNullOrWhiteSpace(claim.Value))
            {
                var headerTenant = httpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(headerTenant) && Guid.TryParse(headerTenant, out var headerId))
                {
                    _tenantIdsCache = new[] { headerId };
                }
                else
                {
                    _tenantIdsCache = TenantId.HasValue ? new[] { TenantId.Value } : Array.Empty<Guid>();
                }
                return _tenantIdsCache;
            }

            var ids = claim.Value
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => Guid.TryParse(value, out var id) ? id : (Guid?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToArray();

            _tenantIdsCache = ids.Length > 0 ? ids : (TenantId.HasValue ? new[] { TenantId.Value } : Array.Empty<Guid>());
            return _tenantIdsCache;
        }
    }

    public bool IsInRole(string role)
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        return principal?.IsInRole(role) ?? false;
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

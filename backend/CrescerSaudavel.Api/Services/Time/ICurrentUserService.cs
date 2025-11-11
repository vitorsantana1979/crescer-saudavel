namespace CrescerSaudavel.Api.Services.Time;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? TenantId { get; }
    Guid? GrupoSaudeId { get; }
    IReadOnlyCollection<Guid> TenantIds { get; }
    bool IsInRole(string role);
}

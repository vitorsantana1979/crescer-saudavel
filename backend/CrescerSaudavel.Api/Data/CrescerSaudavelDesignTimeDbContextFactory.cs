using CrescerSaudavel.Api.Services.Time;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CrescerSaudavel.Api.Data;

public class CrescerSaudavelDesignTimeDbContextFactory
    : IDesignTimeDbContextFactory<CrescerSaudavelDbContext>
{
    public CrescerSaudavelDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<CrescerSaudavelDbContext>();
        optionsBuilder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));

        return new CrescerSaudavelDbContext(
            optionsBuilder.Options,
            new DesignTimeCurrentUserService());
    }

    private sealed class DesignTimeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId => null;
        public Guid? TenantId => null;
        public Guid? GrupoSaudeId => null;
        public IReadOnlyCollection<Guid> TenantIds => Array.Empty<Guid>();
        public bool IsInRole(string role) => false;
    }
}

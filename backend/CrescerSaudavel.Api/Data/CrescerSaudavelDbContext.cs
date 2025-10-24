using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Data;

public class CrescerSaudavelDbContext
    : IdentityDbContext<ProfissionalSaude, Microsoft.AspNetCore.Identity.IdentityRole<Guid>, Guid>
{
    public CrescerSaudavelDbContext(DbContextOptions<CrescerSaudavelDbContext> options) : base(options) { }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<RecemNascido> RecemNascidos => Set<RecemNascido>();
    public DbSet<Consulta> Consultas => Set<Consulta>();
    public DbSet<Alimento> Alimentos => Set<Alimento>();
    public DbSet<Dieta> Dietas => Set<Dieta>();
    public DbSet<DietaItem> DietaItens => Set<DietaItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("core");
        modelBuilder.Entity<Tenant>().ToTable("Tenant", "core");
        modelBuilder.Entity<RecemNascido>().ToTable("RecemNascido", "clinica");
        modelBuilder.Entity<Consulta>().ToTable("Consulta", "clinica");
        modelBuilder.Entity<Alimento>().ToTable("Alimento", "nutricao");
        modelBuilder.Entity<Dieta>().ToTable("Dieta", "nutricao");
        modelBuilder.Entity<DietaItem>().ToTable("DietaItem", "nutricao");
    }
}

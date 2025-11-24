using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Time;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Data;

public class CrescerSaudavelDbContext
    : IdentityDbContext<ProfissionalSaude, Microsoft.AspNetCore.Identity.IdentityRole<Guid>, Guid>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly TimeZoneInfo _saoPauloTimeZone;

    public CrescerSaudavelDbContext(
        DbContextOptions<CrescerSaudavelDbContext> options,
        ICurrentUserService currentUserService) : base(options)
    {
        _currentUserService = currentUserService;
        _saoPauloTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    }

    public DbSet<TipoConselho> TiposConselho => Set<TipoConselho>();
    public DbSet<GrupoSaude> GruposSaude => Set<GrupoSaude>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<ProfissionalSaudeUnidade> ProfissionaisUnidades => Set<ProfissionalSaudeUnidade>();
    public DbSet<RecemNascido> RecemNascidos => Set<RecemNascido>();
    public DbSet<Consulta> Consultas => Set<Consulta>();
    public DbSet<Alimento> Alimentos => Set<Alimento>();
    public DbSet<Dieta> Dietas => Set<Dieta>();
    public DbSet<DietaItem> DietaItens => Set<DietaItem>();
    public DbSet<PacienteIdentificador> PacienteIdentificadores => Set<PacienteIdentificador>();
    public DbSet<AuditoriaAcessoPaciente> AuditoriaAcessoPacientes => Set<AuditoriaAcessoPaciente>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("core");

        modelBuilder.Entity<TipoConselho>().ToTable("TipoConselho", "core");
        modelBuilder.Entity<GrupoSaude>().ToTable("GrupoSaude", "core");
        modelBuilder.Entity<Tenant>().ToTable("Tenant", "core");
        modelBuilder.Entity<ProfissionalSaudeUnidade>().ToTable("ProfissionalSaudeUnidade", "core");
        modelBuilder.Entity<RecemNascido>().ToTable("RecemNascido", "clinica");
        modelBuilder.Entity<Consulta>().ToTable("Consulta", "clinica");
        modelBuilder.Entity<Alimento>().ToTable("Alimento", "nutricao");
        modelBuilder.Entity<Dieta>().ToTable("Dieta", "nutricao");
        modelBuilder.Entity<DietaItem>().ToTable("DietaItem", "nutricao");
        modelBuilder.Entity<PacienteIdentificador>().ToTable("PacienteIdentificador", "interoperabilidade");
        modelBuilder.Entity<AuditoriaAcessoPaciente>().ToTable("AuditoriaAcessoPaciente", "interoperabilidade");

        modelBuilder.Entity<GrupoSaude>()
            .HasMany(g => g.Unidades)
            .WithOne(u => u.GrupoSaude)
            .HasForeignKey(u => u.GrupoSaudeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Tenant>()
            .HasMany(t => t.Profissionais)
            .WithOne(p => p.Tenant)
            .HasForeignKey(p => p.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProfissionalSaude>()
            .HasMany(p => p.UnidadesPermitidas)
            .WithOne(u => u.ProfissionalSaude)
            .HasForeignKey(u => u.ProfissionalSaudeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProfissionalSaude>()
            .HasOne(p => p.TenantAtual)
            .WithMany()
            .HasForeignKey(p => p.TenantId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ProfissionalSaudeUnidade>()
            .HasIndex(p => new { p.ProfissionalSaudeId, p.TenantId })
            .IsUnique();

        modelBuilder.Entity<ProfissionalSaudeUnidade>()
            .Property(p => p.Principal)
            .HasDefaultValue(false);

        modelBuilder.Entity<RecemNascido>()
            .HasOne(r => r.Tenant)
            .WithMany()
            .HasForeignKey(r => r.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Consulta>()
            .HasOne(c => c.RecemNascido)
            .WithMany(r => r.Consultas)
            .HasForeignKey(c => c.RecemNascidoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Dieta>()
            .HasOne(d => d.RecemNascido)
            .WithMany()
            .HasForeignKey(d => d.RecemNascidoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DietaItem>()
            .HasOne(i => i.Dieta)
            .WithMany(d => d.Itens)
            .HasForeignKey(i => i.DietaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DietaItem>()
            .HasOne(i => i.Alimento)
            .WithMany()
            .HasForeignKey(i => i.AlimentoId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configurações de relacionamentos para interoperabilidade
        modelBuilder.Entity<RecemNascido>()
            .HasMany(r => r.Identificadores)
            .WithOne(i => i.RecemNascido)
            .HasForeignKey(i => i.RecemNascidoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PacienteIdentificador>()
            .HasIndex(i => new { i.RecemNascidoId, i.TipoIdentificador, i.Valor })
            .IsUnique();

        modelBuilder.Entity<PacienteIdentificador>()
            .HasIndex(i => new { i.TipoIdentificador, i.Valor })
            .HasFilter("[Ativo] = 1");

        modelBuilder.Entity<AuditoriaAcessoPaciente>()
            .HasOne(a => a.RecemNascido)
            .WithMany()
            .HasForeignKey(a => a.RecemNascidoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditoriaAcessoPaciente>()
            .HasOne(a => a.Usuario)
            .WithMany()
            .HasForeignKey(a => a.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditoriaAcessoPaciente>()
            .HasIndex(a => new { a.RecemNascidoId, a.CriadoEm });

        modelBuilder.Entity<AuditoriaAcessoPaciente>()
            .HasIndex(a => new { a.UsuarioId, a.CriadoEm });

        // Seed data: Tipos de Conselho
        modelBuilder.Entity<TipoConselho>().HasData(
            new TipoConselho { Id = 1, Sigla = "CRM", Nome = "Conselho Regional de Medicina", TipoProfissional = "Médico", Ativo = true },
            new TipoConselho { Id = 2, Sigla = "CRN", Nome = "Conselho Regional de Nutricionistas", TipoProfissional = "Nutricionista", Ativo = true },
            new TipoConselho { Id = 3, Sigla = "COREN", Nome = "Conselho Regional de Enfermagem", TipoProfissional = "Enfermeiro", Ativo = true },
            new TipoConselho { Id = 4, Sigla = "CREFITO", Nome = "Conselho Regional de Fisioterapia e Terapia Ocupacional", TipoProfissional = "Fisioterapeuta", Ativo = true },
            new TipoConselho { Id = 5, Sigla = "CRF", Nome = "Conselho Regional de Farmácia", TipoProfissional = "Farmacêutico", Ativo = true },
            new TipoConselho { Id = 6, Sigla = "CRP", Nome = "Conselho Regional de Psicologia", TipoProfissional = "Psicólogo", Ativo = true },
            new TipoConselho { Id = 7, Sigla = "CRFa", Nome = "Conselho Regional de Fonoaudiologia", TipoProfissional = "Fonoaudiólogo", Ativo = true }
        );

        ConfigurePrecisions(modelBuilder);
    }

    public override int SaveChanges()
    {
        AplicarAuditoria();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AplicarAuditoria();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void AplicarAuditoria()
    {
        var agora = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, _saoPauloTimeZone);
        var usuarioId = _currentUserService.UserId;

        foreach (var entry in ChangeTracker.Entries<EntidadeAuditavel>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CriadoEm = agora;
                entry.Entity.CriadoPorUserId = usuarioId;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.AtualizadoEm = agora;
                entry.Entity.AtualizadoPorUserId = usuarioId;
            }
        }
    }

    private static void ConfigurePrecisions(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RecemNascido>().Property(r => r.IdadeGestacionalSemanas).HasPrecision(5, 2);
        modelBuilder.Entity<RecemNascido>().Property(r => r.IdadeGestacionalCorrigidaSemanas).HasPrecision(5, 2);
        modelBuilder.Entity<RecemNascido>().Property(r => r.ComprimentoCm).HasPrecision(6, 2);
        modelBuilder.Entity<RecemNascido>().Property(r => r.PerimetroCefalicoCm).HasPrecision(6, 2);

        modelBuilder.Entity<Consulta>().Property(c => c.PesoKg).HasPrecision(6, 3);
        modelBuilder.Entity<Consulta>().Property(c => c.EstaturaCm).HasPrecision(6, 2);
        modelBuilder.Entity<Consulta>().Property(c => c.PerimetroCefalicoCm).HasPrecision(6, 2);
        modelBuilder.Entity<Consulta>().Property(c => c.ZScorePeso).HasPrecision(6, 3);
        modelBuilder.Entity<Consulta>().Property(c => c.ZScoreAltura).HasPrecision(6, 3);
        modelBuilder.Entity<Consulta>().Property(c => c.ZScorePerimetro).HasPrecision(6, 3);

        modelBuilder.Entity<DietaItem>().Property(i => i.Quantidade).HasPrecision(10, 3);
        modelBuilder.Entity<DietaItem>().Property(i => i.EnergiaTotalKcal).HasPrecision(10, 3);
        modelBuilder.Entity<DietaItem>().Property(i => i.ProteinaTotalG).HasPrecision(10, 3);
    }
}

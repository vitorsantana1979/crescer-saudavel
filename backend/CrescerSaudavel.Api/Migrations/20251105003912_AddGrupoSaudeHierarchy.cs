using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGrupoSaudeHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AtualizadoEm",
                schema: "core",
                table: "Tenant",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AtualizadoPorUserId",
                schema: "core",
                table: "Tenant",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cidade",
                schema: "core",
                table: "Tenant",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cnpj",
                schema: "core",
                table: "Tenant",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CriadoEm",
                schema: "core",
                table: "Tenant",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CriadoPorUserId",
                schema: "core",
                table: "Tenant",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Endereco",
                schema: "core",
                table: "Tenant",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Estado",
                schema: "core",
                table: "Tenant",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GrupoSaudeId",
                schema: "core",
                table: "Tenant",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Telefone",
                schema: "core",
                table: "Tenant",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TipoUnidade",
                schema: "core",
                table: "Tenant",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AtualizadoEm",
                schema: "clinica",
                table: "RecemNascido",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AtualizadoPorUserId",
                schema: "clinica",
                table: "RecemNascido",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CriadoEm",
                schema: "clinica",
                table: "RecemNascido",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CriadoPorUserId",
                schema: "clinica",
                table: "RecemNascido",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AtualizadoEm",
                schema: "nutricao",
                table: "DietaItem",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AtualizadoPorUserId",
                schema: "nutricao",
                table: "DietaItem",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CriadoEm",
                schema: "nutricao",
                table: "DietaItem",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CriadoPorUserId",
                schema: "nutricao",
                table: "DietaItem",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AtualizadoEm",
                schema: "nutricao",
                table: "Dieta",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AtualizadoPorUserId",
                schema: "nutricao",
                table: "Dieta",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CriadoEm",
                schema: "nutricao",
                table: "Dieta",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CriadoPorUserId",
                schema: "nutricao",
                table: "Dieta",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AtualizadoEm",
                schema: "clinica",
                table: "Consulta",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AtualizadoPorUserId",
                schema: "clinica",
                table: "Consulta",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CriadoEm",
                schema: "clinica",
                table: "Consulta",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CriadoPorUserId",
                schema: "clinica",
                table: "Consulta",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                schema: "core",
                table: "AspNetUsers",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CriadoEm",
                schema: "core",
                table: "AspNetUsers",
                type: "datetimeoffset",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<Guid>(
                name: "GrupoSaudeId",
                schema: "core",
                table: "AspNetUsers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AtualizadoEm",
                schema: "nutricao",
                table: "Alimento",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AtualizadoPorUserId",
                schema: "nutricao",
                table: "Alimento",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CriadoEm",
                schema: "nutricao",
                table: "Alimento",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CriadoPorUserId",
                schema: "nutricao",
                table: "Alimento",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GrupoSaude",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Tipo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Cnpj = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Telefone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Endereco = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Cidade = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Ativo = table.Column<bool>(type: "bit", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CriadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AtualizadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AtualizadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GrupoSaude", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProfissionalSaudeUnidade",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfissionalSaudeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Principal = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CriadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AtualizadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AtualizadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfissionalSaudeUnidade", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfissionalSaudeUnidade_AspNetUsers_ProfissionalSaudeId",
                        column: x => x.ProfissionalSaudeId,
                        principalSchema: "core",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProfissionalSaudeUnidade_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "core",
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            var saoPaulo = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
            var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, saoPaulo);
            var defaultGrupoId = Guid.NewGuid();

            migrationBuilder.InsertData(
                schema: "core",
                table: "GrupoSaude",
                columns: new[]
                {
                    "Id", "Nome", "Tipo", "Cnpj", "Telefone", "Endereco", "Cidade", "Estado",
                    "Ativo", "CriadoEm", "CriadoPorUserId", "AtualizadoEm", "AtualizadoPorUserId"
                },
                values: new object[]
                {
                    defaultGrupoId,
                    "Secretaria Padrão",
                    "Secretaria de Saúde",
                    null,
                    null,
                    null,
                    null,
                    null,
                    true,
                    now,
                    null,
                    null,
                    null
                });

            migrationBuilder.Sql($@"
DECLARE @GrupoId UNIQUEIDENTIFIER = '{defaultGrupoId}';
DECLARE @Agora DATETIMEOFFSET = SWITCHOFFSET(SYSUTCDATETIME(), DATEPART(TZOFFSET, '{now:yyyy-MM-ddTHH:mm:sszzz}'));

UPDATE t
SET t.GrupoSaudeId = @GrupoId,
    t.CriadoEm = CASE WHEN t.CriadoEm = '0001-01-01T00:00:00+00:00' THEN @Agora ELSE t.CriadoEm END
FROM core.Tenant AS t;

UPDATE t
SET t.CriadoEm = @Agora
FROM core.Tenant AS t
WHERE t.CriadoEm = '0001-01-01T00:00:00+00:00';

DECLARE @TenantPadrao UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM core.Tenant ORDER BY Id);
IF @TenantPadrao IS NULL
BEGIN
    SET @TenantPadrao = NEWID();
    INSERT INTO core.Tenant
    (
        Id, GrupoSaudeId, Nome, Tipo, TipoUnidade, Cnpj, Telefone, Endereco, Cidade, Estado,
        IdadePreTermoLimite, Ativo, CriadoEm
    )
    VALUES
    (
        @TenantPadrao, @GrupoId, 'Unidade Padrão', 'hospital', NULL, NULL, NULL, NULL, NULL, NULL,
        37, 1, @Agora
    );
END

UPDATE clinica.RecemNascido
SET CriadoEm = CASE WHEN CriadoEm = '0001-01-01T00:00:00+00:00' THEN @Agora ELSE CriadoEm END;

UPDATE clinica.Consulta
SET CriadoEm = CASE WHEN CriadoEm = '0001-01-01T00:00:00+00:00' THEN @Agora ELSE CriadoEm END;

UPDATE nutricao.Dieta
SET CriadoEm = CASE WHEN CriadoEm = '0001-01-01T00:00:00+00:00' THEN @Agora ELSE CriadoEm END;

UPDATE nutricao.DietaItem
SET CriadoEm = CASE WHEN CriadoEm = '0001-01-01T00:00:00+00:00' THEN @Agora ELSE CriadoEm END;

UPDATE nutricao.Alimento
SET CriadoEm = CASE WHEN CriadoEm = '0001-01-01T00:00:00+00:00' THEN @Agora ELSE CriadoEm END;

-- Normaliza TenantId de dados órfãos antes de criar FKs
UPDATE a
SET a.TenantId = @TenantPadrao
FROM nutricao.Alimento a
WHERE a.TenantId IS NULL
   OR NOT EXISTS (SELECT 1 FROM core.Tenant t WHERE t.Id = a.TenantId);

UPDATE r
SET r.TenantId = @TenantPadrao
FROM clinica.RecemNascido r
WHERE r.TenantId IS NULL
   OR NOT EXISTS (SELECT 1 FROM core.Tenant t WHERE t.Id = r.TenantId);


UPDATE u
SET u.TenantId = @TenantPadrao
FROM core.AspNetUsers u
WHERE u.TenantId IS NULL
   OR NOT EXISTS (SELECT 1 FROM core.Tenant t WHERE t.Id = u.TenantId);

UPDATE u
SET u.GrupoSaudeId = t.GrupoSaudeId,
    u.CriadoEm = CASE WHEN u.CriadoEm = '0001-01-01T00:00:00+00:00' THEN @Agora ELSE u.CriadoEm END
FROM core.AspNetUsers u
INNER JOIN core.Tenant t ON t.Id = u.TenantId
WHERE u.TenantId IS NOT NULL;

INSERT INTO core.ProfissionalSaudeUnidade (Id, ProfissionalSaudeId, TenantId, Principal, CriadoEm)
SELECT NEWID(), u.Id, u.TenantId, 1, @Agora
FROM core.AspNetUsers u
INNER JOIN core.Tenant t ON t.Id = u.TenantId
WHERE u.TenantId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM core.ProfissionalSaudeUnidade pu
    WHERE pu.ProfissionalSaudeId = u.Id AND pu.TenantId = u.TenantId);
");

            migrationBuilder.CreateIndex(
                name: "IX_Tenant_GrupoSaudeId",
                schema: "core",
                table: "Tenant",
                column: "GrupoSaudeId");

            migrationBuilder.CreateIndex(
                name: "IX_RecemNascido_TenantId",
                schema: "clinica",
                table: "RecemNascido",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DietaItem_AlimentoId",
                schema: "nutricao",
                table: "DietaItem",
                column: "AlimentoId");

            migrationBuilder.CreateIndex(
                name: "IX_Dieta_RecemNascidoId",
                schema: "nutricao",
                table: "Dieta",
                column: "RecemNascidoId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_GrupoSaudeId",
                schema: "core",
                table: "AspNetUsers",
                column: "GrupoSaudeId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_TenantId",
                schema: "core",
                table: "AspNetUsers",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Alimento_TenantId",
                schema: "nutricao",
                table: "Alimento",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfissionalSaudeUnidade_ProfissionalSaudeId_TenantId",
                schema: "core",
                table: "ProfissionalSaudeUnidade",
                columns: new[] { "ProfissionalSaudeId", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfissionalSaudeUnidade_TenantId",
                schema: "core",
                table: "ProfissionalSaudeUnidade",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Alimento_Tenant_TenantId",
                schema: "nutricao",
                table: "Alimento",
                column: "TenantId",
                principalSchema: "core",
                principalTable: "Tenant",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_GrupoSaude_GrupoSaudeId",
                schema: "core",
                table: "AspNetUsers",
                column: "GrupoSaudeId",
                principalSchema: "core",
                principalTable: "GrupoSaude",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Tenant_TenantId",
                schema: "core",
                table: "AspNetUsers",
                column: "TenantId",
                principalSchema: "core",
                principalTable: "Tenant",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Dieta_RecemNascido_RecemNascidoId",
                schema: "nutricao",
                table: "Dieta",
                column: "RecemNascidoId",
                principalSchema: "clinica",
                principalTable: "RecemNascido",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DietaItem_Alimento_AlimentoId",
                schema: "nutricao",
                table: "DietaItem",
                column: "AlimentoId",
                principalSchema: "nutricao",
                principalTable: "Alimento",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RecemNascido_Tenant_TenantId",
                schema: "clinica",
                table: "RecemNascido",
                column: "TenantId",
                principalSchema: "core",
                principalTable: "Tenant",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tenant_GrupoSaude_GrupoSaudeId",
                schema: "core",
                table: "Tenant",
                column: "GrupoSaudeId",
                principalSchema: "core",
                principalTable: "GrupoSaude",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Alimento_Tenant_TenantId",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_GrupoSaude_GrupoSaudeId",
                schema: "core",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Tenant_TenantId",
                schema: "core",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_Dieta_RecemNascido_RecemNascidoId",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropForeignKey(
                name: "FK_DietaItem_Alimento_AlimentoId",
                schema: "nutricao",
                table: "DietaItem");

            migrationBuilder.DropForeignKey(
                name: "FK_RecemNascido_Tenant_TenantId",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropForeignKey(
                name: "FK_Tenant_GrupoSaude_GrupoSaudeId",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropTable(
                name: "GrupoSaude",
                schema: "core");

            migrationBuilder.DropTable(
                name: "ProfissionalSaudeUnidade",
                schema: "core");

            migrationBuilder.DropIndex(
                name: "IX_Tenant_GrupoSaudeId",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropIndex(
                name: "IX_RecemNascido_TenantId",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropIndex(
                name: "IX_DietaItem_AlimentoId",
                schema: "nutricao",
                table: "DietaItem");

            migrationBuilder.DropIndex(
                name: "IX_Dieta_RecemNascidoId",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_GrupoSaudeId",
                schema: "core",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_TenantId",
                schema: "core",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_Alimento_TenantId",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.DropColumn(
                name: "AtualizadoEm",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "AtualizadoPorUserId",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "Cidade",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "Cnpj",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "CriadoPorUserId",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "Endereco",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "Estado",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "GrupoSaudeId",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "Telefone",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "TipoUnidade",
                schema: "core",
                table: "Tenant");

            migrationBuilder.DropColumn(
                name: "AtualizadoEm",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "AtualizadoPorUserId",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "CriadoPorUserId",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "AtualizadoEm",
                schema: "nutricao",
                table: "DietaItem");

            migrationBuilder.DropColumn(
                name: "AtualizadoPorUserId",
                schema: "nutricao",
                table: "DietaItem");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                schema: "nutricao",
                table: "DietaItem");

            migrationBuilder.DropColumn(
                name: "CriadoPorUserId",
                schema: "nutricao",
                table: "DietaItem");

            migrationBuilder.DropColumn(
                name: "AtualizadoEm",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "AtualizadoPorUserId",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "CriadoPorUserId",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "AtualizadoEm",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "AtualizadoPorUserId",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "CriadoPorUserId",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "GrupoSaudeId",
                schema: "core",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "AtualizadoEm",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.DropColumn(
                name: "AtualizadoPorUserId",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.DropColumn(
                name: "CriadoPorUserId",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                schema: "core",
                table: "AspNetUsers",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CriadoEm",
                schema: "core",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset");
        }
    }
}

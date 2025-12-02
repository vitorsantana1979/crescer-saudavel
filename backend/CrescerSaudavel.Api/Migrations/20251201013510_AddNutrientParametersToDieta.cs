using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNutrientParametersToDieta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "MetaProteinaGKg",
                schema: "nutricao",
                table: "Dieta",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Observacoes",
                schema: "nutricao",
                table: "Dieta",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PesoReferenciaKg",
                schema: "nutricao",
                table: "Dieta",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "TaxaEnergeticaKcalKg",
                schema: "nutricao",
                table: "Dieta",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ViaAdministracao",
                schema: "nutricao",
                table: "Dieta",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MetaProteinaGKg",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "Observacoes",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "PesoReferenciaKg",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "TaxaEnergeticaKcalKg",
                schema: "nutricao",
                table: "Dieta");

            migrationBuilder.DropColumn(
                name: "ViaAdministracao",
                schema: "nutricao",
                table: "Dieta");
        }
    }
}

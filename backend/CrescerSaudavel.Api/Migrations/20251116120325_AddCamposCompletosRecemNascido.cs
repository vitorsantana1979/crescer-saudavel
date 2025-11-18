using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCamposCompletosRecemNascido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Apgar1Minuto",
                schema: "clinica",
                table: "RecemNascido",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Apgar5Minuto",
                schema: "clinica",
                table: "RecemNascido",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdadeGestacionalCorrigidaDias",
                schema: "clinica",
                table: "RecemNascido",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "IdadeGestacionalCorrigidaSemanas",
                schema: "clinica",
                table: "RecemNascido",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdadeGestacionalDias",
                schema: "clinica",
                table: "RecemNascido",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TipoParto",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Apgar1Minuto",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "Apgar5Minuto",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "IdadeGestacionalCorrigidaDias",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "IdadeGestacionalCorrigidaSemanas",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "IdadeGestacionalDias",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "TipoParto",
                schema: "clinica",
                table: "RecemNascido");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTamanhoNascimentoRecemNascido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdequacaoPesoNascimento",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(3)",
                maxLength: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ZNascimentoComprimento",
                schema: "clinica",
                table: "RecemNascido",
                type: "decimal(6,3)",
                precision: 6,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ZNascimentoPerimetro",
                schema: "clinica",
                table: "RecemNascido",
                type: "decimal(6,3)",
                precision: 6,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ZNascimentoPeso",
                schema: "clinica",
                table: "RecemNascido",
                type: "decimal(6,3)",
                precision: 6,
                scale: 3,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdequacaoPesoNascimento",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "ZNascimentoComprimento",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "ZNascimentoPerimetro",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "ZNascimentoPeso",
                schema: "clinica",
                table: "RecemNascido");
        }
    }
}

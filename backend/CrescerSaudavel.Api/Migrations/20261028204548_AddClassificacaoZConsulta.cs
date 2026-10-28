using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClassificacaoZConsulta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoEstatura",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoPerimetro",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoPeso",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClassificacaoEstatura",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ClassificacaoPerimetro",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ClassificacaoPeso",
                schema: "clinica",
                table: "Consulta");
        }
    }
}

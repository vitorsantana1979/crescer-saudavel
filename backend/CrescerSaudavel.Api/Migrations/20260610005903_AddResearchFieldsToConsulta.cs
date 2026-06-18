using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResearchFieldsToConsulta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AlertaQuedaPonderal",
                schema: "clinica",
                table: "Consulta",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AlertaRCEU",
                schema: "clinica",
                table: "Consulta",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoManualEquipe",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ZScoreManualEquipe",
                schema: "clinica",
                table: "Consulta",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlertaQuedaPonderal",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "AlertaRCEU",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ClassificacaoManualEquipe",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ZScoreManualEquipe",
                schema: "clinica",
                table: "Consulta");
        }
    }
}

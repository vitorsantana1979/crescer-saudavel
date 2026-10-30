using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEstadoNutricionalConsulta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoImc",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoPesoEstatura",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Imc",
                schema: "clinica",
                table: "Consulta",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PosicaoMedida",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ZScoreImc",
                schema: "clinica",
                table: "Consulta",
                type: "decimal(6,3)",
                precision: 6,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ZScorePesoEstatura",
                schema: "clinica",
                table: "Consulta",
                type: "decimal(6,3)",
                precision: 6,
                scale: 3,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClassificacaoImc",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ClassificacaoPesoEstatura",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "Imc",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "PosicaoMedida",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ZScoreImc",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ZScorePesoEstatura",
                schema: "clinica",
                table: "Consulta");
        }
    }
}

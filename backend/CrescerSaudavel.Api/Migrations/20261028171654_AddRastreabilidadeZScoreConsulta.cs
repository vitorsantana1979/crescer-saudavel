using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRastreabilidadeZScoreConsulta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IdadeCalculoDias",
                schema: "clinica",
                table: "Consulta",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferenciaCurva",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TipoIdadeCalculo",
                schema: "clinica",
                table: "Consulta",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IdadeCalculoDias",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "ReferenciaCurva",
                schema: "clinica",
                table: "Consulta");

            migrationBuilder.DropColumn(
                name: "TipoIdadeCalculo",
                schema: "clinica",
                table: "Consulta");
        }
    }
}

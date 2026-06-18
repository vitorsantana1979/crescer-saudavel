using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVelocidadeGanhoPonderal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "VelocidadeGanhoPonderal",
                schema: "clinica",
                table: "Consulta",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VelocidadeGanhoPonderal",
                schema: "clinica",
                table: "Consulta");
        }
    }
}

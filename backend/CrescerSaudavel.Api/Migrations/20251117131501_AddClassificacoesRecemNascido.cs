using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClassificacoesRecemNascido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoIG",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClassificacaoPN",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClassificacaoIG",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "ClassificacaoPN",
                schema: "clinica",
                table: "RecemNascido");
        }
    }
}

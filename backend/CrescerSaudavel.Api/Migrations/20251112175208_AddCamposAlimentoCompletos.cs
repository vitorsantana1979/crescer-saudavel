using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCamposAlimentoCompletos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EhPreTermo",
                schema: "nutricao",
                table: "Alimento",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Excluido",
                schema: "nutricao",
                table: "Alimento",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "IdadeMaximaSemanas",
                schema: "nutricao",
                table: "Alimento",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EhPreTermo",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.DropColumn(
                name: "Excluido",
                schema: "nutricao",
                table: "Alimento");

            migrationBuilder.DropColumn(
                name: "IdadeMaximaSemanas",
                schema: "nutricao",
                table: "Alimento");
        }
    }
}

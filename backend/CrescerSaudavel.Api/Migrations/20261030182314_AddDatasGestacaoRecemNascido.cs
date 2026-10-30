using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDatasGestacaoRecemNascido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DataProvavelParto",
                schema: "clinica",
                table: "RecemNascido",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DataUltimaMenstruacao",
                schema: "clinica",
                table: "RecemNascido",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "HoraNascimento",
                schema: "clinica",
                table: "RecemNascido",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetodoIG",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DataProvavelParto",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "DataUltimaMenstruacao",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "HoraNascimento",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "MetodoIG",
                schema: "clinica",
                table: "RecemNascido");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CrescerSaudavel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCamposDemograficosRecemNascido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "interoperabilidade");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoBairro",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoCep",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoCidade",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoComplemento",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoLogradouro",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoNumero",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoUf",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NomeMae",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NomePai",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Telefone",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TelefoneCelular",
                schema: "clinica",
                table: "RecemNascido",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AuditoriaAcessoPaciente",
                schema: "interoperabilidade",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecemNascidoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoOperacao = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpOrigem = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResumoDadosAcessados = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Sucesso = table.Column<bool>(type: "bit", nullable: false),
                    MensagemErro = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CriadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CriadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AtualizadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AtualizadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditoriaAcessoPaciente", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditoriaAcessoPaciente_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalSchema: "core",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AuditoriaAcessoPaciente_RecemNascido_RecemNascidoId",
                        column: x => x.RecemNascidoId,
                        principalSchema: "clinica",
                        principalTable: "RecemNascido",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PacienteIdentificador",
                schema: "interoperabilidade",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecemNascidoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoIdentificador = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Valor = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SistemaEmissor = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Principal = table.Column<bool>(type: "bit", nullable: false),
                    Ativo = table.Column<bool>(type: "bit", nullable: false),
                    DataExpiracao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Observacoes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CriadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CriadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AtualizadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AtualizadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PacienteIdentificador", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PacienteIdentificador_RecemNascido_RecemNascidoId",
                        column: x => x.RecemNascidoId,
                        principalSchema: "clinica",
                        principalTable: "RecemNascido",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditoriaAcessoPaciente_RecemNascidoId_CriadoEm",
                schema: "interoperabilidade",
                table: "AuditoriaAcessoPaciente",
                columns: new[] { "RecemNascidoId", "CriadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditoriaAcessoPaciente_UsuarioId_CriadoEm",
                schema: "interoperabilidade",
                table: "AuditoriaAcessoPaciente",
                columns: new[] { "UsuarioId", "CriadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_PacienteIdentificador_RecemNascidoId_TipoIdentificador_Valor",
                schema: "interoperabilidade",
                table: "PacienteIdentificador",
                columns: new[] { "RecemNascidoId", "TipoIdentificador", "Valor" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PacienteIdentificador_TipoIdentificador_Valor",
                schema: "interoperabilidade",
                table: "PacienteIdentificador",
                columns: new[] { "TipoIdentificador", "Valor" },
                filter: "[Ativo] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditoriaAcessoPaciente",
                schema: "interoperabilidade");

            migrationBuilder.DropTable(
                name: "PacienteIdentificador",
                schema: "interoperabilidade");

            migrationBuilder.DropColumn(
                name: "Email",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "EnderecoBairro",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "EnderecoCep",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "EnderecoCidade",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "EnderecoComplemento",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "EnderecoLogradouro",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "EnderecoNumero",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "EnderecoUf",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "NomeMae",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "NomePai",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "Telefone",
                schema: "clinica",
                table: "RecemNascido");

            migrationBuilder.DropColumn(
                name: "TelefoneCelular",
                schema: "clinica",
                table: "RecemNascido");
        }
    }
}

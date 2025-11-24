using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Services.Interoperabilidade;

/// <summary>
/// Implementação do serviço PIX (Patient Identifier Cross-referencing).
/// Esta implementação atual trabalha com dados locais. Quando a integração real com SOA-SUS estiver disponível,
/// este serviço deve ser adaptado para fazer chamadas ao barramento SOA-SUS.
/// </summary>
public class PixService : IPixService
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PixService> _logger;

    public PixService(
        CrescerSaudavelDbContext context,
        IConfiguration configuration,
        ILogger<PixService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public bool EstaHabilitado()
    {
        return _configuration.GetValue<bool>("Interoperabilidade:Pix:Habilitado", false);
    }

    public async Task<PixRegisterResponse> RegistrarIdentificadoresAsync(
        PixRegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Buscar paciente local
            var paciente = await _context.RecemNascidos
                .Include(p => p.Identificadores)
                .FirstOrDefaultAsync(p => p.Id == request.IdLocal, cancellationToken);

            if (paciente == null)
            {
                return new PixRegisterResponse
                {
                    Sucesso = false,
                    MensagemErro = "Paciente não encontrado"
                };
            }

            var correlacoes = new List<PixIdentifierCorrelation>();

            // Registrar CNS se fornecido
            if (!string.IsNullOrWhiteSpace(request.Cns))
            {
                var cnsExistente = paciente.Identificadores
                    .FirstOrDefault(i => i.TipoIdentificador == "CNS" && i.Valor == request.Cns);

                if (cnsExistente == null)
                {
                    // Desativar outros CNS principais se houver
                    var outrosCns = paciente.Identificadores
                        .Where(i => i.TipoIdentificador == "CNS" && i.Principal)
                        .ToList();
                    foreach (var outroCns in outrosCns)
                    {
                        outroCns.Principal = false;
                    }

                    var novoCns = new PacienteIdentificador
                    {
                        RecemNascidoId = paciente.Id,
                        TipoIdentificador = "CNS",
                        Valor = request.Cns,
                        SistemaEmissor = "CadSUS",
                        Principal = true,
                        Ativo = true
                    };
                    paciente.Identificadores.Add(novoCns);
                    correlacoes.Add(new PixIdentifierCorrelation
                    {
                        TipoIdentificador = "CNS",
                        Valor = request.Cns,
                        SistemaEmissor = "CadSUS",
                        Principal = true
                    });
                }
                else
                {
                    cnsExistente.Principal = true;
                    cnsExistente.Ativo = true;
                    correlacoes.Add(new PixIdentifierCorrelation
                    {
                        TipoIdentificador = "CNS",
                        Valor = request.Cns,
                        SistemaEmissor = cnsExistente.SistemaEmissor,
                        Principal = true
                    });
                }
            }

            // Registrar outros identificadores externos
            foreach (var identificador in request.IdentificadoresExternos)
            {
                var existente = paciente.Identificadores
                    .FirstOrDefault(i => 
                        i.TipoIdentificador == identificador.Tipo &&
                        i.Valor == identificador.Valor &&
                        i.SistemaEmissor == identificador.SistemaEmissor);

                if (existente == null)
                {
                    var novo = new PacienteIdentificador
                    {
                        RecemNascidoId = paciente.Id,
                        TipoIdentificador = identificador.Tipo,
                        Valor = identificador.Valor,
                        SistemaEmissor = identificador.SistemaEmissor,
                        Principal = false,
                        Ativo = true
                    };
                    paciente.Identificadores.Add(novo);
                    correlacoes.Add(new PixIdentifierCorrelation
                    {
                        TipoIdentificador = identificador.Tipo,
                        Valor = identificador.Valor,
                        SistemaEmissor = identificador.SistemaEmissor,
                        Principal = false
                    });
                }
                else
                {
                    existente.Ativo = true;
                    correlacoes.Add(new PixIdentifierCorrelation
                    {
                        TipoIdentificador = existente.TipoIdentificador,
                        Valor = existente.Valor,
                        SistemaEmissor = existente.SistemaEmissor,
                        Principal = existente.Principal
                    });
                }
            }

            // Registrar ID_LOCAL se não existir
            var idLocal = paciente.Identificadores
                .FirstOrDefault(i => i.TipoIdentificador == "ID_LOCAL");

            if (idLocal == null)
            {
                var novoIdLocal = new PacienteIdentificador
                {
                    RecemNascidoId = paciente.Id,
                    TipoIdentificador = "ID_LOCAL",
                    Valor = paciente.Id.ToString(),
                    SistemaEmissor = "CrescerSaudavel",
                    Principal = string.IsNullOrWhiteSpace(request.Cns),
                    Ativo = true
                };
                paciente.Identificadores.Add(novoIdLocal);
                correlacoes.Add(new PixIdentifierCorrelation
                {
                    TipoIdentificador = "ID_LOCAL",
                    Valor = paciente.Id.ToString(),
                    SistemaEmissor = "CrescerSaudavel",
                    Principal = novoIdLocal.Principal
                });
            }

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "PIX: Registrados {Count} identificadores para paciente {PacienteId}",
                correlacoes.Count,
                paciente.Id);

            return new PixRegisterResponse
            {
                Sucesso = true,
                Correlacoes = correlacoes
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao registrar identificadores PIX para paciente {PacienteId}", request.IdLocal);
            return new PixRegisterResponse
            {
                Sucesso = false,
                MensagemErro = $"Erro ao registrar identificadores: {ex.Message}"
            };
        }
    }

    public async Task<PixQueryResponse> ConsultarIdentificadoresAsync(
        PixQueryRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var identificadores = await _context.PacienteIdentificadores
                .Where(i => i.Ativo)
                .Where(i => 
                    (request.TipoIdentificador == "ID_LOCAL" && i.TipoIdentificador == "ID_LOCAL" && i.Valor == request.Identificador) ||
                    (request.TipoIdentificador == "CNS" && i.TipoIdentificador == "CNS" && i.Valor == request.Identificador) ||
                    (i.Valor == request.Identificador))
                .Select(i => i.RecemNascidoId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (!identificadores.Any())
            {
                return new PixQueryResponse
                {
                    Sucesso = false,
                    MensagemErro = "Nenhum paciente encontrado com o identificador fornecido"
                };
            }

            // Buscar todos os identificadores dos pacientes encontrados
            var todosIdentificadores = await _context.PacienteIdentificadores
                .Where(i => identificadores.Contains(i.RecemNascidoId) && i.Ativo)
                .Select(i => new PixIdentifierCorrelation
                {
                    TipoIdentificador = i.TipoIdentificador,
                    Valor = i.Valor,
                    SistemaEmissor = i.SistemaEmissor,
                    Principal = i.Principal
                })
                .ToListAsync(cancellationToken);

            _logger.LogInformation(
                "PIX: Consultados {Count} identificadores para {Tipo}={Valor}",
                todosIdentificadores.Count,
                request.TipoIdentificador,
                request.Identificador);

            return new PixQueryResponse
            {
                Sucesso = true,
                IdentificadoresCorrelacionados = todosIdentificadores
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao consultar identificadores PIX para {Tipo}={Valor}", 
                request.TipoIdentificador, request.Identificador);
            return new PixQueryResponse
            {
                Sucesso = false,
                MensagemErro = $"Erro ao consultar identificadores: {ex.Message}"
            };
        }
    }
}



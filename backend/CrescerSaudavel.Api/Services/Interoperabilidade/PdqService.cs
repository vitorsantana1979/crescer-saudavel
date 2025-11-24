using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Services.Interoperabilidade;

/// <summary>
/// Implementação do serviço PDQ (Patient Demographics Query).
/// Esta implementação atual trabalha com dados locais. Quando a integração real com SOA-SUS estiver disponível,
/// este serviço deve ser adaptado para fazer chamadas ao barramento SOA-SUS/CadSUS.
/// </summary>
public class PdqService : IPdqService
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PdqService> _logger;

    public PdqService(
        CrescerSaudavelDbContext context,
        IConfiguration configuration,
        ILogger<PdqService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public bool EstaHabilitado()
    {
        return _configuration.GetValue<bool>("Interoperabilidade:Pdq:Habilitado", false);
    }

    public async Task<PdqQueryResponse> ConsultarPacientesAsync(
        PdqQueryRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.RecemNascidos
                .Include(p => p.Identificadores)
                .AsQueryable();

            // Aplicar filtros conforme dados fornecidos
            if (!string.IsNullOrWhiteSpace(request.Nome))
            {
                query = query.Where(p => p.Nome.Contains(request.Nome));
            }

            if (!string.IsNullOrWhiteSpace(request.NomeMae))
            {
                query = query.Where(p => p.NomeMae != null && p.NomeMae.Contains(request.NomeMae));
            }

            if (request.DataNascimento.HasValue)
            {
                var dataInicio = request.DataNascimento.Value.Date;
                var dataFim = dataInicio.AddDays(1);
                query = query.Where(p => p.DataNascimento >= dataInicio && p.DataNascimento < dataFim);
            }

            if (request.Sexo.HasValue)
            {
                query = query.Where(p => p.Sexo == request.Sexo.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Municipio))
            {
                query = query.Where(p => p.EnderecoCidade != null && p.EnderecoCidade.Contains(request.Municipio));
            }

            if (!string.IsNullOrWhiteSpace(request.Uf))
            {
                query = query.Where(p => p.EnderecoUf == request.Uf);
            }

            if (!string.IsNullOrWhiteSpace(request.Cep))
            {
                var cepLimpo = request.Cep.Replace("-", "").Replace(" ", "");
                query = query.Where(p => p.EnderecoCep != null && p.EnderecoCep.Replace("-", "").Replace(" ", "") == cepLimpo);
            }

            // Se CNS fornecido, buscar via identificadores
            if (!string.IsNullOrWhiteSpace(request.Cns))
            {
                var pacientesComCns = await _context.PacienteIdentificadores
                    .Where(i => i.TipoIdentificador == "CNS" && i.Valor == request.Cns && i.Ativo)
                    .Select(i => i.RecemNascidoId)
                    .ToListAsync(cancellationToken);

                if (pacientesComCns.Any())
                {
                    query = query.Where(p => pacientesComCns.Contains(p.Id));
                }
                else
                {
                    // Nenhum paciente encontrado com esse CNS
                    return new PdqQueryResponse
                    {
                        Sucesso = true,
                        Pacientes = new List<PdqPatientMatch>(),
                        TotalEncontrados = 0
                    };
                }
            }

            var pacientes = await query
                .Take(50) // Limitar resultados para evitar sobrecarga
                .ToListAsync(cancellationToken);

            var matches = pacientes.Select(p =>
            {
                var cns = p.Identificadores
                    .FirstOrDefault(i => i.TipoIdentificador == "CNS" && i.Ativo)?.Valor;

                // Calcular score de confiança baseado em quantos critérios correspondem
                var score = 0m;
                if (!string.IsNullOrWhiteSpace(request.Nome) && p.Nome.Contains(request.Nome, StringComparison.OrdinalIgnoreCase))
                    score += 30;
                if (!string.IsNullOrWhiteSpace(request.NomeMae) && p.NomeMae != null && p.NomeMae.Contains(request.NomeMae, StringComparison.OrdinalIgnoreCase))
                    score += 25;
                if (request.DataNascimento.HasValue && p.DataNascimento.Date == request.DataNascimento.Value.Date)
                    score += 25;
                if (request.Sexo.HasValue && p.Sexo == request.Sexo.Value)
                    score += 10;
                if (!string.IsNullOrWhiteSpace(request.Municipio) && p.EnderecoCidade != null && p.EnderecoCidade.Contains(request.Municipio, StringComparison.OrdinalIgnoreCase))
                    score += 10;

                return new PdqPatientMatch
                {
                    Cns = cns,
                    Nome = p.Nome,
                    NomeMae = p.NomeMae,
                    DataNascimento = p.DataNascimento,
                    Sexo = p.Sexo,
                    Municipio = p.EnderecoCidade,
                    Uf = p.EnderecoUf,
                    ScoreConfianca = score
                };
            })
            .OrderByDescending(m => m.ScoreConfianca)
            .ToList();

            _logger.LogInformation(
                "PDQ: Encontrados {Count} pacientes para consulta",
                matches.Count);

            return new PdqQueryResponse
            {
                Sucesso = true,
                Pacientes = matches,
                TotalEncontrados = matches.Count
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao consultar pacientes via PDQ");
            return new PdqQueryResponse
            {
                Sucesso = false,
                MensagemErro = $"Erro ao consultar pacientes: {ex.Message}",
                Pacientes = new List<PdqPatientMatch>(),
                TotalEncontrados = 0
            };
        }
    }

    public async Task<PdqPatientMatch?> ConsultarPorCnsAsync(
        string cns,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var identificador = await _context.PacienteIdentificadores
                .Include(i => i.RecemNascido)
                .FirstOrDefaultAsync(
                    i => i.TipoIdentificador == "CNS" && 
                         i.Valor == cns && 
                         i.Ativo,
                    cancellationToken);

            if (identificador?.RecemNascido == null)
            {
                return null;
            }

            var paciente = identificador.RecemNascido;

            return new PdqPatientMatch
            {
                Cns = cns,
                Nome = paciente.Nome,
                NomeMae = paciente.NomeMae,
                DataNascimento = paciente.DataNascimento,
                Sexo = paciente.Sexo,
                Municipio = paciente.EnderecoCidade,
                Uf = paciente.EnderecoUf,
                ScoreConfianca = 100 // CNS é identificador único, alta confiança
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao consultar paciente por CNS {Cns}", cns);
            return null;
        }
    }
}



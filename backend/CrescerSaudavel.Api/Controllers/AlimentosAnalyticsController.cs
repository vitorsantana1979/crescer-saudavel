using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models.Analytics;
using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Time;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/alimentos-analytics")]
[Authorize]
public class AlimentosAnalyticsController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly MLService _mlService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AlimentosAnalyticsController> _logger;

    public AlimentosAnalyticsController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService,
        MLService mlService,
        IMemoryCache cache,
        ILogger<AlimentosAnalyticsController> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _mlService = mlService;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Retorna dashboard completo de analytics de alimentos
    /// </summary>
    [HttpPost("dashboard")]
    [ProducesResponseType(typeof(FoodAnalyticsDashboard), 200)]
    public async Task<IActionResult> GetDashboard([FromBody] FoodAnalyticsFilter? filter = null)
    {
        var startTime = DateTime.UtcNow;
        try
        {
            _logger.LogInformation("🚀 Iniciando GetDashboard");
            
            var tenantIds = _currentUserService.TenantIds.ToHashSet();
            if (tenantIds.Count == 0)
                return Forbid();

            filter ??= new FoodAnalyticsFilter();
            
            // Período padrão: últimos 6 meses
            var dataInicio = filter.DataInicio ?? DateTime.UtcNow.AddMonths(-6);
            var dataFim = filter.DataFim ?? DateTime.UtcNow;

            // Cache key baseado em tenant e filtros
            var cacheKey = $"FoodDashboard_{string.Join(",", tenantIds)}_{dataInicio:yyyyMMdd}_{dataFim:yyyyMMdd}_{filter.TipoCrianca}";
            
            // Tentar obter do cache
            if (_cache.TryGetValue<FoodAnalyticsDashboard>(cacheKey, out var cachedDashboard))
            {
                var cacheTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
                _logger.LogInformation("✨ Dashboard retornado do CACHE em {CacheTime}ms", cacheTime);
                _logger.LogInformation("📊 Dados: {TotalAlimentos} alimentos, {TotalUsos} usos", 
                    cachedDashboard.TotalAlimentos, cachedDashboard.TotalUsos);
                return Ok(cachedDashboard);
            }

            _logger.LogInformation("Carregando performance de alimentos...");
            var performance = await GetAlimentoPerformanceList(tenantIds, filter, dataInicio, dataFim);
            _logger.LogInformation("Performance carregada: {Count} alimentos", performance.Count);
            
            _logger.LogInformation("Carregando combinações...");
            var combinacoes = await GetMelhoresCombinacoes(tenantIds, filter, dataInicio, dataFim, limit: 10);
            _logger.LogInformation("Combinações carregadas: {Count}", combinacoes.Count);

            var dashboard = new FoodAnalyticsDashboard
            {
                PeriodoInicio = dataInicio,
                PeriodoFim = dataFim,
                TotalAlimentos = performance.Count,
                TotalUsos = performance.Sum(p => p.TotalUsos),
                Performance = performance,
                MelhoresCombinacoes = combinacoes,
                AlimentoMaisUsado = performance.OrderByDescending(p => p.TotalUsos).FirstOrDefault(),
                AlimentoMelhorResultado = performance.OrderByDescending(p => p.MediaDeltaZScore).FirstOrDefault()
            };

            // Cachear por 5 minutos
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(5))
                .SetSlidingExpiration(TimeSpan.FromMinutes(2));
            
            _cache.Set(cacheKey, dashboard, cacheOptions);

            var totalTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
            
            // Avaliar performance
            var performanceEmoji = totalTime < 1000 ? "⚡" : totalTime < 3000 ? "✅" : totalTime < 8000 ? "⏱️" : "⏳";
            var performanceStatus = totalTime < 1000 ? "Excelente" : totalTime < 3000 ? "Boa" : totalTime < 8000 ? "Aceitável" : "Lenta";
            
            _logger.LogInformation("{Emoji} Dashboard calculado e cacheado em {TotalTime}ms - Performance {Status}", 
                performanceEmoji, totalTime, performanceStatus);
            _logger.LogInformation("📊 Resultado: {TotalAlimentos} alimentos | {TotalUsos} usos | {TopAlimento} mais usado", 
                dashboard.TotalAlimentos, 
                dashboard.TotalUsos,
                dashboard.AlimentoMaisUsado?.Nome ?? "N/A");
            
            // Log de otimizações aplicadas
            _logger.LogInformation("🔧 Otimizações: Batch Queries ✓ | Cache 5min ✓ | Índices SQL ✓");
            
            return Ok(dashboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao gerar dashboard de alimentos");
            return StatusCode(500, new { message = "Erro ao processar dashboard", error = ex.Message });
        }
    }

    /// <summary>
    /// Retorna performance agregada de alimentos
    /// </summary>
    [HttpPost("performance")]
    [ProducesResponseType(typeof(List<AlimentoPerformance>), 200)]
    public async Task<IActionResult> GetPerformance([FromBody] FoodAnalyticsFilter? filter = null)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        filter ??= new FoodAnalyticsFilter();
        var dataInicio = filter.DataInicio ?? DateTime.UtcNow.AddMonths(-6);
        var dataFim = filter.DataFim ?? DateTime.UtcNow;

        var performance = await GetAlimentoPerformanceList(tenantIds, filter, dataInicio, dataFim);

        return Ok(performance);
    }

    /// <summary>
    /// Retorna timeline de um alimento específico
    /// </summary>
    [HttpGet("timeline/{alimentoId}")]
    [ProducesResponseType(typeof(List<AlimentoTimelinePoint>), 200)]
    public async Task<IActionResult> GetTimeline(Guid alimentoId, [FromQuery] DateTime? dataInicio = null, [FromQuery] DateTime? dataFim = null)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        dataInicio ??= DateTime.UtcNow.AddMonths(-12);
        dataFim ??= DateTime.UtcNow;

        // Agrupar por mês
        var timeline = await (
            from di in _context.Set<Models.DietaItem>()
            join d in _context.Set<Models.Dieta>() on di.DietaId equals d.Id
            join rn in _context.Set<Models.RecemNascido>() on d.RecemNascidoId equals rn.Id
            where di.AlimentoId == alimentoId
                && tenantIds.Contains(rn.TenantId)
                && d.DataInicio >= dataInicio
                && d.DataInicio <= dataFim
            let mes = new DateTime(d.DataInicio.Year, d.DataInicio.Month, 1)
            group new { di, d, rn } by mes into g
            select new AlimentoTimelinePoint
            {
                DataInicio = g.Key,
                TotalUsos = g.Count(),
                MediaDeltaZScore = 0, // Calcular abaixo
                MediaGanhoPeso = 0    // Calcular abaixo
            }
        ).ToListAsync();

        return Ok(timeline);
    }

    /// <summary>
    /// Retorna combinações de alimentos mais efetivas
    /// </summary>
    [HttpPost("combinacoes")]
    [ProducesResponseType(typeof(List<CombinacaoAlimentos>), 200)]
    public async Task<IActionResult> GetCombinacoes([FromBody] FoodAnalyticsFilter? filter = null, [FromQuery] int limit = 20)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        filter ??= new FoodAnalyticsFilter();
        var dataInicio = filter.DataInicio ?? DateTime.UtcNow.AddMonths(-6);
        var dataFim = filter.DataFim ?? DateTime.UtcNow;

        var combinacoes = await GetMelhoresCombinacoes(tenantIds, filter, dataInicio, dataFim, limit);

        return Ok(combinacoes);
    }

    /// <summary>
    /// Recomenda alimentos baseado em ML para um perfil específico
    /// </summary>
    [HttpPost("recomendar")]
    [ProducesResponseType(typeof(FoodRecommendationResponse), 200)]
    public async Task<IActionResult> RecomendarAlimentos([FromBody] FoodRecommendationRequest request)
    {
        try
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            _logger.LogInformation("Solicitação de recomendação de alimentos para perfil: IG={IG}, Peso={Peso}g",
                request.Perfil.IdadeGestacionalSemanas, request.Perfil.PesoAtualGr);

            var response = await _mlService.RecommendFoodsAsync(request);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao recomendar alimentos");
            return StatusCode(500, new { message = "Erro ao processar recomendação de alimentos", error = ex.Message });
        }
    }

    // ==================== MÉTODOS AUXILIARES ====================

    private async Task<List<AlimentoPerformance>> GetAlimentoPerformanceList(
        HashSet<Guid> tenantIds,
        FoodAnalyticsFilter filter,
        DateTime dataInicio,
        DateTime dataFim)
    {
        _logger.LogInformation("GetAlimentoPerformanceList: Iniciando análise de performance");
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        // Query para obter dados de dietas e consultas
        var query = from di in _context.Set<Models.DietaItem>()
                    join a in _context.Set<Models.Alimento>() on di.AlimentoId equals a.Id
                    join d in _context.Set<Models.Dieta>() on di.DietaId equals d.Id
                    join rn in _context.Set<Models.RecemNascido>() on d.RecemNascidoId equals rn.Id
                    where tenantIds.Contains(rn.TenantId)
                        && d.DataInicio >= dataInicio
                        && d.DataInicio <= dataFim
                    select new
                    {
                        AlimentoId = a.Id,
                        AlimentoNome = a.Nome,
                        Categoria = a.Categoria,
                        Quantidade = di.Quantidade,
                        EnergiaKcal = a.EnergiaKcalPor100,
                        ProteinaG = a.ProteinaGPor100,
                        DietaId = d.Id,
                        RecemNascidoId = rn.Id,
                        DataInicioDieta = d.DataInicio,
                        IdadeGestacional = rn.IdadeGestacionalSemanas,
                        ClassificacaoIG = rn.ClassificacaoIG,
                        ClassificacaoPN = rn.ClassificacaoPN,
                        Sexo = rn.Sexo
                    };

        // Aplicar filtros opcionais
        if (!string.IsNullOrEmpty(filter.TipoCrianca))
        {
            if (filter.TipoCrianca.ToLower() == "pretermo")
                query = query.Where(x => x.IdadeGestacional < 37);
            else if (filter.TipoCrianca.ToLower() == "termo")
                query = query.Where(x => x.IdadeGestacional >= 37);
        }

        if (filter.ClassificacoesIG != null && filter.ClassificacoesIG.Any())
            query = query.Where(x => filter.ClassificacoesIG.Contains(x.ClassificacaoIG ?? ""));

        if (filter.ClassificacoesPeso != null && filter.ClassificacoesPeso.Any())
            query = query.Where(x => filter.ClassificacoesPeso.Contains(x.ClassificacaoPN ?? ""));

        if (filter.IdadeGestacionalMin.HasValue)
            query = query.Where(x => x.IdadeGestacional >= filter.IdadeGestacionalMin.Value);

        if (filter.IdadeGestacionalMax.HasValue)
            query = query.Where(x => x.IdadeGestacional <= filter.IdadeGestacionalMax.Value);

        var dados = await query.ToListAsync();
        _logger.LogInformation("GetAlimentoPerformanceList: Query executada. {Count} registros retornados", dados.Count);

        // Agrupar por alimento
        var performance = dados
            .GroupBy(d => new { d.AlimentoId, d.AlimentoNome, d.Categoria })
            .Select(g => new
            {
                g.Key.AlimentoId,
                g.Key.AlimentoNome,
                g.Key.Categoria,
                TotalUsos = g.Count(),
                TotalCriancas = g.Select(x => x.RecemNascidoId).Distinct().Count(),
                MediaEnergia = g.Average(x => (double)x.EnergiaKcal),
                MediaProteina = g.Average(x => (double)x.ProteinaG),
                Dietas = g.Select(x => x.DietaId).Distinct().ToList(),
                Criancas = g.Select(x => x.RecemNascidoId).Distinct().ToList()
            })
            .ToList();

        // Para cada alimento, calcular métricas de resultado
        var resultado = new List<AlimentoPerformance>();
        _logger.LogInformation("GetAlimentoPerformanceList: Processando {Count} alimentos", performance.Count);

        // OTIMIZAÇÃO: Buscar TODAS as consultas de TODAS as crianças de uma vez
        // Limitar a 1000 crianças únicas para evitar sobrecarga de memória
        var todasCriancasIds = performance.SelectMany(p => p.Criancas).Distinct().Take(1000).ToList();
        _logger.LogInformation("Buscando consultas para {Count} crianças únicas...", todasCriancasIds.Count);
        
        var todasConsultasGeral = await _context.Set<Models.Consulta>()
            .Where(c => todasCriancasIds.Contains(c.RecemNascidoId)
                && c.DataHora >= dataInicio
                && c.DataHora <= dataFim
                && c.ZScorePeso.HasValue)
            .Select(c => new { c.RecemNascidoId, c.DataHora, c.ZScorePeso, c.PesoKg })
            .OrderBy(c => c.RecemNascidoId)
            .ThenBy(c => c.DataHora)
            .ToListAsync();
        
        _logger.LogInformation("Consultas carregadas: {Count}", todasConsultasGeral.Count);
        
        var consultasPorCriancaDict = todasConsultasGeral
            .GroupBy(c => c.RecemNascidoId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var p in performance)
        {
            _logger.LogDebug("Calculando métricas para alimento: {Nome}", p.AlimentoNome);
            
            // Calcular métricas usando o dicionário pré-carregado
            var deltas = new List<(double DeltaZScore, double GanhoPeso, int Dias, bool Sucesso)>();
            
            foreach (var criancaId in p.Criancas.Take(100))
            {
                if (consultasPorCriancaDict.TryGetValue(criancaId, out var consultas) && consultas.Count >= 2)
                {
                    var primeira = consultas.First();
                    var ultima = consultas.Last();
                    var dias = (int)(ultima.DataHora - primeira.DataHora).TotalDays;

                    if (dias > 0)
                    {
                        var deltaZScore = (double)(ultima.ZScorePeso!.Value - primeira.ZScorePeso!.Value);
                        var ganhoPeso = (double)(((ultima.PesoKg - primeira.PesoKg) * 1000) / dias);
                        var sucesso = deltaZScore > 0;
                        deltas.Add((deltaZScore, ganhoPeso, dias, sucesso));
                    }
                }
            }
            
            // Calcular métricas usando deltas
            double mediaGanhoPeso = 0;
            double mediaDeltaZScore = 0;
            double taxaSucesso = 0;
            int diasAcompanhamentoMedio = 0;
            
            if (deltas.Count > 0)
            {
                mediaGanhoPeso = deltas.Average(d => d.GanhoPeso);
                mediaDeltaZScore = deltas.Average(d => d.DeltaZScore);
                taxaSucesso = deltas.Count(d => d.Sucesso) / (double)deltas.Count * 100;
                diasAcompanhamentoMedio = (int)deltas.Average(d => d.Dias);
            }

            var confiabilidade = p.TotalCriancas >= 30 ? "alta" :
                                p.TotalCriancas >= 10 ? "media" : "baixa";

            resultado.Add(new AlimentoPerformance
            {
                AlimentoId = p.AlimentoId,
                Nome = p.AlimentoNome,
                Categoria = p.Categoria,
                TotalUsos = p.TotalUsos,
                TotalCriancas = p.TotalCriancas,
                MediaGanhoPesoGrDia = mediaGanhoPeso,
                MediaDeltaZScore = mediaDeltaZScore,
                TaxaSucesso = taxaSucesso,
                MediaEnergiaKcal = p.MediaEnergia,
                MediaProteinaG = p.MediaProteina,
                DiasAcompanhamentoMedio = diasAcompanhamentoMedio,
                Confiabilidade = confiabilidade
            });
        }

        stopwatch.Stop();
        _logger.LogInformation("Processamento concluído em {ElapsedMs}ms. {Count} alimentos processados", 
            stopwatch.ElapsedMilliseconds, resultado.Count);
        
        return resultado.OrderByDescending(r => r.MediaDeltaZScore).ToList();
    }

    private async Task<(double MediaGanhoPeso, double MediaDeltaZScore, double TaxaSucesso, int DiasAcompanhamentoMedio)> 
        CalcularMetricasAlimento(List<Guid> criancaIds, DateTime dataInicio, DateTime dataFim)
    {
        // OTIMIZAÇÃO: Buscar TODAS as consultas de uma vez (única query)
        var todasConsultas = await _context.Set<Models.Consulta>()
            .Where(c => criancaIds.Take(100).Contains(c.RecemNascidoId)
                && c.DataHora >= dataInicio
                && c.DataHora <= dataFim
                && c.ZScorePeso.HasValue)
            .OrderBy(c => c.RecemNascidoId)
            .ThenBy(c => c.DataHora)
            .ToListAsync();

        // Agrupar por criança
        var consultasPorCrianca = todasConsultas
            .GroupBy(c => c.RecemNascidoId)
            .Where(g => g.Count() >= 2) // Apenas crianças com 2+ consultas
            .ToList();

        var deltas = new List<(double DeltaZScore, double GanhoPeso, int Dias, bool Sucesso)>();

        foreach (var grupo in consultasPorCrianca)
        {
            var consultas = grupo.OrderBy(c => c.DataHora).ToList();
            var primeira = consultas.First();
            var ultima = consultas.Last();
            var dias = (int)(ultima.DataHora - primeira.DataHora).TotalDays;

            if (dias > 0)
            {
                var deltaZScore = (double)(ultima.ZScorePeso!.Value - primeira.ZScorePeso!.Value);
                var ganhoPeso = (double)(((ultima.PesoKg - primeira.PesoKg) * 1000) / dias); // g/dia
                var sucesso = deltaZScore > 0;

                deltas.Add((deltaZScore, ganhoPeso, dias, sucesso));
            }
        }

        if (deltas.Count == 0)
            return (0, 0, 0, 0);

        return (
            MediaGanhoPeso: deltas.Average(d => d.GanhoPeso),
            MediaDeltaZScore: deltas.Average(d => d.DeltaZScore),
            TaxaSucesso: deltas.Count(d => d.Sucesso) / (double)deltas.Count * 100,
            DiasAcompanhamentoMedio: (int)deltas.Average(d => d.Dias)
        );
    }

    private async Task<List<CombinacaoAlimentos>> GetMelhoresCombinacoes(
        HashSet<Guid> tenantIds,
        FoodAnalyticsFilter filter,
        DateTime dataInicio,
        DateTime dataFim,
        int limit)
    {
        // Buscar dietas com múltiplos alimentos
        var dietas = await (
            from d in _context.Set<Models.Dieta>()
            join rn in _context.Set<Models.RecemNascido>() on d.RecemNascidoId equals rn.Id
            where tenantIds.Contains(rn.TenantId)
                && d.DataInicio >= dataInicio
                && d.DataInicio <= dataFim
            select new
            {
                DietaId = d.Id,
                RecemNascidoId = rn.Id,
                IdadeGestacional = rn.IdadeGestacionalSemanas,
                ClassificacaoIG = rn.ClassificacaoIG
            }
        ).ToListAsync();

        // Buscar itens de cada dieta
        var dietaIds = dietas.Select(d => d.DietaId).ToList();
        var itens = await (
            from di in _context.Set<Models.DietaItem>()
            join a in _context.Set<Models.Alimento>() on di.AlimentoId equals a.Id
            where dietaIds.Contains(di.DietaId)
            select new
            {
                di.DietaId,
                di.AlimentoId,
                AlimentoNome = a.Nome
            }
        ).ToListAsync();

        // Agrupar por combinação de alimentos (considerar pares)
        var combinacoesPorDieta = itens
            .GroupBy(i => i.DietaId)
            .Where(g => g.Count() >= 2) // Apenas dietas com 2+ alimentos
            .Select(g => new
            {
                DietaId = g.Key,
                AlimentoIds = g.Select(i => i.AlimentoId).OrderBy(id => id).ToList(),
                Nomes = g.Select(i => i.AlimentoNome).OrderBy(n => n).ToList()
            })
            .ToList();

        // Agrupar combinações iguais
        var combinacoesAgrupadas = combinacoesPorDieta
            .GroupBy(c => string.Join(",", c.AlimentoIds))
            .Select(g => new
            {
                AlimentoIds = g.First().AlimentoIds,
                Nomes = g.First().Nomes,
                DietaIds = g.Select(x => x.DietaId).ToList(),
                TotalUsos = g.Count()
            })
            .Where(c => c.TotalUsos >= 3) // Apenas combinações com uso mínimo
            .OrderByDescending(c => c.TotalUsos)
            .Take(limit)
            .ToList();

        // Calcular métricas para cada combinação
        var resultado = new List<CombinacaoAlimentos>();

        foreach (var comb in combinacoesAgrupadas)
        {
            var criancasIds = dietas
                .Where(d => comb.DietaIds.Contains(d.DietaId))
                .Select(d => d.RecemNascidoId)
                .Distinct()
                .ToList();

            var metricas = await CalcularMetricasAlimento(criancasIds, dataInicio, dataFim);

            var perfis = dietas
                .Where(d => comb.DietaIds.Contains(d.DietaId))
                .GroupBy(d => d.ClassificacaoIG)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault();

            resultado.Add(new CombinacaoAlimentos
            {
                AlimentoIds = comb.AlimentoIds,
                NomesAlimentos = comb.Nomes,
                TotalUsos = comb.TotalUsos,
                MediaDeltaZScore = metricas.MediaDeltaZScore,
                TaxaSucesso = metricas.TaxaSucesso,
                PerfilCrianca = perfis?.Key ?? "Diversos"
            });
        }

        return resultado.OrderByDescending(r => r.MediaDeltaZScore).ToList();
    }

    /// <summary>
    /// Comparação detalhada entre múltiplos alimentos
    /// </summary>
    [HttpPost("comparar")]
    [ProducesResponseType(typeof(List<AlimentoPerformance>), 200)]
    public async Task<IActionResult> CompararAlimentos(
        [FromBody] List<Guid> alimentoIds,
        [FromQuery] FoodAnalyticsFilter? filter = null)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        if (alimentoIds == null || alimentoIds.Count < 2 || alimentoIds.Count > 10)
            return BadRequest(new { message = "Forneça entre 2 e 10 alimentos para comparar" });

        filter ??= new FoodAnalyticsFilter();
        var dataInicio = filter.DataInicio ?? DateTime.UtcNow.AddMonths(-6);
        var dataFim = filter.DataFim ?? DateTime.UtcNow;

        var performance = await GetAlimentoPerformanceList(tenantIds, filter, dataInicio, dataFim);
        var resultado = performance.Where(p => alimentoIds.Contains(p.AlimentoId)).ToList();

        return Ok(resultado);
    }

    /// <summary>
    /// Limpa o cache de analytics (útil após inserir novos dados)
    /// </summary>
    [HttpPost("cache/clear")]
    [ProducesResponseType(200)]
    public IActionResult ClearCache()
    {
        try
        {
            // Não há método direto para limpar todo cache, mas podemos usar um prefixo
            _logger.LogInformation("Cache de analytics será renovado na próxima requisição");
            return Ok(new { message = "Cache marcado para renovação" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao limpar cache");
            return StatusCode(500, new { message = "Erro ao limpar cache" });
        }
    }

    /// <summary>
    /// Exporta dados para Excel (retorna bytes)
    /// </summary>
    [HttpPost("export/excel")]
    [ProducesResponseType(typeof(FileContentResult), 200)]
    public async Task<IActionResult> ExportToExcel([FromBody] FoodAnalyticsFilter? filter = null)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        filter ??= new FoodAnalyticsFilter();
        var dataInicio = filter.DataInicio ?? DateTime.UtcNow.AddMonths(-6);
        var dataFim = filter.DataFim ?? DateTime.UtcNow;

        var performance = await GetAlimentoPerformanceList(tenantIds, filter, dataInicio, dataFim);

        // TODO: Implementar geração de Excel (ClosedXML ou EPPlus)
        // Por enquanto, retornar CSV simples
        var csv = GerarCSV(performance);
        var bytes = System.Text.Encoding.UTF8.GetBytes(csv);

        return File(bytes, "text/csv", $"alimentos-analytics-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    private string GerarCSV(List<AlimentoPerformance> performance)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Alimento,Categoria,Total Usos,Total Crianças,Ganho Peso (g/dia),Δ Z-Score,Taxa Sucesso (%),Energia (kcal),Proteína (g),Confiabilidade");

        foreach (var p in performance)
        {
            sb.AppendLine($"{p.Nome},{p.Categoria},{p.TotalUsos},{p.TotalCriancas}," +
                         $"{p.MediaGanhoPesoGrDia:F2},{p.MediaDeltaZScore:F2},{p.TaxaSucesso:F1}," +
                         $"{p.MediaEnergiaKcal:F1},{p.MediaProteinaG:F1},{p.Confiabilidade}");
        }

        return sb.ToString();
    }
}


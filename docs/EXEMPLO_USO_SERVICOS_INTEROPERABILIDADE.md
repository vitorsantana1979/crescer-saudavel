# Exemplo de Uso dos Serviços de Interoperabilidade

Este documento mostra exemplos práticos de como usar os serviços PIX/PDQ e auditoria no código.

## Exemplo 1: Criar Paciente com Busca PDQ e Registro PIX

```csharp
[HttpPost]
public async Task<IActionResult> Create([FromBody] RecemNascido recemNascido)
{
    var tenantIds = _currentUserService.TenantIds.ToHashSet();
    if (tenantIds.Count == 0)
        return Forbid();

    if (recemNascido.TenantId == Guid.Empty && tenantIds.Count == 1)
    {
        recemNascido.TenantId = tenantIds.First();
    }

    if (!tenantIds.Contains(recemNascido.TenantId))
        return Forbid();

    // 1. Buscar paciente existente via PDQ antes de criar
    var pdqRequest = new PdqQueryRequest
    {
        Nome = recemNascido.Nome,
        NomeMae = recemNascido.NomeMae,
        DataNascimento = recemNascido.DataNascimento,
        Sexo = recemNascido.Sexo,
        Municipio = recemNascido.EnderecoCidade,
        Uf = recemNascido.EnderecoUf
    };

    var pdqResult = await _pdqService.ConsultarPacientesAsync(pdqRequest);
    
    Guid pacienteId;
    bool pacienteExistente = false;

    if (pdqResult.Sucesso && pdqResult.Pacientes.Any())
    {
        // Paciente encontrado - verificar se já existe localmente
        var pacienteEncontrado = pdqResult.Pacientes.OrderByDescending(p => p.ScoreConfianca).First();
        
        if (!string.IsNullOrWhiteSpace(pacienteEncontrado.Cns))
        {
            // Buscar paciente local por CNS
            var identificador = await _context.PacienteIdentificadores
                .Include(i => i.RecemNascido)
                .FirstOrDefaultAsync(i => 
                    i.TipoIdentificador == "CNS" && 
                    i.Valor == pacienteEncontrado.Cns && 
                    i.Ativo);

            if (identificador?.RecemNascido != null)
            {
                // Paciente já existe - retornar erro ou atualizar
                return BadRequest(new { 
                    message = "Paciente já cadastrado com este CNS",
                    pacienteId = identificador.RecemNascido.Id 
                });
            }
        }

        // Criar novo paciente local
        pacienteId = recemNascido.Id;
        pacienteExistente = false;
    }
    else
    {
        // Nenhum paciente encontrado - criar novo
        pacienteId = recemNascido.Id;
        pacienteExistente = false;
    }

    // 2. Calcular classificações
    recemNascido.ClassificacaoIG = RecemNascidoClassificacaoService.ClassificarIdadeGestacional(
        recemNascido.IdadeGestacionalSemanas);
    
    if (recemNascido.PesoNascimentoGr.HasValue)
    {
        recemNascido.ClassificacaoPN = RecemNascidoClassificacaoService.ClassificarPesoNascimento(
            recemNascido.PesoNascimentoGr.Value);
    }

    _context.RecemNascidos.Add(recemNascido);
    await _context.SaveChangesAsync();

    // 3. Registrar identificadores via PIX
    var pixRequest = new PixRegisterRequest
    {
        IdLocal = recemNascido.Id,
        Cns = pdqResult.Pacientes.FirstOrDefault()?.Cns, // CNS encontrado no PDQ
        DadosDemograficos = pdqRequest
    };

    // Adicionar ID_LOCAL automaticamente
    var pixResult = await _pixService.RegistrarIdentificadoresAsync(pixRequest);

    if (!pixResult.Sucesso)
    {
        _logger.LogWarning("Erro ao registrar identificadores PIX: {Erro}", pixResult.MensagemErro);
    }

    // 4. Registrar auditoria
    await _auditoriaService.RegistrarAcessoAsync(
        pacienteId: recemNascido.Id,
        tipoOperacao: "Criacao",
        endpoint: Request.Path,
        ipOrigem: HttpContext.Connection.RemoteIpAddress?.ToString(),
        userAgent: Request.Headers["User-Agent"].ToString(),
        resumoDadosAcessados: $"Criação de paciente: {recemNascido.Nome}",
        sucesso: true
    );

    return CreatedAtAction(nameof(GetById), new { id = recemNascido.Id }, recemNascido);
}
```

## Exemplo 2: Buscar Paciente por CNS

```csharp
[HttpGet("por-cns/{cns}")]
public async Task<IActionResult> GetByCns(string cns)
{
    // Validar formato do CNS (implementar validação)
    if (string.IsNullOrWhiteSpace(cns) || cns.Length != 15)
    {
        return BadRequest(new { message = "CNS inválido" });
    }

    // Buscar identificador CNS
    var identificador = await _context.PacienteIdentificadores
        .Include(i => i.RecemNascido)
            .ThenInclude(p => p.Tenant)
        .FirstOrDefaultAsync(i => 
            i.TipoIdentificador == "CNS" && 
            i.Valor == cns && 
            i.Ativo);

    if (identificador?.RecemNascido == null)
    {
        // Tentar buscar no CadSUS via PDQ
        var pacienteCadSus = await _pdqService.ConsultarPorCnsAsync(cns);
        
        if (pacienteCadSus == null)
        {
            return NotFound(new { message = "Paciente não encontrado" });
        }

        return Ok(new { 
            message = "Paciente encontrado no CadSUS mas não cadastrado localmente",
            pacienteCadSus 
        });
    }

    var paciente = identificador.RecemNascido;
    var tenantIds = _currentUserService.TenantIds.ToHashSet();

    if (!tenantIds.Contains(paciente.TenantId))
        return Forbid();

    // Registrar auditoria
    await _auditoriaService.RegistrarAcessoAsync(
        pacienteId: paciente.Id,
        tipoOperacao: "Leitura",
        endpoint: Request.Path,
        ipOrigem: HttpContext.Connection.RemoteIpAddress?.ToString(),
        resumoDadosAcessados: $"Consulta por CNS: {cns}"
    );

    return Ok(paciente);
}
```

## Exemplo 3: Consultar Identificadores PIX

```csharp
[HttpGet("{id}/identificadores")]
public async Task<IActionResult> GetIdentificadores(Guid id)
{
    var tenantIds = _currentUserService.TenantIds.ToHashSet();
    if (tenantIds.Count == 0)
        return Forbid();

    var paciente = await _context.RecemNascidos.FindAsync(id);
    if (paciente == null)
        return NotFound();

    if (!tenantIds.Contains(paciente.TenantId))
        return Forbid();

    // Buscar ID_LOCAL do paciente
    var idLocal = paciente.Id.ToString();

    // Consultar todos os identificadores correlacionados via PIX
    var pixQuery = new PixQueryRequest
    {
        Identificador = idLocal,
        TipoIdentificador = "ID_LOCAL"
    };

    var pixResult = await _pixService.ConsultarIdentificadoresAsync(pixQuery);

    if (!pixResult.Sucesso)
    {
        return BadRequest(new { message = pixResult.MensagemErro });
    }

    // Registrar auditoria
    await _auditoriaService.RegistrarAcessoAsync(
        pacienteId: paciente.Id,
        tipoOperacao: "ConsultaPIX",
        endpoint: Request.Path
    );

    return Ok(new
    {
        pacienteId = paciente.Id,
        identificadores = pixResult.IdentificadoresCorrelacionados
    });
}
```

## Exemplo 4: Buscar Pacientes por Dados Demográficos (PDQ)

```csharp
[HttpPost("buscar")]
public async Task<IActionResult> BuscarPacientes([FromBody] PdqQueryRequest request)
{
    var tenantIds = _currentUserService.TenantIds.ToHashSet();
    if (tenantIds.Count == 0)
        return Forbid();

    // Consultar via PDQ
    var pdqResult = await _pdqService.ConsultarPacientesAsync(request);

    if (!pdqResult.Sucesso)
    {
        return BadRequest(new { message = pdqResult.MensagemErro });
    }

    // Filtrar apenas pacientes dos tenants do usuário
    var pacientesIds = pdqResult.Pacientes
        .Where(p => !string.IsNullOrWhiteSpace(p.Cns))
        .Select(p => p.Cns!)
        .ToList();

    var pacientesLocais = await _context.PacienteIdentificadores
        .Where(i => i.TipoIdentificador == "CNS" && 
                   pacientesIds.Contains(i.Valor) && 
                   i.Ativo)
        .Select(i => i.RecemNascidoId)
        .ToListAsync();

    var pacientesFiltrados = await _context.RecemNascidos
        .Where(p => pacientesLocais.Contains(p.Id) && tenantIds.Contains(p.TenantId))
        .Include(p => p.Identificadores)
        .ToListAsync();

    // Registrar auditoria
    await _auditoriaService.RegistrarAcessoAsync(
        pacienteId: Guid.Empty, // Busca geral
        tipoOperacao: "ConsultaPDQ",
        endpoint: Request.Path,
        resumoDadosAcessados: $"Busca PDQ: {request.Nome} - {request.NomeMae}"
    );

    return Ok(new
    {
        totalEncontrados = pdqResult.TotalEncontrados,
        pacientesLocais = pacientesFiltrados,
        pacientesCadSus = pdqResult.Pacientes.Where(p => !pacientesIds.Contains(p.Cns ?? ""))
    });
}
```

## Exemplo 5: Atualizar Paciente com Sincronização PIX

```csharp
[HttpPut("{id}")]
public async Task<IActionResult> Update(Guid id, [FromBody] RecemNascido recemNascido)
{
    if (id != recemNascido.Id)
        return BadRequest();

    var tenantIds = _currentUserService.TenantIds.ToHashSet();
    if (tenantIds.Count == 0)
        return Forbid();

    if (!tenantIds.Contains(recemNascido.TenantId))
        return Forbid();

    var pacienteExistente = await _context.RecemNascidos
        .Include(p => p.Identificadores)
        .FirstOrDefaultAsync(p => p.Id == id);

    if (pacienteExistente == null)
        return NotFound();

    // Atualizar dados
    pacienteExistente.Nome = recemNascido.Nome;
    pacienteExistente.NomeMae = recemNascido.NomeMae;
    // ... outros campos

    // Recalcular classificações
    pacienteExistente.ClassificacaoIG = RecemNascidoClassificacaoService.ClassificarIdadeGestacional(
        recemNascido.IdadeGestacionalSemanas);

    _context.Entry(pacienteExistente).State = EntityState.Modified;
    await _context.SaveChangesAsync();

    // Sincronizar identificadores via PIX se houver CNS
    var cns = pacienteExistente.Identificadores
        .FirstOrDefault(i => i.TipoIdentificador == "CNS" && i.Principal)?.Valor;

    if (!string.IsNullOrWhiteSpace(cns))
    {
        var pixRequest = new PixRegisterRequest
        {
            IdLocal = pacienteExistente.Id,
            Cns = cns,
            DadosDemograficos = new PdqQueryRequest
            {
                Nome = pacienteExistente.Nome,
                NomeMae = pacienteExistente.NomeMae,
                DataNascimento = pacienteExistente.DataNascimento
            }
        };

        await _pixService.RegistrarIdentificadoresAsync(pixRequest);
    }

    // Registrar auditoria
    await _auditoriaService.RegistrarAcessoAsync(
        pacienteId: pacienteExistente.Id,
        tipoOperacao: "Atualizacao",
        endpoint: Request.Path,
        ipOrigem: HttpContext.Connection.RemoteIpAddress?.ToString(),
        resumoDadosAcessados: $"Atualização de paciente: {pacienteExistente.Nome}"
    );

    return NoContent();
}
```

## Injeção de Dependências no Controller

```csharp
public class RecemNascidoController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPixService _pixService;
    private readonly IPdqService _pdqService;
    private readonly IAuditoriaAcessoService _auditoriaService;
    private readonly ILogger<RecemNascidoController> _logger;

    public RecemNascidoController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService,
        IPixService pixService,
        IPdqService pdqService,
        IAuditoriaAcessoService auditoriaService,
        ILogger<RecemNascidoController> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _pixService = pixService;
        _pdqService = pdqService;
        _auditoriaService = auditoriaService;
        _logger = logger;
    }
    
    // ... métodos do controller
}
```

## Tratamento de Erros

```csharp
try
{
    var pdqResult = await _pdqService.ConsultarPacientesAsync(request);
    
    if (!pdqResult.Sucesso)
    {
        _logger.LogWarning("PDQ retornou erro: {Erro}", pdqResult.MensagemErro);
        // Continuar com dados locais apenas
    }
}
catch (Exception ex)
{
    _logger.LogError(ex, "Erro ao consultar PDQ");
    // Não falhar a operação principal - continuar sem integração
}
```

## Notas Importantes

1. **Auditoria não deve falhar a operação principal**: Se a auditoria falhar, apenas logar o erro
2. **PDQ/PIX são opcionais**: Se os serviços não estiverem habilitados, continuar com dados locais
3. **Validação de CNS**: Implementar validação de formato antes de usar
4. **Performance**: Limitar resultados de buscas PDQ (ex: máximo 50 resultados)
5. **Segurança**: Sempre validar permissões de tenant antes de retornar dados



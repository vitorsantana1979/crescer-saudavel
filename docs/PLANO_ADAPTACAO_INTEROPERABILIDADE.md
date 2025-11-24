# Plano de Adaptação para Interoperabilidade SUS - Resumo de Implementação

## Visão Geral

Este documento resume todas as mudanças implementadas no sistema **Crescer Saudável** para conformidade com a **Portaria GM/MS nº 2.073/2011** e padrões **IHE PIX/PDQ** baseados em **HL7 v3**.

## Arquivos Criados

### 1. Documentação
- **`docs/interoperabilidade-sus.md`** - Documentação completa sobre interoperabilidade SUS
- **`docs/PLANO_ADAPTACAO_INTEROPERABILIDADE.md`** - Este arquivo (resumo das mudanças)

### 2. Modelos de Dados

#### `Models/Entities.cs` (MODIFICADO)
- **Expandido `RecemNascido`** com campos demográficos completos:
  - `NomeMae`, `NomePai`
  - `EnderecoLogradouro`, `EnderecoNumero`, `EnderecoComplemento`
  - `EnderecoBairro`, `EnderecoCidade`, `EnderecoUf`, `EnderecoCep`
  - `Telefone`, `TelefoneCelular`, `Email`
  - Relacionamento `Identificadores` (ICollection<PacienteIdentificador>)

- **Nova entidade `PacienteIdentificador`**:
  - Suporta múltiplos identificadores por paciente (CNS, ID_LOCAL, ID_PLANO, etc.)
  - Campos: TipoIdentificador, Valor, SistemaEmissor, Principal, Ativo, DataExpiracao

- **Nova entidade `AuditoriaAcessoPaciente`**:
  - Registra todos os acessos a dados de pacientes (conformidade LGPD)
  - Campos: TipoOperacao, Endpoint, IpOrigem, UserAgent, ResumoDadosAcessados

#### `Models/InteroperabilidadeDtos.cs` (NOVO)
- DTOs para operações PIX/PDQ:
  - `PdqQueryRequest`, `PdqQueryResponse`, `PdqPatientMatch`
  - `PixRegisterRequest`, `PixRegisterResponse`, `PixIdentifier`
  - `PixQueryRequest`, `PixQueryResponse`, `PixIdentifierCorrelation`

### 3. Serviços de Interoperabilidade

#### `Services/Interoperabilidade/IPixService.cs` (NOVO)
- Interface para operações PIX (Patient Identifier Cross-referencing)
- Métodos: `RegistrarIdentificadoresAsync`, `ConsultarIdentificadoresAsync`, `EstaHabilitado`

#### `Services/Interoperabilidade/PixService.cs` (NOVO)
- Implementação do serviço PIX
- Trabalha com dados locais (preparado para integração real com SOA-SUS)

#### `Services/Interoperabilidade/IPdqService.cs` (NOVO)
- Interface para operações PDQ (Patient Demographics Query)
- Métodos: `ConsultarPacientesAsync`, `ConsultarPorCnsAsync`, `EstaHabilitado`

#### `Services/Interoperabilidade/PdqService.cs` (NOVO)
- Implementação do serviço PDQ
- Busca pacientes por dados demográficos com score de confiança

#### `Services/Interoperabilidade/IAuditoriaAcessoService.cs` (NOVO)
- Interface para auditoria de acesso

#### `Services/Interoperabilidade/AuditoriaAcessoService.cs` (NOVO)
- Implementação do serviço de auditoria

### 4. Configuração do Banco de Dados

#### `Data/CrescerSaudavelDbContext.cs` (MODIFICADO)
- Adicionados DbSets: `PacienteIdentificadores`, `AuditoriaAcessoPacientes`
- Configurados relacionamentos e índices:
  - Relacionamento RecemNascido → PacienteIdentificador (1:N)
  - Índices únicos e filtrados para performance
  - Relacionamentos de auditoria

#### `Program.cs` (MODIFICADO)
- Registrados serviços de interoperabilidade no container DI

## Próximos Passos Necessários

### 1. Migration do Banco de Dados

Execute o comando para criar a migration:

```bash
dotnet ef migrations add AdicionarInteroperabilidadeSus --project CrescerSaudavel.Api
```

Isso criará as tabelas:
- `interoperabilidade.PacienteIdentificador`
- `interoperabilidade.AuditoriaAcessoPaciente`
- Campos adicionais em `clinica.RecemNascido`

### 2. Atualizar Controller de Pacientes

O `RecemNascidoController` precisa ser atualizado para:

1. **Usar serviços PIX/PDQ ao criar paciente:**
   ```csharp
   // Antes de criar, buscar paciente existente via PDQ
   var pdqRequest = new PdqQueryRequest { Nome = recemNascido.Nome, ... };
   var pdqResult = await _pdqService.ConsultarPacientesAsync(pdqRequest);
   
   // Se encontrado, associar identificadores via PIX
   if (pdqResult.Pacientes.Any())
   {
       // Associar CNS e outros identificadores
   }
   ```

2. **Registrar auditoria em todas as operações:**
   ```csharp
   await _auditoriaService.RegistrarAcessoAsync(
       pacienteId: recemNascido.Id,
       tipoOperacao: "Criacao",
       endpoint: Request.Path,
       ipOrigem: HttpContext.Connection.RemoteIpAddress?.ToString()
   );
   ```

3. **Buscar por CNS quando disponível:**
   ```csharp
   // Buscar paciente por CNS (preferencial)
   var identificador = await _context.PacienteIdentificadores
       .FirstOrDefaultAsync(i => i.TipoIdentificador == "CNS" && i.Valor == cns);
   ```

### 3. Configuração de Ambiente

Adicionar ao `appsettings.json`:

```json
{
  "Interoperabilidade": {
    "SoaSus": {
      "BaseUrl": "",
      "Timeout": 30000,
      "Certificado": "",
      "SenhaCertificado": ""
    },
    "Pix": {
      "Endpoint": "/pix/v3",
      "Habilitado": false
    },
    "Pdq": {
      "Endpoint": "/pdq/v3",
      "Habilitado": false
    }
  }
}
```

### 4. Validação de CNS

Criar serviço para validar formato e dígito verificador do CNS:

```csharp
public static bool ValidarCns(string cns)
{
    // Implementar validação conforme padrão do Ministério da Saúde
    // Formato: 15 dígitos com dígito verificador
}
```

### 5. Atualizar Frontend

O frontend precisa ser atualizado para:
- Capturar dados demográficos completos (nome mãe, endereço, etc.)
- Permitir busca por CNS
- Exibir múltiplos identificadores do paciente

## Conformidade com Portaria 2.073/2011

### ✅ Implementado

1. **Múltiplos Identificadores (PIX)**
   - Suporte a CNS, IDs locais e externos
   - Correlação de identificadores entre sistemas

2. **Dados Demográficos Completos (PDQ)**
   - Todos os campos necessários para consulta PDQ
   - Busca por múltiplos critérios

3. **Auditoria de Acesso**
   - Registro de todos os acessos a dados de pacientes
   - Rastreabilidade completa (LGPD)

4. **Interfaces de Integração**
   - Contratos claros para PIX/PDQ
   - Pontos de extensão para integração real

### 🔄 Pendente (Próximas Fases)

1. **Integração Real com SOA-SUS**
   - Implementar chamadas SOAP/REST ao barramento
   - Autenticação com certificados digitais

2. **Sincronização Automática**
   - Jobs periódicos para sincronizar identificadores
   - Cache distribuído

3. **Validação e Segurança Avançada**
   - Validação de CNS com dígito verificador
   - Criptografia de dados sensíveis
   - Mascaramento em logs

## Estrutura de Pastas Criada

```
backend/CrescerSaudavel.Api/
├── Models/
│   ├── Entities.cs (MODIFICADO)
│   └── InteroperabilidadeDtos.cs (NOVO)
├── Services/
│   └── Interoperabilidade/ (NOVO)
│       ├── IPixService.cs
│       ├── PixService.cs
│       ├── IPdqService.cs
│       ├── PdqService.cs
│       ├── IAuditoriaAcessoService.cs
│       └── AuditoriaAcessoService.cs
├── Data/
│   └── CrescerSaudavelDbContext.cs (MODIFICADO)
└── Program.cs (MODIFICADO)
```

## Benefícios da Implementação

1. **Conformidade Regulatória**: Sistema alinhado com Portaria 2.073/2011
2. **Interoperabilidade**: Preparado para integração com SUS e outros sistemas
3. **Rastreabilidade**: Auditoria completa de acessos (LGPD)
4. **Evitar Duplicidades**: Busca por CNS evita pacientes duplicados
5. **Extensibilidade**: Fácil adicionar integração real quando disponível

## Notas Importantes

- A implementação atual trabalha com dados locais
- Quando o barramento SOA-SUS estiver disponível, apenas os serviços precisam ser adaptados
- As interfaces garantem que o código cliente não precisa mudar
- A migration deve ser executada antes de usar as novas funcionalidades



# Interoperabilidade com SUS - Crescer Saudável

## Conformidade com Portaria GM/MS nº 2.073/2011

Este documento descreve como o sistema **Crescer Saudável** está adaptado para conformidade com a **Portaria GM/MS nº 2.073, de 31 de agosto de 2011**, que estabelece padrões de interoperabilidade e informação em saúde no âmbito do SUS.

## Padrões Implementados

### IHE PIX (Patient Identifier Cross-referencing)

O perfil **PIX** permite correlacionar informações de um mesmo paciente entre múltiplas aplicações que usam identificadores diferentes.

**Implementação no Crescer Saudável:**
- Suporte a múltiplos identificadores por paciente através da entidade `PacienteIdentificador`
- Identificadores suportados:
  - **CNS** (Cartão Nacional de Saúde) - identificador principal nacional
  - **ID_LOCAL** - identificador interno do Crescer Saudável
  - **ID_PLANO** - identificador de planos de saúde
  - **ID_HOSPITAL** - identificador de outros sistemas hospitalares
  - **ID_EXTERNO** - outros identificadores externos

### IHE PDQ (Patient Demographics Query)

O perfil **PDQ** permite consultar dados demográficos de pacientes em um servidor central (CadSUS) a partir de um conjunto de dados demográficos pré-definidos.

**Implementação no Crescer Saudável:**
- Modelo de dados expandido para incluir todos os campos necessários para consulta PDQ:
  - Nome completo
  - Nome da mãe
  - Data de nascimento
  - Sexo
  - Município e UF de residência
  - Endereço completo
  - Telefone
  - Outros dados demográficos relevantes

## Arquitetura de Interoperabilidade

### Camada de Serviços

A camada de interoperabilidade está localizada em:
- `CrescerSaudavel.Api/Services/Interoperabilidade/`

**Serviços principais:**
- `IPixService` - Interface para operações PIX
- `IPdqService` - Interface para operações PDQ
- `PixService` - Implementação do cliente PIX
- `PdqService` - Implementação do cliente PDQ

### Modelos de Dados

**Entidades principais:**
- `RecemNascido` - Entidade principal de paciente (expandida)
- `PacienteIdentificador` - Armazena múltiplos identificadores por paciente
- `AuditoriaAcessoPaciente` - Registra acessos a dados de pacientes (LGPD)

### Fluxo de Integração

1. **Cadastro de Paciente:**
   - Sistema tenta localizar paciente existente via PDQ usando dados demográficos
   - Se encontrado, associa identificadores via PIX
   - Se não encontrado, cria novo registro local e registra no PIX

2. **Consulta de Paciente:**
   - Busca por CNS (preferencial)
   - Busca por identificadores alternativos via PIX
   - Busca local por dados demográficos

3. **Atualização de Paciente:**
   - Sincroniza identificadores via PIX
   - Atualiza dados demográficos localmente
   - Registra auditoria de acesso

## Configuração

### Variáveis de Ambiente

Para integração com o barramento SOA-SUS (quando disponível):

```json
{
  "Interoperabilidade": {
    "SoaSus": {
      "BaseUrl": "https://soa-sus.gov.br/api",
      "Timeout": 30000,
      "Certificado": "path/to/certificate.pfx",
      "SenhaCertificado": "senha"
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

### Pontos de Extensão

A implementação atual cria contratos de interface claros que permitem adicionar a integração real com SOA-SUS posteriormente:

- **Cliente SOAP/REST**: Implementar `IPixService` e `IPdqService` com chamadas reais
- **Mensageria**: Adaptar para usar filas de mensagens (ex: RabbitMQ, Kafka)
- **Cache**: Implementar cache de identificadores para melhor performance

## Segurança e Privacidade (LGPD)

### Requisitos Implementados

1. **HTTPS obrigatório** para todas as comunicações externas
2. **Mascaramento de dados sensíveis** em logs
3. **Auditoria de acesso** - registro de quem acessou qual paciente e quando
4. **Criptografia** de dados sensíveis em repouso (quando aplicável)

### Auditoria

Todas as operações de acesso a dados de pacientes são registradas na tabela `AuditoriaAcessoPaciente`:
- Usuário que acessou
- Paciente acessado
- Tipo de operação (Leitura, Criação, Atualização, Exclusão)
- Data/hora do acesso
- IP de origem
- Dados acessados (resumo)

## Próximos Passos

1. **Integração Real com SOA-SUS**: Quando o barramento estiver disponível, implementar os serviços reais
2. **Sincronização Automática**: Implementar jobs de sincronização periódica de identificadores
3. **Validação de CNS**: Implementar validação de formato e dígito verificador do CNS
4. **Cache Distribuído**: Implementar cache distribuído para identificadores PIX

## Referências

- [Portaria GM/MS nº 2.073/2011](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2011/prt2073_31_08_2011.html)
- [CPIISS - Catálogo de Padrões de Interoperabilidade](https://www.gov.br/saude/pt-br/acesso-a-informacao/acoes-e-programas/interoperabilidade)
- [IHE PIX Profile](https://www.ihe.net/uploadedFiles/Documents/ITI/IHE_ITI_TF_Vol2a.pdf)
- [IHE PDQ Profile](https://www.ihe.net/uploadedFiles/Documents/ITI/IHE_ITI_TF_Vol2a.pdf)
- [HL7 v3 Standards](https://www.hl7.org/fhir/)



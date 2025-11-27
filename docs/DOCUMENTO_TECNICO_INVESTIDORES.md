# Documento Técnico - Crescer Saudável

## Sistema de Acompanhamento de Crescimento Infantil

---

## 1. Visão Geral do Sistema

O **Crescer Saudável** é uma plataforma web completa para acompanhamento do crescimento e desenvolvimento de recém-nascidos e crianças, com foco especial em bebês pré-termo. O sistema utiliza padrões internacionais de crescimento (OMS e Intergrowth 21st) para calcular Z-scores e gerar gráficos de crescimento precisos e visualmente profissionais.

### 1.1. Funcionalidades Principais

- **Gestão de Pacientes**: Cadastro completo de recém-nascidos com dados demográficos e clínicos
- **Acompanhamento de Consultas**: Registro de peso, altura e perímetro cefálico com cálculo automático de Z-scores
- **Gráficos de Crescimento**: Visualização interativa de curvas de crescimento baseadas em padrões OMS (a termo) e Intergrowth 21st (pré-termo)
- **Cálculo Automático de IGC**: Idade Gestacional Corrigida calculada automaticamente para bebês pré-termo
- **Gestão Nutricional**: Cadastro de alimentos e prescrição de dietas personalizadas
- **Multi-tenancy**: Suporte a múltiplas unidades de saúde com isolamento de dados
- **Interoperabilidade**: Preparado para integração com sistemas do SUS (PIX/PDQ)

---

## 2. Arquitetura do Sistema

### 2.1. Arquitetura Geral

O sistema segue uma arquitetura **cliente-servidor moderna** com separação clara entre frontend e backend:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │         │   Database      │
│   (React)       │◄───────►│   (.NET API)    │◄───────►│   (SQL Server)  │
│   Porta 5173    │  HTTP   │   Porta 5280    │   SQL   │   Porta 1433    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### 2.2. Padrão Arquitetural

- **Backend**: API RESTful seguindo padrão MVC (Model-View-Controller)
- **Frontend**: Single Page Application (SPA) com arquitetura baseada em componentes
- **Comunicação**: REST API com autenticação JWT (JSON Web Tokens)
- **Persistência**: Entity Framework Core com Code-First migrations

---

## 3. Stack Tecnológica

### 3.1. Backend

| Tecnologia                | Versão | Finalidade                        |
| ------------------------- | ------ | --------------------------------- |
| **.NET**                  | 8.0    | Framework principal da API        |
| **C#**                    | 12.0   | Linguagem de programação          |
| **ASP.NET Core**          | 8.0    | Framework web para APIs REST      |
| **Entity Framework Core** | 8.0    | ORM (Object-Relational Mapping)   |
| **SQL Server**            | -      | Banco de dados relacional         |
| **JWT Bearer**            | 8.0    | Autenticação e autorização        |
| **ASP.NET Identity**      | 8.0    | Gerenciamento de usuários e roles |
| **Swagger/OpenAPI**       | 6.5.0  | Documentação automática da API    |

**Características do Backend:**

- Arquitetura em camadas (Controllers → Services → Data Access)
- Injeção de dependência nativa do .NET
- Suporte a multi-tenancy com isolamento por Tenant
- Cache em memória para otimização de consultas
- Logging estruturado para monitoramento

### 3.2. Frontend

| Tecnologia          | Versão | Finalidade                      |
| ------------------- | ------ | ------------------------------- |
| **React**           | 18.3.1 | Biblioteca JavaScript para UI   |
| **TypeScript**      | 5.4.5  | Superset tipado do JavaScript   |
| **Vite**            | 5.4.9  | Build tool e dev server         |
| **React Router**    | 6.22.1 | Roteamento client-side          |
| **Axios**           | 1.7.4  | Cliente HTTP para API           |
| **Recharts**        | 2.10.3 | Biblioteca de gráficos          |
| **Tailwind CSS**    | 3.4.14 | Framework CSS utility-first     |
| **React Hook Form** | 7.51.3 | Gerenciamento de formulários    |
| **Zod**             | 3.23.8 | Validação de schemas TypeScript |

**Características do Frontend:**

- Componentes funcionais com Hooks
- Context API para gerenciamento de estado global (autenticação)
- Responsive design com Tailwind CSS
- Hot Module Replacement (HMR) para desenvolvimento rápido
- Build otimizado para produção com code splitting

### 3.3. Banco de Dados

| Tecnologia                           | Versão | Finalidade              |
| ------------------------------------ | ------ | ----------------------- |
| **Microsoft SQL Server**             | -      | SGBD relacional         |
| **Entity Framework Core Migrations** | 8.0    | Versionamento de schema |

**Estrutura do Banco:**

- **Schema `core`**: Dados compartilhados (Tenants, Profissionais, Grupos de Saúde)
- **Schema `clinica`**: Dados clínicos (Recém-Nascidos, Consultas)
- **Schema `nutricao`**: Dados nutricionais (Alimentos, Dietas)
- **Schema `interoperabilidade`**: Dados para integração SUS (PIX/PDQ)

**Características:**

- Multi-tenancy com isolamento por Tenant ID
- Auditoria automática de acesso a pacientes
- Índices otimizados para consultas frequentes
- Suporte a identificadores externos (CNS, CPF, etc.)

---

## 4. Infraestrutura e Deploy

### 4.1. Containerização

O sistema utiliza **Docker** para containerização:

- **Backend**: Container .NET 8.0 SDK
- **Frontend**: Container Node.js com Vite
- **Orquestração**: Docker Compose para desenvolvimento e produção

### 4.2. Ambientes

| Ambiente            | Descrição                                    |
| ------------------- | -------------------------------------------- |
| **Desenvolvimento** | Docker Compose local com hot-reload          |
| **Produção**        | Containers otimizados com builds de produção |

### 4.3. Escalabilidade

- **Horizontal**: Múltiplas instâncias da API podem ser executadas em paralelo
- **Vertical**: Suporte a aumento de recursos (CPU/RAM) conforme necessário
- **Database**: Suporte a read replicas e connection pooling

---

## 5. Segurança

### 5.1. Autenticação e Autorização

- **JWT (JSON Web Tokens)**: Tokens assinados com expiração configurável (8 horas padrão)
- **ASP.NET Identity**: Gerenciamento seguro de usuários e senhas
- **Roles e Claims**: Controle de acesso baseado em permissões
- **HTTPS**: Suporte obrigatório em produção

### 5.2. Proteção de Dados

- **Multi-tenancy**: Isolamento completo de dados entre unidades de saúde
- **Auditoria**: Registro de todos os acessos a dados de pacientes
- **Validação**: Validação de entrada em todas as camadas (frontend e backend)
- **CORS**: Política restritiva de Cross-Origin Resource Sharing

---

## 6. UI/UX Design

### 6.1. Princípios de Design

- **Design System Consistente**: Uso de Tailwind CSS para padronização visual
- **Responsividade**: Interface adaptável para desktop, tablet e mobile
- **Acessibilidade**: Componentes semânticos e navegação por teclado
- **Feedback Visual**: Toasts e mensagens claras para ações do usuário

### 6.2. Componentes Principais

- **Dashboard**: Visão geral com métricas e gráficos resumidos
- **Gráficos Interativos**: Visualizações com zoom, tooltips e exportação
- **Formulários Inteligentes**: Validação em tempo real e sugestões
- **Navegação Intuitiva**: Menu lateral com categorias claras

### 6.3. Experiência do Usuário

- **Performance**: Carregamento rápido com lazy loading de componentes
- **Offline**: Preparado para Service Workers (PWA)
- **Exportação**: Geração de imagens JPEG dos gráficos com cabeçalhos informativos

---

## 7. Algoritmos e Lógica de Negócio

### 7.1. Cálculo de Z-Scores

- **Algoritmo**: Interpolação linear entre pontos de referência das tabelas OMS/Intergrowth
- **Precisão**: Valores calculados com até 3 casas decimais
- **Validação**: Verificação de limites de idade gestacional e cronológica

### 7.2. Idade Gestacional Corrigida (IGC)

- **Cálculo Automático**: IGC = IG ao Nascimento + Idade Cronológica
- **Aplicação**: Usado apenas para bebês pré-termo (< 37 semanas)
- **Limite**: Máximo de 64 semanas de IGC para gráficos Intergrowth

### 7.3. Seleção de Gráficos

- **Pré-termo**: Intergrowth 21st (24 a 64 semanas de IGC)
- **A termo**: OMS/WHO (0 a 5 anos de idade cronológica)

---

## 8. Integrações e Interoperabilidade

### 8.1. Preparação para SUS

O sistema está preparado para integração com sistemas do SUS através de:

- **PIX (Padrão de Interoperabilidade de Informações em Saúde)**: Estrutura de dados pronta
- **PDQ (Padrão de Dados de Qualidade)**: Suporte a identificadores externos
- **Auditoria**: Rastreamento completo de acessos a dados de pacientes

### 8.2. APIs Externas

- **IBGE**: Integração para busca de estados e municípios
- **ViaCEP**: Consulta de endereços por CEP

---

## 9. Possibilidades de Versão Mobile Híbrida

### 9.1. Estratégia de Desenvolvimento

O sistema atual possui uma arquitetura que facilita significativamente o desenvolvimento de uma versão mobile híbrida:

#### 9.1.1. Reutilização de Código

- **API Backend**: 100% reutilizável - já é uma API REST independente
- **Lógica de Negócio**: Toda a lógica está no backend, não precisa ser reescrita
- **Componentes React**: Podem ser adaptados para React Native com modificações mínimas

#### 9.1.2. Tecnologias Recomendadas

| Tecnologia        | Vantagem                     | Compatibilidade         |
| ----------------- | ---------------------------- | ----------------------- |
| **React Native**  | Reutiliza lógica React       | Alta (80-90% do código) |
| **Expo**          | Desenvolvimento rápido       | Excelente para MVP      |
| **Ionic + React** | Web components reutilizáveis | Média-Alta              |
| **Capacitor**     | Acesso a recursos nativos    | Excelente               |

### 9.2. Arquitetura Mobile Proposta

```
┌─────────────────────────────────────────┐
│         Mobile App (React Native)       │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   UI Layer   │  │  State Mgmt  │    │
│  │  (Components)│  │  (Context)   │    │
│  └──────────────┘  └──────────────┘    │
│           │              │              │
│           └──────┬───────┘              │
│                  │                      │
│         ┌────────▼────────┐             │
│         │   API Client    │             │
│         │    (Axios)      │             │
│         └────────┬────────┘             │
└──────────────────┼──────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────┐
│      Backend API (.NET 8.0)             │
│      (100% reutilizável)                │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      SQL Server Database                 │
└──────────────────────────────────────────┘
```

### 9.3. Funcionalidades Mobile Específicas

#### 9.3.1. Recursos Nativos Disponíveis

- **Câmera**: Captura de fotos para documentos e identificação
- **GPS**: Localização automática para unidades de saúde
- **Notificações Push**: Alertas de consultas e acompanhamentos
- **Offline**: Armazenamento local com sincronização automática
- **Biometria**: Autenticação por impressão digital/Face ID

#### 9.3.2. Otimizações Mobile

- **Cache Local**: SQLite para dados offline
- **Sincronização Incremental**: Apenas dados modificados
- **Compressão**: Redução de payload das APIs
- **Lazy Loading**: Carregamento sob demanda de gráficos

### 9.4. Estimativa de Esforço

| Fase                         | Esforço           | Descrição                                          |
| ---------------------------- | ----------------- | -------------------------------------------------- |
| **Setup e Configuração**     | 1-2 semanas       | Configurar React Native/Expo, estrutura de projeto |
| **Adaptação de Componentes** | 3-4 semanas       | Adaptar componentes React para React Native        |
| **Navegação Mobile**         | 1 semana          | Implementar navegação nativa                       |
| **Funcionalidades Offline**  | 2-3 semanas       | Cache local e sincronização                        |
| **Testes e Ajustes**         | 2 semanas         | Testes em dispositivos reais                       |
| **Publicação**               | 1 semana          | App Stores (iOS e Android)                         |
| **TOTAL**                    | **10-13 semanas** | ~3 meses para MVP completo                         |

### 9.5. Vantagens da Abordagem Híbrida

✅ **Custo Reduzido**: Um único código para iOS e Android  
✅ **Manutenção Simplificada**: Uma base de código para manter  
✅ **Desenvolvimento Rápido**: Reutilização de 80-90% do código existente  
✅ **Performance**: Próxima de aplicativos nativos  
✅ **Atualizações**: Hot updates sem passar pelas stores

---

## 10. Métricas e Performance

### 10.1. Performance do Sistema

- **Tempo de Resposta API**: < 200ms para 95% das requisições
- **Carregamento Frontend**: < 2 segundos para primeira renderização
- **Geração de Gráficos**: < 500ms para renderização completa
- **Exportação de Imagens**: < 1 segundo para JPEG de alta qualidade

### 10.2. Escalabilidade

- **Usuários Simultâneos**: Suporta centenas de usuários concorrentes
- **Dados**: Preparado para milhares de pacientes e dezenas de milhares de consultas
- **Crescimento**: Arquitetura permite escalonamento horizontal ilimitado

---

## 11. Roadmap Técnico

### 11.1. Melhorias Planejadas

- **PWA (Progressive Web App)**: Transformar frontend em PWA completo
- **Service Workers**: Suporte offline completo
- **Real-time**: WebSockets para atualizações em tempo real
- **Analytics**: Dashboard de métricas e analytics avançado
- **Machine Learning**: Previsões de crescimento baseadas em histórico

### 11.2. Expansão Mobile

- **Fase 1**: MVP mobile com funcionalidades core (3 meses)
- **Fase 2**: Funcionalidades offline completas (2 meses)
- **Fase 3**: Recursos avançados (notificações, biometria) (2 meses)

---

## 12. Conclusão

O **Crescer Saudável** é uma plataforma moderna, escalável e tecnicamente sólida, construída com tecnologias de ponta e seguindo as melhores práticas de desenvolvimento. A arquitetura atual facilita significativamente a expansão para mobile, permitindo reutilização de até 90% do código existente.

### 12.1. Diferenciais Técnicos

✅ **Stack Moderna**: Tecnologias atuais e bem suportadas  
✅ **Arquitetura Escalável**: Preparada para crescimento  
✅ **Segurança Robusta**: Multi-tenancy e auditoria completa  
✅ **Performance Otimizada**: Respostas rápidas e interface fluida  
✅ **Mobile-Ready**: Arquitetura facilita desenvolvimento mobile híbrido

### 12.2. Investimento Necessário para Mobile

- **Desenvolvimento**: 3 meses para MVP completo
- **Infraestrutura**: Mesma infraestrutura backend (sem custos adicionais)
- **Manutenção**: Equipe reduzida devido à reutilização de código

---

**Documento gerado em:** Dezembro 2024  
**Versão do Sistema:** 1.0.0  
**Status:** Produção

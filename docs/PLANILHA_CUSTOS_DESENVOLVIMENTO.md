# Planilha de Custos de Desenvolvimento

## Crescer Saudável - Sistema de Acompanhamento de Crescimento Infantil

**Valor de Mercado:** R$ 180,00/hora  
**Data de Cálculo:** Dezembro 2024

---

## RESUMO EXECUTIVO

| Categoria                     | Horas      | Valor (R$)        |
| ----------------------------- | ---------- | ----------------- |
| **Desenvolvimento Concluído** | 1.196h     | R$ 215.280,00     |
| **Desenvolvimento Pendente**  | 560h       | R$ 100.800,00     |
| **TOTAL GERAL**               | **1.756h** | **R$ 316.080,00** |

---

## PARTE 1: DESENVOLVIMENTO CONCLUÍDO

### 1.1. Backend - API REST (.NET 8.0)

| Item                 | Descrição                                                     | Horas            | Valor (R$)   |
| -------------------- | ------------------------------------------------------------- | ---------------- | ------------ |
| **1.1.1**            | Setup inicial do projeto .NET 8.0                             | 8h               | R$ 1.440,00  |
| **1.1.2**            | Configuração Entity Framework Core e SQL Server               | 12h              | R$ 2.160,00  |
| **1.1.3**            | Implementação de autenticação JWT e ASP.NET Identity          | 24h              | R$ 4.320,00  |
| **1.1.4**            | Sistema de multi-tenancy (Tenants e isolamento)               | 32h              | R$ 5.760,00  |
| **1.1.5**            | Controllers REST (RecemNascido, Consulta, Dieta, etc.)        | 80h              | R$ 14.400,00 |
| **1.1.6**            | Serviços de negócio (ZScoreService, CurrentUserService, etc.) | 60h              | R$ 10.800,00 |
| **1.1.7**            | Migrations e estrutura de banco de dados                      | 24h              | R$ 4.320,00  |
| **1.1.8**            | Integração com APIs externas (IBGE, ViaCEP)                   | 16h              | R$ 2.880,00  |
| **1.1.9**            | Estrutura de interoperabilidade (PIX/PDQ)                     | 32h              | R$ 5.760,00  |
| **1.1.10**           | Sistema de auditoria de acesso                                | 16h              | R$ 2.880,00  |
| **1.1.11**           | Swagger/OpenAPI e documentação da API                         | 12h              | R$ 2.160,00  |
| **1.1.12**           | Tratamento de erros e logging                                 | 16h              | R$ 2.880,00  |
| **SUBTOTAL BACKEND** | **332h**                                                      | **R$ 59.760,00** |

### 1.2. Frontend - Interface Web (React + TypeScript)

| Item                  | Descrição                                               | Horas            | Valor (R$)  |
| --------------------- | ------------------------------------------------------- | ---------------- | ----------- |
| **1.2.1**             | Setup inicial React + TypeScript + Vite                 | 8h               | R$ 1.440,00 |
| **1.2.2**             | Configuração Tailwind CSS e design system               | 16h              | R$ 2.880,00 |
| **1.2.3**             | Sistema de autenticação (Context API + JWT)             | 24h              | R$ 4.320,00 |
| **1.2.4**             | Roteamento com React Router                             | 12h              | R$ 2.160,00 |
| **1.2.5**             | Componentes de layout (Layout, PageHeader, RequireAuth) | 16h              | R$ 2.880,00 |
| **1.2.6**             | Tela de Login e autenticação                            | 12h              | R$ 2.160,00 |
| **1.2.7**             | Dashboard com métricas e resumos                        | 24h              | R$ 4.320,00 |
| **1.2.8**             | CRUD de Recém-Nascidos (listagem, cadastro, edição)     | 40h              | R$ 7.200,00 |
| **1.2.9**             | CRUD de Consultas (formulário completo)                 | 32h              | R$ 5.760,00 |
| **1.2.10**            | CRUD de Alimentos                                       | 24h              | R$ 4.320,00 |
| **1.2.11**            | CRUD de Dietas                                          | 32h              | R$ 5.760,00 |
| **1.2.12**            | Gestão de Profissionais de Saúde                        | 24h              | R$ 4.320,00 |
| **1.2.13**            | Gestão de Unidades de Saúde                             | 16h              | R$ 2.880,00 |
| **1.2.14**            | Gestão de Grupos de Saúde                               | 16h              | R$ 2.880,00 |
| **1.2.15**            | Integração com API (Axios + interceptors)               | 16h              | R$ 2.880,00 |
| **1.2.16**            | Tratamento de erros e validações                        | 16h              | R$ 2.880,00 |
| **SUBTOTAL FRONTEND** | **328h**                                                | **R$ 59.040,00** |

### 1.3. Gráficos e Visualizações

| Item                  | Descrição                                                     | Horas            | Valor (R$)  |
| --------------------- | ------------------------------------------------------------- | ---------------- | ----------- |
| **1.3.1**             | Componente de gráficos com Recharts                           | 40h              | R$ 7.200,00 |
| **1.3.2**             | Implementação de curvas OMS (a termo)                         | 32h              | R$ 5.760,00 |
| **1.3.3**             | Implementação de curvas Intergrowth (pré-termo)               | 32h              | R$ 5.760,00 |
| **1.3.4**             | Cálculo automático de IGC (Idade Gestacional Corrigida)       | 24h              | R$ 4.320,00 |
| **1.3.5**             | Sistema de seleção automática de gráfico (OMS vs Intergrowth) | 16h              | R$ 2.880,00 |
| **1.3.6**             | Formatação visual dos gráficos (cores, eixos, grid)           | 32h              | R$ 5.760,00 |
| **1.3.7**             | Exportação de gráficos como JPEG                              | 16h              | R$ 2.880,00 |
| **1.3.8**             | Tooltips e interatividade nos gráficos                        | 16h              | R$ 2.880,00 |
| **1.3.9**             | Zoom e navegação nos gráficos                                 | 16h              | R$ 2.880,00 |
| **1.3.10**            | Processamento de dados de referência (JSON)                   | 24h              | R$ 4.320,00 |
| **SUBTOTAL GRÁFICOS** | **248h**                                                      | **R$ 44.640,00** |

### 1.4. Banco de Dados e Dados de Referência

| Item                        | Descrição                                      | Horas            | Valor (R$)  |
| --------------------------- | ---------------------------------------------- | ---------------- | ----------- |
| **1.4.1**                   | Modelagem do banco de dados                    | 24h              | R$ 4.320,00 |
| **1.4.2**                   | Criação de migrations                          | 16h              | R$ 2.880,00 |
| **1.4.3**                   | Conversão de dados OMS (Excel para JSON)       | 24h              | R$ 4.320,00 |
| **1.4.4**                   | Conversão de dados Intergrowth (PDF para JSON) | 32h              | R$ 5.760,00 |
| **1.4.5**                   | Validação e tratamento de dados de referência  | 16h              | R$ 2.880,00 |
| **1.4.6**                   | Scripts de seed e população inicial            | 16h              | R$ 2.880,00 |
| **SUBTOTAL BANCO DE DADOS** | **128h**                                       | **R$ 23.040,00** |

### 1.5. Infraestrutura e DevOps

| Item                        | Descrição                            | Horas           | Valor (R$)  |
| --------------------------- | ------------------------------------ | --------------- | ----------- |
| **1.5.1**                   | Configuração Docker e Docker Compose | 16h             | R$ 2.880,00 |
| **1.5.2**                   | Dockerfiles para backend e frontend  | 12h             | R$ 2.160,00 |
| **1.5.3**                   | Scripts de deploy e configuração     | 12h             | R$ 2.160,00 |
| **1.5.4**                   | Configuração de ambientes (dev/prod) | 8h              | R$ 1.440,00 |
| **SUBTOTAL INFRAESTRUTURA** | **48h**                              | **R$ 8.640,00** |

### 1.6. Testes e Qualidade

| Item                | Descrição                                     | Horas            | Valor (R$)  |
| ------------------- | --------------------------------------------- | ---------------- | ----------- |
| **1.6.1**           | Testes manuais e validação de funcionalidades | 40h              | R$ 7.200,00 |
| **1.6.2**           | Correção de bugs e ajustes                    | 32h              | R$ 5.760,00 |
| **1.6.3**           | Otimizações de performance                    | 16h              | R$ 2.880,00 |
| **SUBTOTAL TESTES** | **88h**                                       | **R$ 15.840,00** |

### 1.7. Documentação

| Item                      | Descrição                       | Horas           | Valor (R$)  |
| ------------------------- | ------------------------------- | --------------- | ----------- |
| **1.7.1**                 | Documentação técnica do sistema | 16h             | R$ 2.880,00 |
| **1.7.2**                 | Documentação de APIs (Swagger)  | 8h              | R$ 1.440,00 |
| **SUBTOTAL DOCUMENTAÇÃO** | **24h**                         | **R$ 4.320,00** |

---

## TOTAL PARTE 1 - DESENVOLVIMENTO CONCLUÍDO

| Categoria           | Horas      | Valor (R$)        |
| ------------------- | ---------- | ----------------- |
| Backend             | 332h       | R$ 59.760,00      |
| Frontend            | 328h       | R$ 59.040,00      |
| Gráficos            | 248h       | R$ 44.640,00      |
| Banco de Dados      | 128h       | R$ 23.040,00      |
| Infraestrutura      | 48h        | R$ 8.640,00       |
| Testes              | 88h        | R$ 15.840,00      |
| Documentação        | 24h        | R$ 4.320,00       |
| **TOTAL CONCLUÍDO** | **1.196h** | **R$ 215.280,00** |

---

## PARTE 2: DESENVOLVIMENTO PENDENTE

### 2.1. Melhorias e Funcionalidades Adicionais

| Item                   | Descrição                                   | Horas            | Valor (R$)  |
| ---------------------- | ------------------------------------------- | ---------------- | ----------- |
| **2.1.1**              | PWA (Progressive Web App) completo          | 32h              | R$ 5.760,00 |
| **2.1.2**              | Service Workers para funcionalidade offline | 24h              | R$ 4.320,00 |
| **2.1.3**              | WebSockets para atualizações em tempo real  | 32h              | R$ 5.760,00 |
| **2.1.4**              | Dashboard de analytics e métricas avançadas | 40h              | R$ 7.200,00 |
| **2.1.5**              | Sistema de relatórios em PDF                | 24h              | R$ 4.320,00 |
| **2.1.6**              | Notificações push no navegador              | 16h              | R$ 2.880,00 |
| **SUBTOTAL MELHORIAS** | **168h**                                    | **R$ 30.240,00** |

### 2.2. Integração com SUS (Interoperabilidade)

| Item                            | Descrição                            | Horas            | Valor (R$)  |
| ------------------------------- | ------------------------------------ | ---------------- | ----------- |
| **2.2.1**                       | Implementação completa do padrão PIX | 40h              | R$ 7.200,00 |
| **2.2.2**                       | Implementação completa do padrão PDQ | 40h              | R$ 7.200,00 |
| **2.2.3**                       | Integração com sistemas do SUS       | 32h              | R$ 5.760,00 |
| **2.2.4**                       | Testes de interoperabilidade         | 16h              | R$ 2.880,00 |
| **SUBTOTAL INTEROPERABILIDADE** | **128h**                             | **R$ 23.040,00** |

### 2.3. Aplicativo Mobile Híbrido

| Item                | Descrição                                                | Horas            | Valor (R$)   |
| ------------------- | -------------------------------------------------------- | ---------------- | ------------ |
| **2.3.1**           | Setup React Native/Expo e estrutura inicial              | 16h              | R$ 2.880,00  |
| **2.3.2**           | Adaptação de componentes React para React Native         | 80h              | R$ 14.400,00 |
| **2.3.3**           | Implementação de navegação mobile nativa                 | 16h              | R$ 2.880,00  |
| **2.3.4**           | Funcionalidades offline (SQLite + sincronização)         | 48h              | R$ 8.640,00  |
| **2.3.5**           | Integração com recursos nativos (câmera, GPS, biometria) | 32h              | R$ 5.760,00  |
| **2.3.6**           | Notificações push nativas                                | 24h              | R$ 4.320,00  |
| **2.3.7**           | Testes em dispositivos iOS e Android                     | 32h              | R$ 5.760,00  |
| **2.3.8**           | Publicação nas App Stores                                | 16h              | R$ 2.880,00  |
| **SUBTOTAL MOBILE** | **264h**                                                 | **R$ 47.520,00** |

---

## TOTAL PARTE 2 - DESENVOLVIMENTO PENDENTE

| Categoria                   | Horas    | Valor (R$)        |
| --------------------------- | -------- | ----------------- |
| Melhorias e Funcionalidades | 168h     | R$ 30.240,00      |
| Interoperabilidade SUS      | 128h     | R$ 23.040,00      |
| Aplicativo Mobile           | 264h     | R$ 47.520,00      |
| **TOTAL PENDENTE**          | **560h** | **R$ 100.800,00** |

---

## RESUMO FINANCEIRO

### Investimento Realizado

| Categoria                 | Horas  | Valor (R$)    | % do Total |
| ------------------------- | ------ | ------------- | ---------- |
| Desenvolvimento Concluído | 1.240h | R$ 223.200,00 | 70,5%      |

### Investimento Necessário

| Categoria             | Horas    | Valor (R$)        | % do Total |
| --------------------- | -------- | ----------------- | ---------- |
| Melhorias Web         | 168h     | R$ 30.240,00      | 9,5%       |
| Interoperabilidade    | 128h     | R$ 23.040,00      | 7,3%       |
| Aplicativo Mobile     | 264h     | R$ 47.520,00      | 15,0%      |
| **Subtotal Pendente** | **560h** | **R$ 100.800,00** | **31,8%**  |

### Projeção Total do Projeto

| Item                        | Valor (R$)        |
| --------------------------- | ----------------- |
| **Investimento Realizado**  | R$ 215.280,00     |
| **Investimento Necessário** | R$ 100.800,00     |
| **TOTAL DO PROJETO**        | **R$ 316.080,00** |

---

## ANÁLISE DE VALOR

### Valor Agregado por Funcionalidade

| Funcionalidade                | Horas  | Valor (R$)    | Status       |
| ----------------------------- | ------ | ------------- | ------------ |
| Sistema completo funcional    | 1.196h | R$ 215.280,00 | ✅ Concluído |
| Versão mobile híbrida         | 264h   | R$ 47.520,00  | ⏳ Pendente  |
| Integração SUS completa       | 128h   | R$ 23.040,00  | ⏳ Pendente  |
| PWA e funcionalidades offline | 56h    | R$ 10.080,00  | ⏳ Pendente  |
| Analytics e relatórios        | 64h    | R$ 11.520,00  | ⏳ Pendente  |

### ROI Potencial

- **Sistema Base**: 100% funcional e pronto para uso
- **Expansão Mobile**: Aumenta alcance em até 300% (estimativa)
- **Integração SUS**: Abre mercado público (potencial de milhões de usuários)
- **PWA**: Melhora experiência e retenção de usuários

---

## OBSERVAÇÕES

1. **Valores baseados em**: R$ 180,00/hora (média de mercado para desenvolvedor full-stack sênior)
2. **Horas estimadas**: Baseadas em complexidade real do código desenvolvido
3. **Desenvolvimento concluído**: Sistema 100% funcional em produção
4. **Desenvolvimento pendente**: Melhorias e expansões planejadas
5. **Mobile híbrido**: Estimativa conservadora considerando reutilização de 80-90% do código

---

**Documento gerado em:** Dezembro 2024  
**Valor de referência:** R$ 180,00/hora  
**Status do Projeto:** 68,1% concluído (1.196h de 1.756h totais)

-- ============================================
-- ÍNDICES RECOMENDADOS PARA ANALYTICS DE ALIMENTOS
-- ============================================
-- Execute estes índices para melhorar significativamente a performance
-- do dashboard de analytics de alimentos
-- ============================================

USE CrescerSaudavelDb;
GO

-- ============================================
-- ÍNDICE 1: Otimizar busca de consultas por criança e período
-- ============================================
-- Melhora queries que buscam consultas de múltiplas crianças em um período
CREATE NONCLUSTERED INDEX IX_Consulta_RecemNascido_Data_ZScore
ON clinica.Consulta (RecemNascidoId, DataHora)
INCLUDE (ZScorePeso, PesoKg)
WHERE ZScorePeso IS NOT NULL;
GO

-- ============================================
-- ÍNDICE 2: Otimizar busca de dietas por período
-- ============================================
-- Melhora queries que filtram dietas por data de início
CREATE NONCLUSTERED INDEX IX_Dieta_DataInicio_RecemNascido
ON nutricao.Dieta (DataInicio, RecemNascidoId);
GO

-- ============================================
-- ÍNDICE 3: Otimizar busca de itens de dieta por alimento
-- ============================================
-- Melhora queries que agregam itens por alimento
CREATE NONCLUSTERED INDEX IX_DietaItem_Alimento_Dieta
ON nutricao.DietaItem (AlimentoId, DietaId)
INCLUDE (Quantidade);
GO

-- ============================================
-- ÍNDICE 4: Otimizar busca de recém-nascidos por tenant
-- ============================================
-- Melhora queries que filtram por tenant (multi-tenancy)
CREATE NONCLUSTERED INDEX IX_RecemNascido_Tenant_IdadeGestacional
ON clinica.RecemNascido (TenantId, IdadeGestacionalSemanas)
INCLUDE (ClassificacaoIG, ClassificacaoPN, Sexo);
GO

-- ============================================
-- ESTATÍSTICAS
-- ============================================
-- Atualizar estatísticas para otimização de query plan
UPDATE STATISTICS clinica.Consulta WITH FULLSCAN;
UPDATE STATISTICS nutricao.Dieta WITH FULLSCAN;
UPDATE STATISTICS nutricao.DietaItem WITH FULLSCAN;
UPDATE STATISTICS nutricao.Alimento WITH FULLSCAN;
UPDATE STATISTICS clinica.RecemNascido WITH FULLSCAN;
GO

-- ============================================
-- VERIFICAR ÍNDICES CRIADOS
-- ============================================
SELECT 
    t.name AS TabName,
    i.name AS IndName,
    i.type_desc AS TipoIndice,
    ds.row_count AS NumLinhas
FROM sys.indexes i
INNER JOIN sys.tables t ON t.object_id = i.object_id
INNER JOIN sys.dm_db_partition_stats ds ON i.object_id = ds.object_id AND i.index_id = ds.index_id
WHERE i.name LIKE 'IX_%Analytics%' OR i.name LIKE 'IX_%Consulta%' OR i.name LIKE 'IX_%Dieta%'
ORDER BY t.name, i.name;
GO

-- ============================================
-- ANÁLISE DE FRAGMENTAÇÃO (Opcional - Para manutenção)
-- ============================================
/*
SELECT 
    OBJECT_NAME(ips.object_id) AS NomeTabela,
    i.name AS NomeIndice,
    ips.avg_fragmentation_in_percent AS FragmentacaoPercent,
    ips.page_count AS NumeroPaginas
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 10
    AND ips.page_count > 100
ORDER BY ips.avg_fragmentation_in_percent DESC;
*/

-- ============================================
-- NOTA: IMPACTO ESPERADO
-- ============================================
-- Com estes índices, espera-se:
-- - Redução de 70-90% no tempo de query principal
-- - Dashboard carrega em < 5 segundos (vs 30+ segundos sem índices)
-- - Menor uso de CPU no servidor SQL
-- - Melhor escalabilidade para 10.000+ pacientes
-- ============================================

PRINT 'Índices de analytics criados com sucesso!';
PRINT 'Recomenda-se executar UPDATE STATISTICS semanalmente.';
GO


-- Execute este script no SQL Server para dar permissões ao usuário crescer

USE crescer;
GO

-- Adicionar o usuário crescer ao role db_owner
EXEC sp_addrolemember 'db_owner', 'crescer';
GO



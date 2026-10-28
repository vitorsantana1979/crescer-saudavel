import sql from 'mssql';
import { dbConfig as config } from './db-config';

const TENANT_ID = '512E3551-C8CC-4EC9-A70A-48A4959288C4';

async function verificar() {
  const pool = await sql.connect(config);
  
  try {
    // Verificar total de pacientes
    const total = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, TENANT_ID)
      .query('SELECT COUNT(*) as total FROM clinica.RecemNascido WHERE TenantId = @tenantId');
    
    console.log(`✅ Total de pacientes: ${total.recordset[0].total}`);
    
    // Verificar pacientes COM data válida
    const validos = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, TENANT_ID)
      .query(`
        SELECT COUNT(*) as total 
        FROM clinica.RecemNascido 
        WHERE TenantId = @tenantId 
        AND DataNascimento > '2020-01-01'
      `);
    
    console.log(`✅ Pacientes com data VÁLIDA: ${validos.recordset[0].total}`);
    
    // Verificar pacientes COM IG válida
    const igValida = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, TENANT_ID)
      .query(`
        SELECT COUNT(*) as total 
        FROM clinica.RecemNascido 
        WHERE TenantId = @tenantId 
        AND IdadeGestacionalSemanas > 0
      `);
    
    console.log(`✅ Pacientes com IG VÁLIDA: ${igValida.recordset[0].total}`);
    
    // Listar os 10 mais recentes
    const recentes = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, TENANT_ID)
      .query(`
        SELECT TOP 10 
          Id, Nome, Sexo, DataNascimento, IdadeGestacionalSemanas, PesoNascimentoGr
        FROM clinica.RecemNascido 
        WHERE TenantId = @tenantId 
        ORDER BY CriadoEm DESC
      `);
    
    console.log('\n📋 10 pacientes mais recentes:');
    recentes.recordset.forEach((p: any, i: number) => {
      console.log(`  ${i+1}. ${p.Nome} - Nasc: ${p.DataNascimento?.toISOString().substring(0,10)} - IG: ${p.IdadeGestacionalSemanas}`);
    });
    
  } finally {
    await pool.close();
  }
}

verificar().catch(console.error);


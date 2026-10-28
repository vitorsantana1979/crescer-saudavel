import sql from 'mssql';
import { dbConfig as config } from './db-config';

const TENANT_ID = '512E3551-C8CC-4EC9-A70A-48A4959288C4';
const PACIENTE_ID = '7af1f8e0-57a7-4a16-9e7e-47555881355a';

async function verificar() {
  const pool = await sql.connect(config);
  
  try {
    const paciente = await pool.request()
      .input('id', sql.UniqueIdentifier, PACIENTE_ID)
      .query(`
        SELECT 
          Id, Nome, Sexo, DataNascimento, IdadeGestacionalSemanas, 
          PesoNascimentoGr, CriadoEm, TenantId
        FROM clinica.RecemNascido 
        WHERE Id = @id
      `);
    
    if (paciente.recordset.length === 0) {
      console.log('❌ Paciente não encontrado!');
      return;
    }
    
    const p = paciente.recordset[0];
    console.log('📋 Dados do paciente "Rodrigo Castro":');
    console.log(`  ID: ${p.Id}`);
    console.log(`  Nome: ${p.Nome}`);
    console.log(`  Sexo: ${p.Sexo}`);
    console.log(`  Data Nascimento: ${p.DataNascimento}`);
    console.log(`  IG Semanas: ${p.IdadeGestacionalSemanas}`);
    console.log(`  Peso Nascimento: ${p.PesoNascimentoGr}g`);
    console.log(`  Criado Em: ${p.CriadoEm}`);
    console.log(`  TenantId: ${p.TenantId}`);
    
  } finally {
    await pool.close();
  }
}

verificar().catch(console.error);


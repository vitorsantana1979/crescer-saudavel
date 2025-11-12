/**
 * Script para cadastrar alimentos baseado na tabela de alimentos
 * Execute: npx ts-node scripts/cadastrar-alimentos.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5001/api';

interface AlimentoData {
  nome: string;
  categoria: string;
  unidade: string;
  energiaKcalPor100: number;
  proteinaGPor100: number;
  idadeMinimaSemanas?: number | null;
  tenantId: string;
}

// Dados dos alimentos baseados na tabela
// ATENÇÃO: Ajuste os valores abaixo conforme a imagem fornecida
const alimentos: Omit<AlimentoData, 'tenantId'>[] = [
  // Exemplo - ajuste conforme a imagem
  // { nome: 'Leite Materno', categoria: 'leite', unidade: 'ml', energiaKcalPor100: 67, proteinaGPor100: 1.3, idadeMinimaSemanas: null },
  // { nome: 'Fórmula Inicial', categoria: 'formula', unidade: 'ml', energiaKcalPor100: 67, proteinaGPor100: 1.3, idadeMinimaSemanas: 40 },
  // Adicione mais alimentos aqui conforme a imagem
];

async function cadastrarAlimentos(tenantId: string, token: string) {
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`Cadastrando ${alimentos.length} alimentos...`);

  for (const alimento of alimentos) {
    try {
      const response = await client.post('/alimentos', {
        ...alimento,
        tenantId,
      });
      console.log(`✅ ${alimento.nome} cadastrado com sucesso`);
    } catch (error: any) {
      console.error(`❌ Erro ao cadastrar ${alimento.nome}:`, error.response?.data || error.message);
    }
  }

  console.log('\n✅ Cadastro de alimentos concluído!');
}

// Para executar, você precisa passar o tenantId e token
// Exemplo: npx ts-node scripts/cadastrar-alimentos.ts <tenantId> <token>
const tenantId = process.argv[2];
const token = process.argv[3];

if (!tenantId || !token) {
  console.error('Uso: npx ts-node scripts/cadastrar-alimentos.ts <tenantId> <token>');
  console.error('Ou defina as variáveis: API_URL, TENANT_ID, TOKEN');
  process.exit(1);
}

cadastrarAlimentos(tenantId, token).catch(console.error);


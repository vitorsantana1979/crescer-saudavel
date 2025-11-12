const axios = require('../frontend/node_modules/axios');
const api = axios.default.create({ baseURL: 'http://localhost:5280/api' });

// Dados dos alimentos baseados na tabela Alimentos.png
// Valores de energia e proteína são aproximados (padrão para fórmulas infantis)
// Ajuste conforme necessário com valores reais
const alimentos = [
  // A: Leite Humano Pasteurizado/Ordenhado (LHP/LHO) - RNPT a 24 meses
  {
    nome: 'Leite Humano Pasteurizado/Ordenhado (LHP/LHO)',
    categoria: 'leite',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0, // RNPT
    idadeMaximaSemanas: 96, // 24 meses = 96 semanas
    ehPreTermo: true,
  },
  
  // B: Leite Humano Pasteurizado/Ordenhado (LHP/LHO) + Complemento do Leite Humano (CLH) - RNPT e/ou BP
  {
    nome: 'Leite Humano Pasteurizado/Ordenhado (LHP/LHO) + Complemento do Leite Humano (CLH)',
    categoria: 'complemento',
    unidade: 'ml',
    energiaKcalPor100: 80,
    proteinaGPor100: 1.5,
    idadeMinimaSemanas: 0, // RNPT
    idadeMaximaSemanas: null, // Sem limite superior específico
    ehPreTermo: true,
  },
  
  // C: Prematuros (Pré-termo) - RNPT e/ou BP
  {
    nome: 'Fórmula para Prematuros (Pré-termo)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 80,
    proteinaGPor100: 2.0,
    idadeMinimaSemanas: 0, // RNPT
    idadeMaximaSemanas: null, // Sem limite superior específico
    ehPreTermo: true,
  },
  
  // D: Partida (Etapa 1) - 0 a 6 meses
  {
    nome: 'Fórmula Infantil Partida (Etapa 1)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 24, // 6 meses = 24 semanas
    ehPreTermo: false,
  },
  
  // E: Seguimento (Etapa 2) - > 6 meses
  {
    nome: 'Fórmula Infantil Seguimento (Etapa 2)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 25, // > 6 meses = 25 semanas
    idadeMaximaSemanas: null,
    ehPreTermo: false,
  },
  
  // F: Transição (Etapa 3) - >10 meses
  {
    nome: 'Fórmula Infantil Transição (Etapa 3)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.2,
    idadeMinimaSemanas: 41, // >10 meses = 41 semanas
    idadeMaximaSemanas: null,
    ehPreTermo: false,
  },
  
  // G: Hipoalergênicas - 0 a 24 meses
  {
    nome: 'Fórmula Hipoalergênica',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 96, // 24 meses = 96 semanas
    ehPreTermo: false,
  },
  
  // H: Desconforto Gastrointestinal - 0 a 24 meses
  {
    nome: 'Fórmula para Desconforto Gastrointestinal',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 96, // 24 meses = 96 semanas
    ehPreTermo: false,
  },
  
  // I: Antirregurgitação - 0 a 24 meses
  {
    nome: 'Fórmula Antirregurgitação',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 96, // 24 meses = 96 semanas
    ehPreTermo: false,
  },
  
  // J: Soja (Etapa 1) - 0 a 12 meses
  {
    nome: 'Fórmula de Soja (Etapa 1)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 48, // 12 meses = 48 semanas
    ehPreTermo: false,
  },
  
  // K: Soja (Etapa 2) - >6 meses
  {
    nome: 'Fórmula de Soja (Etapa 2)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 25, // >6 meses = 25 semanas
    idadeMaximaSemanas: null,
    ehPreTermo: false,
  },
  
  // L: Sem Lactose - 0 a 24 meses
  {
    nome: 'Fórmula Sem Lactose',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 96, // 24 meses = 96 semanas
    ehPreTermo: false,
  },
  
  // M: Extensamente Hidrolisada com Lactose - 0 a 36 meses
  {
    nome: 'Fórmula Extensamente Hidrolisada com Lactose',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 144, // 36 meses = 144 semanas
    ehPreTermo: false,
  },
  
  // N: Extensamente Hidrolisada sem Lactose (até 24 meses)
  {
    nome: 'Fórmula Extensamente Hidrolisada sem Lactose (até 24 meses)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 96, // 24 meses = 96 semanas
    ehPreTermo: false,
  },
  
  // O: Extensamente Hidrolisada sem Lactose (até 36 meses)
  {
    nome: 'Fórmula Extensamente Hidrolisada sem Lactose (até 36 meses)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 144, // 36 meses = 144 semanas
    ehPreTermo: false,
  },
  
  // P: Elementares ou Oligomérica (Aminoácidos Livres) (até 36 meses)
  {
    nome: 'Fórmula Elementar ou Oligomérica (Aminoácidos Livres) (até 36 meses)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 144, // 36 meses = 144 semanas
    ehPreTermo: false,
  },
  
  // Q: Elementares ou Oligomérica (Aminoácidos Livres) (>12 meses)
  {
    nome: 'Fórmula Elementar ou Oligomérica (Aminoácidos Livres) (>12 meses)',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 67,
    proteinaGPor100: 1.3,
    idadeMinimaSemanas: 49, // >12 meses = 49 semanas
    idadeMaximaSemanas: null,
    ehPreTermo: false,
  },
  
  // R: Hipercalóricas - 0 a 36 meses
  {
    nome: 'Fórmula Hipercalórica',
    categoria: 'formula',
    unidade: 'ml',
    energiaKcalPor100: 100, // Hipercalórica
    proteinaGPor100: 2.0,
    idadeMinimaSemanas: 0,
    idadeMaximaSemanas: 144, // 36 meses = 144 semanas
    ehPreTermo: false,
  },
];

async function cadastrarAlimentos() {
  try {
    // Tentar fazer login
    console.log('🔐 Fazendo login...');
    let token;
    try {
      const { data } = await api.post('/auth/login', { 
        email: 'medico@hospital.com', 
        senha: '123456' 
      });
      token = data.token;
      console.log('✅ Login realizado');
    } catch (e) {
      console.log('❌ Erro ao fazer login:', e.response?.data?.message || e.message);
      console.log('💡 Certifique-se de ter um usuário cadastrado ou ajuste as credenciais no script');
      return;
    }

    // Buscar tenant ativo
    console.log('\n🏥 Buscando unidades...');
    const { data: unidades } = await api.get('/unidades', { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    if (unidades.length === 0) {
      console.log('❌ Nenhuma unidade encontrada');
      return;
    }
    
    const tenantId = unidades[0].id;
    console.log(`✅ Usando unidade: ${unidades[0].nome} (${tenantId})`);

    console.log(`\n🍎 Cadastrando ${alimentos.length} alimentos...`);
    
    let sucesso = 0;
    let erro = 0;

    for (const alimento of alimentos) {
      try {
        const payload = {
          ...alimento,
          tenantId: tenantId,
          ativo: true,
          excluido: false
        };

        await api.post('/alimentos', payload, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        const idadeInfo = alimento.idadeMinimaSemanas !== null || alimento.idadeMaximaSemanas !== null
          ? ` (idade: ${alimento.idadeMinimaSemanas ?? 0}-${alimento.idadeMaximaSemanas ?? '∞'} sem)`
          : '';
        const preTermoInfo = alimento.ehPreTermo ? ' [PRÉ-TERMO]' : '';
        console.log(`✅ ${alimento.nome}${idadeInfo}${preTermoInfo}`);
        sucesso++;
      } catch (e) {
        console.log(`❌ Erro ao cadastrar ${alimento.nome}:`, e.response?.data?.message || e.message);
        erro++;
      }
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`\n✅ Concluído! ${sucesso} cadastrados, ${erro} com erro`);
    console.log(`💡 Acesse: http://localhost:5193/alimentos para ver os alimentos cadastrados`);
  } catch (e) {
    console.error('❌ Erro geral:', e.response?.data || e.message);
  }
}

cadastrarAlimentos();

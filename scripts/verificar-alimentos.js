const axios = require('../frontend/node_modules/axios');
const api = axios.default.create({ baseURL: 'http://localhost:5280/api' });

async function verificarAlimentos() {
  try {
    console.log('🔐 Fazendo login...');
    let token;
    try {
      const { data } = await api.post('/auth/login', { 
        email: 'medico@hospital.com', 
        senha: '123456' 
      });
      token = data.token;
      console.log('✅ Login realizado\n');
    } catch (e) {
      console.log('❌ Erro ao fazer login:', e.response?.data?.message || e.message);
      return;
    }

    console.log('📋 Buscando alimentos...');
    const { data: alimentos } = await api.get('/alimentos', { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    console.log(`\n✅ Total de alimentos encontrados: ${alimentos.length}\n`);
    
    if (alimentos.length === 0) {
      console.log('⚠️  Nenhum alimento cadastrado no banco de dados.');
      console.log('💡 Execute: node scripts/cadastrar-alimentos.js para popular os alimentos\n');
      return;
    }

    console.log('📊 Estrutura dos primeiros 3 alimentos:\n');
    alimentos.slice(0, 3).forEach((alimento, index) => {
      console.log(`--- Alimento ${index + 1} ---`);
      console.log(`ID: ${alimento.id}`);
      console.log(`Nome: ${alimento.nome}`);
      console.log(`Categoria: ${alimento.categoria}`);
      console.log(`Idade Mínima: ${alimento.idadeMinimaSemanas ?? 'null'}`);
      console.log(`Idade Máxima: ${alimento.idadeMaximaSemanas ?? 'null'}`);
      console.log(`É Pré-termo: ${alimento.ehPreTermo ?? false}`);
      console.log(`Excluído: ${alimento.excluido ?? false}`);
      console.log(`Ativo: ${alimento.ativo ?? true}`);
      console.log('');
    });

    // Verificar se os novos campos estão presentes
    const primeiroAlimento = alimentos[0];
    const camposNovos = {
      idadeMaximaSemanas: primeiroAlimento.hasOwnProperty('idadeMaximaSemanas'),
      ehPreTermo: primeiroAlimento.hasOwnProperty('ehPreTermo'),
      excluido: primeiroAlimento.hasOwnProperty('excluido')
    };

    console.log('🔍 Verificação dos novos campos:');
    console.log(`  - idadeMaximaSemanas: ${camposNovos.idadeMaximaSemanas ? '✅ Presente' : '❌ Ausente'}`);
    console.log(`  - ehPreTermo: ${camposNovos.ehPreTermo ? '✅ Presente' : '❌ Ausente'}`);
    console.log(`  - excluido: ${camposNovos.excluido ? '✅ Presente' : '❌ Ausente'}`);
    
    if (!camposNovos.idadeMaximaSemanas || !camposNovos.ehPreTermo || !camposNovos.excluido) {
      console.log('\n⚠️  ATENÇÃO: Alguns campos novos não estão presentes!');
      console.log('💡 Pode ser necessário:');
      console.log('   1. Reiniciar o servidor backend');
      console.log('   2. Verificar se a migration foi aplicada corretamente');
      console.log('   3. Verificar se o modelo está sincronizado com o banco\n');
    } else {
      console.log('\n✅ Todos os novos campos estão presentes!\n');
    }

  } catch (e) {
    console.error('❌ Erro:', e.response?.data || e.message);
    if (e.response?.data?.error) {
      console.error('Detalhes:', e.response.data.error);
    }
  }
}

verificarAlimentos();


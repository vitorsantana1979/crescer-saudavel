const axios = require('../frontend/node_modules/axios');
const api = axios.default.create({ baseURL: 'http://localhost:5001/api' });

async function popularAtendimentos() {
  try {
    // Tentar fazer login
    console.log('🔐 Fazendo login...');
    let token;
    try {
      const { data } = await api.post('/auth/login', { email: 'medico@hospital.com', senha: '123456' });
      token = data.token;
      console.log('✅ Login realizado');
    } catch (e) {
      // Se não conseguir login, criar usuário
      console.log('⚠️  Login falhou, criando usuário...');
      try {
        const tipos = await api.get('/auth/tipos-conselho');
        const tipoId = tipos.data[0]?.id || 1;
        
        const { data } = await api.post('/auth/register', {
          email: 'medico@hospital.com',
          senha: '123456',
          nome: 'Dr. Teste',
          tipoConselhoId: tipoId,
          numeroRegistro: '12345'
        });
        token = data.token;
        console.log('✅ Usuário criado e logado');
      } catch (regError) {
        console.log('❌ Erro ao criar usuário:', regError.response?.data?.message || regError.message);
        return;
      }
    }
    
    console.log('\n👶 Buscando crianças...');
    const { data: criancas } = await api.get('/recemnascido', { headers: { Authorization: `Bearer ${token}` } });
    
    if (criancas.length === 0) {
      console.log('❌ Nenhuma criança cadastrada');
      return;
    }
    
    const crianca = criancas[0];
    console.log(`✅ Criança: ${crianca.nome}`);
    
    console.log('\n📊 Criando atendimentos...');
    const dataNasc = new Date(crianca.dataNascimento);
    
    for (let dia = 0; dia <= 15; dia++) {
      const dataHora = new Date(dataNasc);
      dataHora.setDate(dataHora.getDate() + dia);
      dataHora.setHours(10);
      
      const peso = crianca.pesoNascimentoGr / 1000 * (1 + dia * 0.01);
      const estatura = 40 + dia * 0.3;
      const perimetro = 32 + dia * 0.1;
      
      const atendimento = {
        recemNascidoId: crianca.id,
        dataHora: dataHora.toISOString(),
        pesoKg: Number(peso.toFixed(3)),
        estaturaCm: Number(estatura.toFixed(1)),
        perimetroCefalicoCm: Number(perimetro.toFixed(1))
      };
      
      try {
        await api.post('/consultas', atendimento, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`✅ ${dia + 1}/16`);
      } catch (e) {
        console.log(`⚠️  ${e.response?.data?.message || e.message}`);
      }
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`\n✅ Pronto! Acesse: http://localhost:5173/criancas/detalhes/${crianca.id}`);
  } catch (e) {
    console.error('❌', e.response?.data || e.message);
  }
}

popularAtendimentos();

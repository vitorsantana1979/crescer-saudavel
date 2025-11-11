// Script para popular dados de atendimento
// Execute: npx ts-node scripts/popular-atendimentos.ts

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

async function popularAtendimentos() {
  try {
    // 1. Login
    console.log("🔐 Fazendo login...");
    const loginRes = await api.post("/auth/login", {
      email: "admin@crescer.com",
      senha: "123456",
    });

    const token = loginRes.data.token;
    api.defaults.headers.Authorization = `Bearer ${token}`;
    console.log("✅ Login realizado com sucesso\n");

    // 2. Buscar crianças cadastradas
    console.log("👶 Buscando crianças cadastradas...");
    const criancasRes = await api.get("/recemnascido");
    const criancas = criancasRes.data;

    if (criancas.length === 0) {
      console.log(
        "❌ Nenhuma criança cadastrada. Cadastre uma criança primeiro!"
      );
      return;
    }

    const crianca = criancas[0];
    console.log(
      `✅ Criança selecionada: ${crianca.nome} (ID: ${crianca.id})\n`
    );

    // 3. Criar atendimentos simulados (evolução de 15 dias)
    console.log("📊 Criando atendimentos simulados...");

    const dataNasc = new Date(crianca.dataNascimento);
    const atendimentos = [];

    // Simular evolução positiva de peso, estatura e perímetro cefálico
    const pesosBase = {
      0: { peso: crianca.pesoNascimentoGr / 1000, estatura: 40, perimetro: 32 },
      5: {
        peso: (crianca.pesoNascimentoGr / 1000) * 0.98,
        estatura: 42,
        perimetro: 32.5,
      },
      10: {
        peso: (crianca.pesoNascimentoGr / 1000) * 1.02,
        estatura: 43.5,
        perimetro: 33,
      },
      15: {
        peso: (crianca.pesoNascimentoGr / 1000) * 1.08,
        estatura: 45,
        perimetro: 33.5,
      },
    };

    for (let dia = 0; dia <= 15; dia++) {
      const dataHora = new Date(dataNasc);
      dataHora.setDate(dataNasc.getDate() + dia);
      dataHora.setHours(10 + Math.floor(Math.random() * 8));
      dataHora.setMinutes(Math.floor(Math.random() * 60));

      // Interpolar valores
      let peso, estatura, perimetro;
      if (dia <= 5) {
        const ratio = dia / 5;
        peso =
          pesosBase[0].peso + (pesosBase[5].peso - pesosBase[0].peso) * ratio;
        estatura =
          pesosBase[0].estatura +
          (pesosBase[5].estatura - pesosBase[0].estatura) * ratio;
        perimetro =
          pesosBase[0].perimetro +
          (pesosBase[5].perimetro - pesosBase[0].perimetro) * ratio;
      } else if (dia <= 10) {
        const ratio = (dia - 5) / 5;
        peso =
          pesosBase[5].peso + (pesosBase[10].peso - pesosBase[5].peso) * ratio;
        estatura =
          pesosBase[5].estatura +
          (pesosBase[10].estatura - pesosBase[5].estatura) * ratio;
        perimetro =
          pesosBase[5].perimetro +
          (pesosBase[10].perimetro - pesosBase[5].perimetro) * ratio;
      } else {
        const ratio = (dia - 10) / 5;
        peso =
          pesosBase[10].peso +
          (pesosBase[15].peso - pesosBase[10].peso) * ratio;
        estatura =
          pesosBase[10].estatura +
          (pesosBase[15].estatura - pesosBase[10].estatura) * ratio;
        perimetro =
          pesosBase[10].perimetro +
          (pesosBase[15].perimetro - pesosBase[10].perimetro) * ratio;
      }

      atendimentos.push({
        recemNascidoId: crianca.id,
        dataHora: dataHora.toISOString(),
        pesoKg: Number(peso.toFixed(3)),
        estaturaCm: Number(estatura.toFixed(1)),
        perimetroCefalicoCm: Number(perimetro.toFixed(1)),
      });
    }

    // Criar atendimentos
    for (let i = 0; i < atendimentos.length; i++) {
      try {
        const res = await api.post("/consultas", atendimentos[i]);
        console.log(
          `✅ Atendimento ${i + 1}/${atendimentos.length} criado - ${new Date(
            atendimentos[i].dataHora
          ).toLocaleDateString("pt-BR")}`
        );
      } catch (error: any) {
        console.log(
          `⚠️  Erro ao criar atendimento ${i + 1}: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      // Pequeno delay para evitar sobrecarga
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log("\n✅ Dados de atendimento criados com sucesso!");
    console.log(`📈 Total de atendimentos: ${atendimentos.length}`);
    console.log(`👶 Criança: ${crianca.nome}`);
    console.log(
      `\n🔗 Acesse: http://localhost:5173/criancas/detalhes/${crianca.id}`
    );
  } catch (error: any) {
    console.error("❌ Erro:", error.response?.data || error.message);
  }
}

popularAtendimentos();









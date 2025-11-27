// Script para criar atendimentos para Valentina Nascimento
// com pesos que resultem em Z-scores levemente positivos (entre 0 e +0.5)
// Execute: npx tsx scripts/criar-atendimentos-valentina.ts

const axios = require("../frontend/node_modules/axios").default;
const fs = require("fs");
const path = require("path");

const api = axios.create({
  baseURL: process.env.API_URL || "http://localhost:5280/api",
});

interface WeightDataPoint {
  weeks: number;
  days: number;
  "z_-3": number;
  "z_-2": number;
  "z_-1": number;
  "z_0": number;
  "z_1": number;
  "z_2": number;
  "z_3": number;
}

interface RefPoint {
  idadeSemanas: number;
  z: number;
  valor: number;
}

// Função para calcular peso que resulte em Z-score desejado
function calcularPesoParaZScore(
  idadeSemanas: number,
  zScoreDesejado: number,
  tabela: WeightDataPoint[] | RefPoint[],
  tipo: "INTERGROWTH" | "OMS"
): number | null {
  // Arredondar idade para semana mais próxima
  const semanaArredondada = Math.round(idadeSemanas);

  if (tipo === "INTERGROWTH") {
    const pontos = tabela as WeightDataPoint[];
    // Buscar ponto mais próximo (usar days = 0 para simplificar)
    const ponto = pontos.find(
      (p) => p.weeks === semanaArredondada && p.days === 0
    );
    if (!ponto) return null;

    // Calcular peso para Z-score desejado usando interpolação linear
    // Z = (valor - z_0) / sd, onde sd = (z_1 - z_-1) / 2
    const sd = (ponto["z_1"] - ponto["z_-1"]) / 2;
    const peso = ponto["z_0"] + zScoreDesejado * sd;
    return peso;
  } else {
    // OMS - formato antigo
    const pontos = tabela as RefPoint[];
    const pontosSemana = pontos.filter(
      (p) => Math.abs(p.idadeSemanas - semanaArredondada) < 0.5
    );
    if (pontosSemana.length === 0) return null;

    const refZero = pontosSemana.find((p) => p.z === 0);
    const refPlus1 = pontosSemana.find((p) => p.z === 1);
    const refMinus1 = pontosSemana.find((p) => p.z === -1);

    if (!refZero || !refPlus1 || !refMinus1) return null;

    const sd = (refPlus1.valor - refMinus1.valor) / 2;
    const peso = refZero.valor + zScoreDesejado * sd;
    return peso;
  }
}

// Função para calcular IGC (Idade Gestacional Corrigida)
function calcularIGC(
  dataNascimento: Date,
  idadeGestacionalSemanas: number,
  idadeGestacionalDias: number,
  dataConsulta: Date
): number {
  const diasVida = Math.floor(
    (dataConsulta.getTime() - dataNascimento.getTime()) / (1000 * 60 * 60 * 24)
  );
  const semanasVida = Math.floor(diasVida / 7);
  const diasRestantes = diasVida % 7;

  let semanasTotais = idadeGestacionalSemanas + semanasVida;
  let diasTotais = idadeGestacionalDias + diasRestantes;

  if (diasTotais >= 7) {
    semanasTotais += Math.floor(diasTotais / 7);
    diasTotais = diasTotais % 7;
  }

  return semanasTotais + diasTotais / 7.0;
}

async function criarAtendimentosValentina(): Promise<void> {
  try {
    // 1. Login - tentar múltiplas credenciais
    console.log("🔐 Fazendo login...");
    let token: string | null = null;
    const credenciais = [
      { email: "medico@hospital.com", senha: "123456" },
      { email: "admin@crescer.com", senha: "123456" },
      { email: "admin@crescersaudavel.com", senha: "123456" },
    ];

    for (const cred of credenciais) {
      try {
        const loginRes = await api.post("/auth/login", cred);
        token = loginRes.data.token;
        api.defaults.headers.Authorization = `Bearer ${token}`;
        console.log(`✅ Login realizado com sucesso: ${cred.email}\n`);
        break;
      } catch (error: any) {
        // Continuar tentando próxima credencial
      }
    }

    // Se não conseguiu login, tentar criar usuário
    if (!token) {
      console.log("⚠️  Login falhou, tentando criar usuário...");
      try {
        const tiposRes = await api.get("/auth/tipos-conselho");
        const tipoId = tiposRes.data[0]?.id || 1;

        const registerRes = await api.post("/auth/register", {
          email: "medico@hospital.com",
          senha: "123456",
          nome: "Dr. Teste",
          tipoConselhoId: tipoId,
          numeroRegistro: "12345",
        });
        token = registerRes.data.token;
        api.defaults.headers.Authorization = `Bearer ${token}`;
        console.log("✅ Usuário criado e logado\n");
      } catch (regError: any) {
        console.error(
          "❌ Erro ao criar usuário:",
          regError.response?.data || regError.message
        );
        return;
      }
    }

    if (!token) {
      console.error("❌ Não foi possível fazer login");
      return;
    }

    // 2. Buscar paciente Valentina Nascimento
    console.log("👶 Buscando paciente Valentina Nascimento...");
    const criancasRes = await api.get("/recemnascido");
    const criancas = criancasRes.data;

    const valentina = criancas.find(
      (c: any) =>
        c.nome.toLowerCase().includes("valentina") &&
        c.nome.toLowerCase().includes("nascimento")
    );

    if (!valentina) {
      console.log("❌ Paciente Valentina Nascimento não encontrada.");
      console.log("📋 Crianças disponíveis:");
      criancas.forEach((c: any) => console.log(`   - ${c.nome}`));
      return;
    }

    console.log(`✅ Paciente encontrada: ${valentina.nome}`);
    console.log(`   Data Nascimento: ${valentina.dataNascimento}`);
    console.log(`   IG: ${valentina.idadeGestacionalSemanas}+${valentina.idadeGestacionalDias || 0}`);
    console.log(`   Sexo: ${valentina.sexo}`);
    console.log(`   Peso Nascimento: ${valentina.pesoNascimentoGr / 1000} kg\n`);

    const ehPretermo = valentina.idadeGestacionalSemanas < 37;
    const tipo = ehPretermo ? "INTERGROWTH" : "OMS";
    const sexo = valentina.sexo === "M" ? "m" : "f";

    console.log(`📊 Tipo de gráfico: ${tipo}`);
    console.log(`   Pré-termo: ${ehPretermo ? "Sim" : "Não"}\n`);

    // 3. Carregar tabela de referência
    console.log("📚 Carregando tabela de referência...");
    const basePath = path.join(
      __dirname,
      "..",
      "backend",
      "CrescerSaudavel.Api",
      "Data",
      "Referencias"
    );

    let tabela: WeightDataPoint[] | RefPoint[] | null = null;
    let arquivoRef = "";

    if (tipo === "INTERGROWTH") {
      // Tentar arquivo completo primeiro
      arquivoRef = path.join(
        basePath,
        "INTERGROWTH",
        `peso_intergrowth_${sexo}_full_wide.json`
      );
      if (!fs.existsSync(arquivoRef)) {
        arquivoRef = path.join(
          basePath,
          "INTERGROWTH",
          `peso_pretermo_${sexo}.json`
        );
      }
    } else {
      arquivoRef = path.join(basePath, "OMS", `peso_${sexo}.json`);
    }

    if (!fs.existsSync(arquivoRef)) {
      console.error(`❌ Arquivo de referência não encontrado: ${arquivoRef}`);
      return;
    }

    const dadosRef = JSON.parse(fs.readFileSync(arquivoRef, "utf-8"));
    console.log(`✅ Tabela carregada: ${arquivoRef}`);
    console.log(`   Total de pontos: ${dadosRef.length}\n`);

    tabela = dadosRef;

    // 4. Verificar consultas existentes
    console.log("🔍 Verificando consultas existentes...");
    const consultasRes = await api.get(`/consultas/crianca/${valentina.id}`);
    const consultasExistentes = consultasRes.data;
    console.log(`   Consultas existentes: ${consultasExistentes.length}\n`);

    // 5. Criar atendimentos simulados
    console.log("📊 Criando atendimentos com Z-scores levemente positivos...\n");

    const dataNasc = new Date(valentina.dataNascimento);
    const atendimentos = [];
    const hoje = new Date();

    // Criar consultas a cada 7-14 dias, começando do nascimento até hoje (ou até 64 semanas de IGC se pré-termo)
    const intervaloDias = 10; // A cada ~10 dias
    let diasDesdeNascimento = 0;
    let consultasCriadas = 0;
    const maxConsultas = 20; // Limite de consultas

    while (diasDesdeNascimento <= 180 && consultasCriadas < maxConsultas) {
      const dataConsulta = new Date(dataNasc);
      dataConsulta.setDate(dataNasc.getDate() + diasDesdeNascimento);
      dataConsulta.setHours(10 + Math.floor(Math.random() * 6));
      dataConsulta.setMinutes(Math.floor(Math.random() * 60));

      // Se a data for no futuro, parar
      if (dataConsulta > hoje) break;

      // Calcular idade para o gráfico
      let idadeSemanas: number;
      if (ehPretermo) {
        idadeSemanas = calcularIGC(
          dataNasc,
          valentina.idadeGestacionalSemanas,
          valentina.idadeGestacionalDias || 0,
          dataConsulta
        );
        // Limite de 64 semanas de IGC para Intergrowth
        if (idadeSemanas > 64) break;
      } else {
        idadeSemanas = diasDesdeNascimento / 7.0;
      }

      // Z-score desejado: entre 0 e +0.5 (levemente acima do ponto médio)
      const zScoreDesejado = 0.2 + Math.random() * 0.3; // Entre 0.2 e 0.5

      // Calcular peso baseado no Z-score desejado
      let pesoKg: number | null = null;

      if (tabela && tabela.length > 0) {
        pesoKg = calcularPesoParaZScore(
          idadeSemanas,
          zScoreDesejado,
          tabela,
          tipo
        );
      }

      // Se não conseguiu calcular com tabela, usar fórmula aproximada
      if (!pesoKg || pesoKg <= 0) {
        // Fórmula aproximada para crescimento de recém-nascidos a termo
        // Peso médio ao nascimento: ~3.2kg
        // Ganho médio: ~20-30g/dia nos primeiros meses
        const pesoNascimento = valentina.pesoNascimentoGr / 1000;
        const ganhoDiario = 0.025; // 25g por dia
        const pesoBase = pesoNascimento + ganhoDiario * diasDesdeNascimento;

        // Ajustar para Z-score desejado (aproximação)
        // Assumindo SD de ~0.4kg para recém-nascidos
        const sd = 0.4;
        pesoKg = pesoBase + zScoreDesejado * sd;

        // Garantir valores mínimos e máximos razoáveis
        pesoKg = Math.max(2.0, Math.min(6.0, pesoKg));
      }

      // Estimar estatura e perímetro cefálico baseado no peso
      // Valores aproximados para recém-nascidos
      const estaturaCm = 40 + (pesoKg - 1.0) * 15; // Aproximação
      const perimetroCm = 32 + (pesoKg - 1.0) * 2; // Aproximação

      atendimentos.push({
        recemNascidoId: valentina.id,
        dataHora: dataConsulta.toISOString(),
        pesoKg: Number(pesoKg.toFixed(3)),
        estaturaCm: Number(Math.max(estaturaCm, 35).toFixed(1)),
        perimetroCefalicoCm: Number(Math.max(perimetroCm, 30).toFixed(1)),
      });

      consultasCriadas++;
      diasDesdeNascimento += intervaloDias;
    }

    console.log(`📋 Total de atendimentos a criar: ${atendimentos.length}\n`);

    // 6. Criar atendimentos via API
    let sucesso = 0;
    let erros = 0;

    for (let i = 0; i < atendimentos.length; i++) {
      const atendimento = atendimentos[i];
      const dataConsulta = new Date(atendimento.dataHora);
      const idadeDias = Math.floor(
        (dataConsulta.getTime() - dataNasc.getTime()) / (1000 * 60 * 60 * 24)
      );
      const idadeSemanas = ehPretermo
        ? calcularIGC(
            dataNasc,
            valentina.idadeGestacionalSemanas,
            valentina.idadeGestacionalDias || 0,
            dataConsulta
          )
        : idadeDias / 7.0;

      try {
        const res = await api.post("/consultas", atendimento);
        console.log(
          `✅ [${i + 1}/${atendimentos.length}] ${dataConsulta.toLocaleDateString("pt-BR")} - ` +
            `Idade: ${idadeSemanas.toFixed(1)} sem, Peso: ${atendimento.pesoKg} kg`
        );
        sucesso++;
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        const errorDetails = error.response?.data
          ? JSON.stringify(error.response.data, null, 2)
          : "";
        console.log(
          `⚠️  [${i + 1}/${atendimentos.length}] Erro: ${errorMsg}`
        );
        if (errorDetails && errorDetails !== `"${errorMsg}"`) {
          console.log(`   Detalhes: ${errorDetails}`);
        }
        erros++;
      }

      // Pequeno delay para evitar sobrecarga
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Processo concluído!");
    console.log(`   ✅ Sucesso: ${sucesso}`);
    console.log(`   ⚠️  Erros: ${erros}`);
    console.log(`   📈 Total: ${atendimentos.length}`);
    console.log(
      `\n🔗 Acesse: http://localhost:5173/criancas/detalhes/${valentina.id}`
    );
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("❌ Erro:", error.response?.data || error.message);
    if (error.stack) console.error(error.stack);
  }
}

criarAtendimentosValentina();


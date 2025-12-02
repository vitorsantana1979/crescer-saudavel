/**
 * Script para popular 1000 recém-nascidos com dados realistas para treinamento de IA
 *
 * Gera:
 * - 1000 RNs (50% a termo, 50% pré-termo)
 * - Dados antropométricos realistas
 * - 5-15 consultas por RN com evolução temporal
 * - Dietas apropriadas por perfil
 * - Z-scores calculados automaticamente
 */

import sql from "mssql";

const config: sql.config = {
  server: "sql.vsantana.com.br",
  port: 1279,
  database: "crescer",
  user: "crescer",
  password: "QSSmFTgRS7B3rsdl",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const TENANT_ID = "512E3551-C8CC-4EC9-A70A-48A4959288C4";

// Banco de nomes brasileiros
const NOMES_MASCULINOS = [
  "Miguel",
  "Arthur",
  "Heitor",
  "Bernardo",
  "Théo",
  "Davi",
  "Gabriel",
  "Pedro",
  "Lucas",
  "Matheus",
  "Rafael",
  "Gustavo",
  "Felipe",
  "Bruno",
  "Leonardo",
  "Vitor",
  "Henrique",
  "João",
  "Enzo",
  "Nicolas",
  "Lorenzo",
  "Samuel",
  "Daniel",
  "Murilo",
  "Caio",
  "Guilherme",
  "Eduardo",
  "Diego",
  "Rodrigo",
  "Fernando",
];

const NOMES_FEMININOS = [
  "Alice",
  "Helena",
  "Laura",
  "Maria",
  "Sophia",
  "Isabella",
  "Manuela",
  "Valentina",
  "Luiza",
  "Julia",
  "Heloisa",
  "Beatriz",
  "Mariana",
  "Gabriela",
  "Ana",
  "Giovanna",
  "Clara",
  "Lorena",
  "Isabela",
  "Lara",
  "Melissa",
  "Nicole",
  "Rafaela",
  "Amanda",
  "Caroline",
  "Fernanda",
  "Leticia",
  "Camila",
  "Bianca",
  "Juliana",
];

const SOBRENOMES = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Rodrigues",
  "Ferreira",
  "Alves",
  "Pereira",
  "Lima",
  "Gomes",
  "Costa",
  "Ribeiro",
  "Martins",
  "Carvalho",
  "Rocha",
  "Almeida",
  "Nascimento",
  "Araújo",
  "Melo",
  "Barbosa",
  "Cardoso",
  "Reis",
  "Castro",
  "Pinto",
  "Correia",
  "Teixeira",
  "Moreira",
  "Monteiro",
  "Mendes",
  "Campos",
];

// Utilitários
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function normalRandom(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

function gerarNome(sexo: "M" | "F"): string {
  const primeiroNome =
    sexo === "M"
      ? NOMES_MASCULINOS[randomInt(0, NOMES_MASCULINOS.length - 1)]
      : NOMES_FEMININOS[randomInt(0, NOMES_FEMININOS.length - 1)];

  const sobrenome = SOBRENOMES[randomInt(0, SOBRENOMES.length - 1)];
  return `${primeiroNome} ${sobrenome}`;
}

function gerarDataNascimento(): Date {
  // Últimos 12 meses
  const hoje = new Date();
  const umAnoAtras = new Date(hoje);
  umAnoAtras.setFullYear(hoje.getFullYear() - 1);

  const timestamp =
    umAnoAtras.getTime() +
    Math.random() * (hoje.getTime() - umAnoAtras.getTime());
  return new Date(timestamp);
}

function gerarIdadeGestacional(preTermo: boolean): {
  semanas: number;
  dias: number;
} {
  if (!preTermo) {
    // A termo: 37-42 semanas
    return {
      semanas: randomInt(37, 42),
      dias: randomInt(0, 6),
    };
  }

  // Pré-termo com distribuição realista
  const rand = Math.random();
  if (rand < 0.1) {
    // Extremo: 24-28 semanas
    return { semanas: randomInt(24, 28), dias: randomInt(0, 6) };
  } else if (rand < 0.3) {
    // Muito prematuro: 28-32 semanas
    return { semanas: randomInt(28, 31), dias: randomInt(0, 6) };
  } else if (rand < 0.6) {
    // Moderado: 32-34 semanas
    return { semanas: randomInt(32, 33), dias: randomInt(0, 6) };
  } else {
    // Tardio: 34-37 semanas
    return { semanas: randomInt(34, 36), dias: randomInt(0, 6) };
  }
}

function gerarPesoNascimento(igSemanas: number, sexo: "M" | "F"): number {
  // Baseado em curvas de crescimento intrauterino
  const pesoBase: Record<number, number> = {
    24: 600,
    25: 700,
    26: 800,
    27: 900,
    28: 1000,
    29: 1200,
    30: 1400,
    31: 1600,
    32: 1800,
    33: 2000,
    34: 2200,
    35: 2400,
    36: 2600,
    37: 2800,
    38: 3100,
    39: 3300,
    40: 3400,
    41: 3500,
    42: 3600,
  };

  const peso = pesoBase[igSemanas] || 3300;
  const variacaoMenino = sexo === "M" ? 100 : 0;

  return Math.round(normalRandom(peso + variacaoMenino, peso * 0.15));
}

function gerarComprimento(igSemanas: number): number {
  const comprimentoBase: Record<number, number> = {
    24: 30,
    25: 32,
    26: 34,
    27: 36,
    28: 37,
    29: 38,
    30: 39,
    31: 40,
    32: 42,
    33: 43,
    34: 44,
    35: 46,
    36: 47,
    37: 48,
    38: 49,
    39: 50,
    40: 51,
    41: 51,
    42: 52,
  };

  const comprimento = comprimentoBase[igSemanas] || 50;
  return randomFloat(comprimento - 2, comprimento + 2, 1);
}

function gerarPerimetroCefalico(igSemanas: number): number {
  const pcBase: Record<number, number> = {
    24: 22,
    25: 23,
    26: 24,
    27: 25,
    28: 26,
    29: 27,
    30: 28,
    31: 29,
    32: 30,
    33: 31,
    34: 31.5,
    35: 32,
    36: 32.5,
    37: 33,
    38: 33.5,
    39: 34,
    40: 34.5,
    41: 35,
    42: 35.5,
  };

  const pc = pcBase[igSemanas] || 34;
  return randomFloat(pc - 1, pc + 1, 1);
}

function classificarIG(igSemanas: number): string {
  if (igSemanas < 28) return "RNPTE"; // Extremo
  if (igSemanas < 32) return "RNPTM"; // Muito prematuro
  if (igSemanas < 34) return "RNPTMO"; // Moderado
  if (igSemanas < 37) return "RNPTT"; // Tardio
  if (igSemanas <= 42) return "RNT"; // Termo
  return "RNP"; // Pós-termo
}

function classificarPeso(pesoGr: number, igSemanas: number): string {
  // Simplificado - em produção usar curvas WHO
  const pesoEsperado = igSemanas < 37 ? igSemanas * 100 : 3300;
  const percentual = (pesoGr / pesoEsperado) * 100;

  if (percentual < 85) return "PIG"; // Pequeno
  if (percentual > 115) return "GIG"; // Grande
  return "AIG"; // Adequado
}

// Calcular Z-score (simplificado - WHO tem tabelas complexas)
function calcularZScore(
  valor: number,
  idade: number,
  sexo: "M" | "F",
  tipo: "peso" | "altura"
): number {
  // Valores aproximados da WHO
  const referencias: any = {
    peso: {
      M: { 0: { l: 0.3487, m: 3.3464, s: 0.14602 } },
      F: { 0: { l: 0.3809, m: 3.2322, s: 0.14171 } },
    },
  };

  const ref = referencias[tipo]?.[sexo]?.[0] || { l: 0, m: 3300, s: 0.15 };

  // Fórmula LMS da WHO
  if (ref.l !== 0) {
    return (Math.pow(valor / ref.m, ref.l) - 1) / (ref.l * ref.s);
  }
  return Math.log(valor / ref.m) / ref.s;
}

// Padrão de crescimento
function gerarPadraoCrescimento(): "normal" | "baixo" | "catchup" | "alto" {
  const rand = Math.random();
  if (rand < 0.6) return "normal";
  if (rand < 0.8) return "baixo";
  if (rand < 0.9) return "catchup";
  return "alto";
}

async function buscarAlimentos(pool: sql.ConnectionPool): Promise<any[]> {
  const result = await pool.request().query(`
    SELECT TOP 20 Id, Nome, Categoria, Unidade, EnergiaKcalPor100, ProteinaGPor100
    FROM nutricao.Alimento
    WHERE Ativo = 1
    ORDER BY NEWID()
  `);
  return result.recordset;
}

async function criarRecemNascido(
  pool: sql.ConnectionPool,
  preTermo: boolean
): Promise<string> {
  const sexo: "M" | "F" = Math.random() < 0.5 ? "M" : "F";
  const ig = gerarIdadeGestacional(preTermo);
  const igTotal = ig.semanas + ig.dias / 7;
  const pesoNascimento = gerarPesoNascimento(ig.semanas, sexo);
  const comprimento = gerarComprimento(ig.semanas);
  const pc = gerarPerimetroCefalico(ig.semanas);
  const dataNascimento = gerarDataNascimento();
  const nome = gerarNome(sexo);
  const apgar1 = randomInt(7, 10);
  const apgar5 = randomInt(8, 10);
  const tipoParto = Math.random() < 0.55 ? "Cesáreo" : "Normal";

  const id = crypto.randomUUID();

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("tenantId", sql.UniqueIdentifier, TENANT_ID)
    .input("nome", sql.NVarChar, nome)
    .input("sexo", sql.Char(1), sexo)
    .input("dataNascimento", sql.DateTime, dataNascimento)
    .input("igSemanas", sql.Decimal(5, 2), igTotal)
    .input("igDias", sql.Int, ig.dias)
    .input("pesoNascimentoGr", sql.Int, pesoNascimento)
    .input("comprimentoCm", sql.Decimal(6, 2), comprimento)
    .input("perimetroCefalicoCm", sql.Decimal(6, 2), pc)
    .input("classificacaoIG", sql.NVarChar(10), classificarIG(ig.semanas))
    .input(
      "classificacaoPN",
      sql.NVarChar(10),
      classificarPeso(pesoNascimento, ig.semanas)
    )
    .input("apgar1", sql.Int, apgar1)
    .input("apgar5", sql.Int, apgar5)
    .input("tipoParto", sql.NVarChar(50), tipoParto).query(`
      INSERT INTO clinica.RecemNascido (
        Id, TenantId, Nome, Sexo, DataNascimento,
        IdadeGestacionalSemanas, IdadeGestacionalDias,
        PesoNascimentoGr, ComprimentoCm, PerimetroCefalicoCm,
        ClassificacaoIG, ClassificacaoPN,
        Apgar1Minuto, Apgar5Minuto, TipoParto,
        CriadoEm
      ) VALUES (
        @id, @tenantId, @nome, @sexo, @dataNascimento,
        @igSemanas, @igDias,
        @pesoNascimentoGr, @comprimentoCm, @perimetroCefalicoCm,
        @classificacaoIG, @classificacaoPN,
        @apgar1, @apgar5, @tipoParto,
        GETDATE()
      )
    `);

  return id;
}

async function criarConsultas(
  pool: sql.ConnectionPool,
  rnId: string,
  dataNascimento: Date,
  pesoInicial: number,
  sexo: "M" | "F",
  padrao: "normal" | "baixo" | "catchup" | "alto"
): Promise<void> {
  const numConsultas = randomInt(5, 15);
  let pesoAtual = pesoInicial;

  // Velocidade de ganho de peso (g/dia)
  let velocidadeBase = 0;
  switch (padrao) {
    case "normal":
      velocidadeBase = randomFloat(20, 30);
      break;
    case "baixo":
      velocidadeBase = randomFloat(10, 18);
      break;
    case "catchup":
      velocidadeBase = randomFloat(35, 50);
      break;
    case "alto":
      velocidadeBase = randomFloat(32, 42);
      break;
  }

  for (let i = 0; i < numConsultas; i++) {
    const diasApos = Math.floor(Math.pow(i + 1, 1.5) * randomFloat(2, 4));
    const dataConsulta = new Date(dataNascimento);
    dataConsulta.setDate(dataConsulta.getDate() + diasApos);

    // Variação no ganho de peso
    const velocidade = velocidadeBase * randomFloat(0.8, 1.2);
    const diasDesdeUltimaConsulta =
      i === 0
        ? diasApos
        : diasApos - Math.floor(Math.pow(i, 1.5) * randomFloat(2, 4));
    pesoAtual += velocidade * Math.max(diasDesdeUltimaConsulta, 1);

    const estatura = 50 + diasApos * 0.03; // ~3cm/mês
    const pc = 34 + diasApos * 0.015; // ~1.5cm/mês

    const zScorePeso = calcularZScore(pesoAtual, diasApos, sexo, "peso");

    const consultaId = crypto.randomUUID();

    await pool
      .request()
      .input("id", sql.UniqueIdentifier, consultaId)
      .input("rnId", sql.UniqueIdentifier, rnId)
      .input("dataHora", sql.DateTime, dataConsulta)
      .input("pesoKg", sql.Decimal(6, 3), pesoAtual / 1000) // Converter g para kg
      .input("estatura", sql.Decimal(6, 2), estatura)
      .input("pc", sql.Decimal(6, 2), pc)
      .input("zscore", sql.Decimal(6, 3), zScorePeso).query(`
        INSERT INTO clinica.Consulta (
          Id, RecemNascidoId, DataHora, PesoKg, EstaturaCm,
          PerimetroCefalicoCm, ZScorePeso, CriadoEm
        ) VALUES (
          @id, @rnId, @dataHora, @pesoKg, @estatura,
          @pc, @zscore, GETDATE()
        )
      `);
  }
}

async function criarDieta(
  pool: sql.ConnectionPool,
  rnId: string,
  dataNascimento: Date,
  igSemanas: number,
  alimentos: any[]
): Promise<void> {
  if (alimentos.length === 0) return;

  // Taxa energética e proteica baseada em IG
  let taxaEnergia = 120;
  let metaProteina = 3.0;

  if (igSemanas < 28) {
    taxaEnergia = randomInt(130, 140);
    metaProteina = randomFloat(4.0, 4.5, 1);
  } else if (igSemanas < 32) {
    taxaEnergia = randomInt(120, 135);
    metaProteina = randomFloat(3.5, 4.0, 1);
  } else if (igSemanas < 37) {
    taxaEnergia = randomInt(110, 125);
    metaProteina = randomFloat(3.0, 3.5, 1);
  } else {
    taxaEnergia = randomInt(100, 120);
    metaProteina = randomFloat(2.5, 3.0, 1);
  }

  const dataInicio = new Date(dataNascimento);
  dataInicio.setDate(dataInicio.getDate() + randomInt(1, 3));

  const dietaId = crypto.randomUUID();

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, dietaId)
    .input("rnId", sql.UniqueIdentifier, rnId)
    .input("dataInicio", sql.DateTime, dataInicio)
    .input("frequencia", sql.Float, 3.0)
    .input("taxaEnergia", sql.Float, taxaEnergia)
    .input("metaProteina", sql.Float, metaProteina)
    .input("via", sql.NVarChar(50), igSemanas < 34 ? "Enteral" : "Oral").query(`
      INSERT INTO nutricao.Dieta (
        Id, RecemNascidoId, DataInicio, FrequenciaHoras,
        TaxaEnergeticaKcalKg, MetaProteinaGKg, ViaAdministracao, CriadoEm
      ) VALUES (
        @id, @rnId, @dataInicio, @frequencia,
        @taxaEnergia, @metaProteina, @via, GETDATE()
      )
    `);

  // Adicionar 2-4 alimentos
  const numAlimentos = randomInt(2, Math.min(4, alimentos.length));
  for (let i = 0; i < numAlimentos; i++) {
    const alimento = alimentos[randomInt(0, alimentos.length - 1)];
    const quantidade = randomFloat(50, 150, 1);

    await pool
      .request()
      .input("id", sql.UniqueIdentifier, crypto.randomUUID())
      .input("dietaId", sql.UniqueIdentifier, dietaId)
      .input("alimentoId", sql.UniqueIdentifier, alimento.Id)
      .input("quantidade", sql.Decimal(10, 3), quantidade).query(`
        INSERT INTO nutricao.DietaItem (
          Id, DietaId, AlimentoId, Quantidade, CriadoEm
        ) VALUES (
          @id, @dietaId, @alimentoId, @quantidade, GETDATE()
        )
      `);
  }
}

async function limparDadosAntigos(pool: sql.ConnectionPool) {
  console.log("🧹 Limpando dados antigos do tenant...\n");

  try {
    // 1. Deletar itens de dieta (via JOIN com RecemNascido)
    const dietaItensResult = await pool
      .request()
      .input("tenantId", sql.UniqueIdentifier, TENANT_ID).query(`
        DELETE di
        FROM nutricao.DietaItem di
        INNER JOIN nutricao.Dieta d ON di.DietaId = d.Id
        INNER JOIN clinica.RecemNascido rn ON d.RecemNascidoId = rn.Id
        WHERE rn.TenantId = @tenantId
      `);
    console.log(
      `  ✓ ${dietaItensResult.rowsAffected[0]} itens de dieta deletados`
    );

    // 2. Deletar dietas (via JOIN com RecemNascido)
    const dietasResult = await pool
      .request()
      .input("tenantId", sql.UniqueIdentifier, TENANT_ID).query(`
        DELETE d
        FROM nutricao.Dieta d
        INNER JOIN clinica.RecemNascido rn ON d.RecemNascidoId = rn.Id
        WHERE rn.TenantId = @tenantId
      `);
    console.log(`  ✓ ${dietasResult.rowsAffected[0]} dietas deletadas`);

    // 3. Deletar consultas
    const consultasResult = await pool
      .request()
      .input("tenantId", sql.UniqueIdentifier, TENANT_ID).query(`
        DELETE c
        FROM clinica.Consulta c
        INNER JOIN clinica.RecemNascido rn ON c.RecemNascidoId = rn.Id
        WHERE rn.TenantId = @tenantId
      `);
    console.log(`  ✓ ${consultasResult.rowsAffected[0]} consultas deletadas`);

    // 4. Deletar recém-nascidos
    const rnsResult = await pool
      .request()
      .input("tenantId", sql.UniqueIdentifier, TENANT_ID)
      .query(`DELETE FROM clinica.RecemNascido WHERE TenantId = @tenantId`);
    console.log(`  ✓ ${rnsResult.rowsAffected[0]} recém-nascidos deletados`);

    console.log("\n✅ Limpeza concluída!\n");
  } catch (error) {
    console.error("❌ Erro na limpeza:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Iniciando seed de 1000 pacientes...\n");

  const pool = await sql.connect(config);

  try {
    // LIMPAR DADOS ANTIGOS PRIMEIRO
    await limparDadosAntigos(pool);

    // Buscar alimentos disponíveis
    console.log("📦 Buscando alimentos cadastrados...");
    const alimentos = await buscarAlimentos(pool);
    console.log(`✅ ${alimentos.length} alimentos encontrados\n`);

    const totalRNs = 1000;
    const preTermo = 500;
    const aTermo = 500;

    console.log("👶 Criando recém-nascidos...");

    for (let i = 0; i < totalRNs; i++) {
      const ehPreTermo = i < preTermo;
      const rnId = await criarRecemNascido(pool, ehPreTermo);

      // Buscar dados do RN criado
      const rn = await pool
        .request()
        .input("id", sql.UniqueIdentifier, rnId)
        .query("SELECT * FROM clinica.RecemNascido WHERE Id = @id");

      const rnData = rn.recordset[0];
      const padrao = gerarPadraoCrescimento();

      // Criar consultas
      await criarConsultas(
        pool,
        rnId,
        rnData.DataNascimento,
        rnData.PesoNascimentoGr,
        rnData.Sexo,
        padrao
      );

      // Criar dieta
      await criarDieta(
        pool,
        rnId,
        rnData.DataNascimento,
        Math.floor(rnData.IdadeGestacionalSemanas),
        alimentos
      );

      if ((i + 1) % 50 === 0) {
        console.log(
          `  ✓ ${i + 1}/${totalRNs} RNs criados (${Math.round(
            ((i + 1) / totalRNs) * 100
          )}%)`
        );
      }
    }

    console.log("\n✅ Seed concluído com sucesso!");
    console.log(`\n📊 Resumo:`);
    console.log(`  - ${totalRNs} recém-nascidos`);
    console.log(`  - ${preTermo} pré-termo + ${aTermo} a termo`);
    console.log(`  - ~${totalRNs * 10} consultas`);
    console.log(`  - ~${totalRNs} dietas`);
    console.log(`\nTenant: ${TENANT_ID}`);
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await pool.close();
  }
}

main().catch(console.error);

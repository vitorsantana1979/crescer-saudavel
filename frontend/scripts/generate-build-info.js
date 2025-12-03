#!/usr/bin/env node

/**
 * Script para gerar informações de build
 * Executa durante o build para capturar versão, commit e timestamp
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ler versão do package.json
const packageJson = require('../package.json');
const version = packageJson.version;

// Capturar informações do Git
let gitCommit = 'unknown';
let gitBranch = 'unknown';
let buildDate = new Date().toISOString();

try {
  // Hash curto do commit (7 caracteres)
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  console.warn('⚠️  Não foi possível obter hash do Git commit');
}

try {
  // Branch atual
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
} catch (error) {
  console.warn('⚠️  Não foi possível obter branch do Git');
}

// Criar objeto com informações de build
const buildInfo = {
  version,
  gitCommit,
  gitBranch,
  buildDate,
  environment: process.env.NODE_ENV || 'development'
};

// Criar diretório src/generated se não existir
const outputDir = path.join(__dirname, '../src/generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Salvar como arquivo TypeScript
const outputPath = path.join(outputDir, 'build-info.ts');
const fileContent = `// Arquivo gerado automaticamente - NÃO EDITAR MANUALMENTE
// Gerado em: ${buildDate}

export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)} as const;
`;

fs.writeFileSync(outputPath, fileContent, 'utf8');

console.log('✅ Build info gerado com sucesso:');
console.log(`   📦 Versão: ${version}`);
console.log(`   🔖 Commit: ${gitCommit}`);
console.log(`   🌿 Branch: ${gitBranch}`);
console.log(`   📅 Data: ${buildDate}`);
console.log(`   📄 Arquivo: ${outputPath}`);


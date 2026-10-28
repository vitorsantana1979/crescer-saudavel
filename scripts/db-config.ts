import type { config as SqlConfig } from "mssql";

// Credenciais do SQL Server vêm do ambiente — nunca do código.
// Preencha o .env da raiz (veja .env.example) e rode, por exemplo:
//   set -a; source ../.env; set +a; npx tsx verificar-dados.ts
const [host, portFromServer] = (process.env.DATABASE_SERVER ?? "").split(/[,:]/);
const user = process.env.DATABASE_USER;
const password = process.env.DATABASE_PASSWORD;

if (!host || !user || !password) {
  throw new Error(
    "Defina DATABASE_SERVER, DATABASE_USER e DATABASE_PASSWORD no ambiente (veja .env.example na raiz do repositório)."
  );
}

export const dbConfig: SqlConfig = {
  server: host,
  port: Number(process.env.DATABASE_PORT ?? portFromServer ?? 1433),
  database: process.env.DATABASE_NAME ?? "crescer",
  user,
  password,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

const PASSWORD = "Test1234!";

const accounts = [
  { email: "admin@dada-house.com",      name: "Admin DADA",    role: "ADMIN"      },
  { email: "client@test.com",            name: "Client Test",   role: "CLIENT"     },
  { email: "tech@test.com",              name: "Tech Test",     role: "TECHNICIAN" },
  { email: "dispatcher@test.com",        name: "Dispatch Test", role: "DISPATCHER" },
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  for (const acc of accounts) {
    const existing = await pool.query(`SELECT id FROM "User" WHERE email = $1`, [acc.email]);
    if (existing.rowCount && existing.rowCount > 0) {
      await pool.query(
        `UPDATE "User" SET name=$1, password=$2, role=$3, "updatedAt"=NOW() WHERE email=$4`,
        [acc.name, hash, acc.role, acc.email]
      );
      console.log(`✓ Updated  [${acc.role.padEnd(10)}] ${acc.email}`);
    } else {
      await pool.query(
        `INSERT INTO "User" (id,name,email,password,role,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
        [randomUUID(), acc.name, acc.email, hash, acc.role]
      );
      console.log(`✓ Created  [${acc.role.padEnd(10)}] ${acc.email}`);
    }
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("  Comptes de test (mot de passe : Test1234!)");
  console.log("─────────────────────────────────────────────────────────");
  console.log("  ADMIN       admin@dada-house.com");
  console.log("  CLIENT      client@test.com");
  console.log("  TECHNICIAN  tech@test.com");
  console.log("  DISPATCHER  dispatcher@test.com");
  console.log("─────────────────────────────────────────────────────────");
}

main().catch(console.error).finally(() => pool.end());

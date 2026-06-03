import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const email = "admin@dada-house.com";
  const password = "DadaAdmin2025!";
  const name = "DADA Admin";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    const updated = await db.user.update({ where: { email }, data: { role: "ADMIN" } });
    console.log(`\nUser promoted to ADMIN:`);
    console.log(`  Email: ${updated.email}`);
    console.log(`  Role:  ${updated.role}`);
  } else {
    const hashed = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email, password: hashed, role: "ADMIN" },
    });
    console.log(`\nAdmin user created:`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role:     ${user.role}`);
  }
  console.log(`\nLogin at: http://localhost:3000/auth/login`);
  console.log(`Then go to: http://localhost:3000/admin\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./lib/generated/prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const email = "admin@dada-house.com";
  const password = "Admin1234!";

  // Force reset password
  const hashed = await bcrypt.hash(password, 10);
  console.log("Hash generated:", hashed);

  // Verify the hash works immediately
  const valid = await bcrypt.compare(password, hashed);
  console.log("Hash verify test:", valid);

  // Upsert user
  await db.user.upsert({
    where: { email },
    create: { name: "DADA Admin", email, password: hashed, role: "ADMIN" },
    update: { password: hashed, role: "ADMIN" },
  });

  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, role: true, password: true } });
  console.log("User in DB:", { id: user?.id, email: user?.email, role: user?.role });
  console.log("DB password starts with:", user?.password?.substring(0, 10));
  
  // Final verify against DB hash
  const finalCheck = await bcrypt.compare(password, user!.password!);
  console.log("Final DB verify:", finalCheck);
  
  console.log("\n=== IDENTIFIANTS ===");
  console.log("Email:    " + email);
  console.log("Password: " + password);
}

main().catch(console.error).finally(() => db.$disconnect());

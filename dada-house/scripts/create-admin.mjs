import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client/index.js";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const email = "mathias@dada-house.com";
const password = "Mathias123@";
const name = "Mathias";

const hashed = await bcrypt.hash(password, 12);

const user = await db.user.upsert({
  where: { email },
  update: { password: hashed, role: "ADMIN", name },
  create: { email, password: hashed, name, role: "ADMIN" },
});

console.log("✅ Admin created:", user.email, "| role:", user.role);
await db.$disconnect();
await pool.end();

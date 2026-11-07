import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env"), "utf8");
env.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^"|"$/g, "");
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const email = process.argv[2] || "admin@dada-house.com";
const password = process.argv[3] || "Admin2024!";

const existing = await db.user.findUnique({ where: { email } });
if (existing) {
  console.log(`✓ User already exists: ${email} (role: ${existing.role})`);
  if (existing.role !== "ADMIN") {
    await db.user.update({ where: { email }, data: { role: "ADMIN" } });
    console.log("✓ Role updated to ADMIN");
  }
} else {
  const hash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: { email, password: hash, role: "ADMIN", name: "Admin" },
  });
  console.log(`✓ Admin created: ${email} / ${password}`);
}

await pool.end();

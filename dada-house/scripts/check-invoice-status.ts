import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const invoices = await db.invoice.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, status: true, paidAt: true, paymentMethod: true, amount: true, updatedAt: true, appointment: { select: { name: true } } },
  });
  console.log(JSON.stringify(invoices, null, 2));
}

main().catch(console.error).finally(() => pool.end());

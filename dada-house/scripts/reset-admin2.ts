import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function main() {
  const email = "admin@dada-house.com";
  const password = "Admin1234!";
  const hashed = await bcrypt.hash(password, 10);

  const verify = await bcrypt.compare(password, hashed);
  console.log("Local verify:", verify);

  // Update directly via SQL
  const res = await pool.query(
    `UPDATE "User" SET password = $1, role = 'ADMIN' WHERE email = $2 RETURNING id, email, role`,
    [hashed, email]
  );

  if (res.rowCount === 0) {
    // Insert
    const ins = await pool.query(
      `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt") 
       VALUES (gen_random_uuid(), 'DADA Admin', $1, $2, 'ADMIN', NOW(), NOW()) RETURNING id, email, role`,
      [email, hashed]
    );
    console.log("Created:", ins.rows[0]);
  } else {
    console.log("Updated:", res.rows[0]);
  }

  // Verify DB hash
  const dbRes = await pool.query(`SELECT password FROM "User" WHERE email = $1`, [email]);
  const dbHash = dbRes.rows[0]?.password;
  const finalCheck = await bcrypt.compare(password, dbHash);
  console.log("DB verify:", finalCheck);

  console.log("\nEmail:    " + email);
  console.log("Password: " + password);
}

main().catch(console.error).finally(() => pool.end());

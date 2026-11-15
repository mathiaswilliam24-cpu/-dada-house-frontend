/**
 * Price book photos (2026-11-15). Photos were picked per item from web image
 * search, reviewed one by one, and stored on UploadThing.
 *
 *   npx tsx --env-file=.env scripts/pricebook-images.ts upload <dir>  # <dir>/<TASKCODE>.jpg → UploadThing, writes the JSON map
 *   npx tsx --env-file=.env scripts/pricebook-images.ts apply         # sets PriceBookItem.imageUrl by taskCode (only where empty)
 */
import fs from "node:fs";
import path from "node:path";
import { UTApi } from "uploadthing/server";
import { db } from "@/lib/db";

const MAP_FILE = path.join(__dirname, "data", "hvac-pricebook-images.json");

async function upload(dir: string) {
  const map: Record<string, string> = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8")) : {};
  const utapi = new UTApi();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg"));
  for (const f of files) {
    const code = f.replace(/\.jpg$/, "");
    if (map[code]) continue;
    const file = new File([fs.readFileSync(path.join(dir, f))], `pricebook-${code.toLowerCase()}.jpg`, { type: "image/jpeg" });
    const up = await utapi.uploadFiles(file);
    if (up.error) { console.error(code, up.error.message); continue; }
    map[code] = up.data.ufsUrl ?? up.data.url;
    fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2) + "\n");
    console.log(code, "ok");
  }
  console.log(`${Object.keys(map).length} photos in ${MAP_FILE}`);
}

async function apply() {
  const map: Record<string, string> = JSON.parse(fs.readFileSync(MAP_FILE, "utf8"));
  let n = 0;
  for (const [taskCode, imageUrl] of Object.entries(map)) {
    const r = await db.priceBookItem.updateMany({ where: { taskCode, imageUrl: null }, data: { imageUrl } });
    n += r.count;
  }
  console.log(`Set imageUrl on ${n} items.`);
}

const [cmd, arg] = process.argv.slice(2);
(cmd === "upload" ? upload(arg) : cmd === "apply" ? apply() : Promise.reject(new Error("usage: upload <dir> | apply")))
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

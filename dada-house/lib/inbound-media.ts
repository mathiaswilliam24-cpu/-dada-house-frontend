import { UTApi } from "uploadthing/server";

export type InboundMedia = { url: string; contentType: string };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif",
  "image/webp": "webp", "image/heic": "heic", "image/heif": "heic",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/3gpp": "3gp",
  "application/pdf": "pdf", "text/vcard": "vcf", "text/x-vcard": "vcf",
};

/** Reads MediaUrl0..N / MediaContentType0..N from a Twilio webhook form. */
export function readTwilioMedia(form: FormData): InboundMedia[] {
  const count = Number(form.get("NumMedia") ?? 0) || 0;
  const media: InboundMedia[] = [];
  for (let i = 0; i < count; i++) {
    const url = String(form.get(`MediaUrl${i}`) ?? "");
    if (url) media.push({ url, contentType: String(form.get(`MediaContentType${i}`) ?? "application/octet-stream") });
  }
  return media;
}

/**
 * Twilio media URLs require account auth, so the inbox can't display them
 * directly. Download each file and re-host it on UploadThing. The returned URL
 * carries a "#name.ext" fragment so the inbox's extension-based image/video
 * detection works (UploadThing URLs have no extension; fragments aren't sent
 * to the server). Failed files are skipped, never thrown.
 */
export async function rehostTwilioMedia(media: InboundMedia[], prefix: string): Promise<string[]> {
  if (!media.length) return [];
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const utapi = new UTApi();

  const results = await Promise.all(
    media.map(async (m, i) => {
      try {
        const res = await fetch(m.url, { headers: { Authorization: `Basic ${auth}` } });
        if (!res.ok) throw new Error(`Twilio media fetch ${res.status}`);
        const type = (res.headers.get("content-type") || m.contentType).split(";")[0].trim();
        const name = `${prefix}-${i + 1}.${EXT[type] ?? "bin"}`;
        const file = new File([await res.arrayBuffer()], name, { type });
        const up = await utapi.uploadFiles(file);
        if (up.error) throw new Error(up.error.message);
        return `${up.data.ufsUrl ?? up.data.url}#${name}`;
      } catch (err) {
        console.error("Inbound media rehost failed", m.url, err);
        return null;
      }
    })
  );
  return results.filter((u): u is string => !!u);
}

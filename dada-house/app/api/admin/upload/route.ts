import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const utapi = new UTApi();
    const res = await utapi.uploadFiles(file);

    if (res.error) {
      console.error("UTApi error:", res.error);
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    const url = res.data.ufsUrl ?? res.data.url;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

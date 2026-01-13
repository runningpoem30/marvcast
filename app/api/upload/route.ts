import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const formData = await req.formData();
  const video = formData.get("video") as File;

  if (!video) {
    return NextResponse.json({ error: "No video" }, { status: 400 });
  }

  const buffer = Buffer.from(await video.arrayBuffer());
  const videoId = `${randomUUID()}.webm`;

  const blob = await put(`videos/${videoId}`, buffer, {
    access: "public",
    contentType: "video/webm",
  });

  return NextResponse.json({
    videoId,
    url: blob.url,
  });
}

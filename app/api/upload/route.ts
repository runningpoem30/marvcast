import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { saveVideoMetadata } from "@/lib/kv";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const video = formData.get("video") as File;

    if (!video) {
      return NextResponse.json({ error: "No video" }, { status: 400 });
    }

    const buffer = Buffer.from(await video.arrayBuffer());
    const videoId = randomUUID();
    const filename = `${videoId}.webm`;

    // Upload to Vercel Blob
    const blob = await put(`videos/${filename}`, buffer, {
      access: "public",
      contentType: "video/webm",
    });

    // Save metadata to Vercel KV
    await saveVideoMetadata({
      videoId,
      blobUrl: blob.url,
      createdAt: new Date().toISOString(),
      viewCount: 0,
      totalWatchTime: 0,
    });

    return NextResponse.json({
      videoId,
      url: blob.url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

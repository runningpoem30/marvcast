import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
const execAsync = promisify(exec);

export async function POST(req: Request) {
  const formData = await req.formData();

  const video = formData.get("video");
  const trimStart = formData.get("trimStart");
  const trimEnd = formData.get("trimEnd");

  if (!video || !trimStart || !trimEnd) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const start = Number(trimStart);
  const end = Number(trimEnd);

  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    return NextResponse.json({ error: "Invalid trim range" }, { status: 400 });
  }

  // Convert uploaded File → Buffer
  const inputFile = video as File;
  const buffer = Buffer.from(await inputFile.arrayBuffer());

  // Use /tmp (serverless-safe)
  const tmpDir = "/tmp";
  const inputPath = path.join(tmpDir, `${randomUUID()}.webm`);
  const outputPath = path.join(tmpDir, `${randomUUID()}_trimmed.webm`);

  await fs.writeFile(inputPath, buffer);

  // Run ffmpeg
  await execAsync(
    `ffmpeg -y -ss ${start} -to ${end} -i "${inputPath}" -c copy "${outputPath}"`
  );

  // Upload to Vercel Blob (PERSISTENT)
  const videoId = `${randomUUID()}.webm`;
  const outputBuffer = await fs.readFile(outputPath);

  const blob = await put(
    `videos/${videoId}`,
    outputBuffer,
    {
      access: "public",
      contentType: "video/webm",
    }
  );

  // Cleanup temp files
  await fs.unlink(inputPath);
  await fs.unlink(outputPath);

  return NextResponse.json({
    videoId,
    url: blob.url, 
  });
}

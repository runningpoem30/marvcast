import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path"
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";


export const runtime = "nodejs";
const execAsync = promisify(exec);

export async function POST(req : Request){
    //we request the for the formdata from the frontend 
    const formData = await req.formData();

    const video = formData.get("video");
    const trimStart = formData.get("trimStart");
    const trimEnd = formData.get("trimEnd");



    if(!video || !trimStart || !trimEnd){
        return NextResponse.json({error : "missing fields"} , {status :400 })
    }


    // just for once you need to validate the number and data 
    const start = Number(trimStart);
    const end = Number(trimEnd);


 if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
     return NextResponse.json({ error: "Invalid trim range" }, { status: 400 });
  }


  const inputFile = video as File;
  const buffer = Buffer.from(await inputFile.arrayBuffer());

  const tmpDir  = path.join(process.cwd() , 'tmp');
  await fs.mkdir(tmpDir , {recursive : true})

  const inputPath = path.join(tmpDir, `${randomUUID()}.webm`);
  const outputPath = path.join(tmpDir, `${randomUUID()}_trimmed.webm`);

  await fs.writeFile(inputPath, buffer);
  await execAsync(
    `ffmpeg -y -ss ${start} -to ${end} -i "${inputPath}" -c copy "${outputPath}"`
  );

  const publicDir = path.join(process.cwd(), "public", "videos");
  await fs.mkdir(publicDir, { recursive: true });

  const videoId = `${randomUUID()}.webm`;
  const finalPath = path.join(publicDir, videoId);

  await fs.rename(outputPath, finalPath);
  await fs.unlink(inputPath);

  return NextResponse.json({
    videoId,
    url: `/videos/${videoId}`
  });


}


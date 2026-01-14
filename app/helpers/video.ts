import { fetchFile } from "@ffmpeg/util";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg() {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg can only run in the browser");
  }

  if (!ffmpeg) {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");

    ffmpeg = new FFmpeg();

    await ffmpeg.load({
       coreURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
       wasmURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm"
    });
  }

  return ffmpeg;
}

export async function trimVideo(
  inputBlob: Blob,
  start: number,
  end: number
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();

  await ffmpeg.writeFile("input.webm", await fetchFile(inputBlob));

  await ffmpeg.exec([
    "-ss", `${start}`,
    "-to", `${end}`,
    "-i", "input.webm",
    "-c", "copy",
    "output.webm",
  ]);

  const data = await ffmpeg.readFile("output.webm");


  const uint8 =
  typeof data === "string"
    ? new TextEncoder().encode(data)
    : data;

// Step 2: create a NEW ArrayBuffer (this is the key)
const arrayBuffer = new ArrayBuffer(uint8.byteLength);
const view = new Uint8Array(arrayBuffer);
view.set(uint8);

// Step 3: Blob from safe ArrayBuffer
return new Blob([arrayBuffer], { type: "video/webm" });
}

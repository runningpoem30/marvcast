import { fetchFile } from "@ffmpeg/util";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoading: Promise<void> | null = null;

async function loadFFmpeg() {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg can only run in browser");
  }

  if (ffmpeg) return;

  if (!ffmpegLoading) {
    ffmpegLoading = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      ffmpeg = new FFmpeg();

      await ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
      });
    })();
  }

  await ffmpegLoading;
}

export async function trimVideo(
  inputBlob: Blob,
  start: number,
  end: number
): Promise<Blob> {
  await loadFFmpeg(); // ✅ GUARANTEED load

  if (!ffmpeg) throw new Error("FFmpeg not initialized");

  await ffmpeg.writeFile("input.webm", await fetchFile(inputBlob));

  await ffmpeg.exec([
    "-i", "input.webm",
    "-ss", `${start}`,
    "-to", `${end}`,
    "-c", "copy",
    "output.webm",
  ]);

  const data = await ffmpeg.readFile("output.webm");

  const uint8 =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data;

  const arrayBuffer = new ArrayBuffer(uint8.byteLength);
  new Uint8Array(arrayBuffer).set(uint8);

  return new Blob([arrayBuffer], { type: "video/webm" });
}


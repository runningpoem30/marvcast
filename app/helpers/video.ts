import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading: Promise<void> | null = null;

const FFMPEG_CORE_VERSION = "0.12.6";
const FFMPEG_VERSION = "0.12.10";
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
const FFMPEG_BASE_URL = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/esm`;

async function loadFFmpeg() {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg can only run in browser");
  }

  // If already loaded, return immediately
  if (ffmpeg && ffmpegLoaded) {
    return;
  }

  // If currently loading, wait for it
  if (ffmpegLoading) {
    await ffmpegLoading;
    return;
  }

  // Start loading
  ffmpegLoading = (async () => {
    try {
      ffmpeg = new FFmpeg();

      ffmpeg.on("log", ({ message }) => {
        console.log("[FFmpeg]", message);
      });

      ffmpeg.on("progress", ({ progress }) => {
        console.log("[FFmpeg Progress]", Math.round(progress * 100) + "%");
      });

      console.log("Loading FFmpeg from CDN...");

      // Load all required files from CDN with blob URLs
      const [coreURL, wasmURL, workerURL] = await Promise.all([
        toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
        toBlobURL(`${FFMPEG_BASE_URL}/814.ffmpeg.js`, "text/javascript"),
      ]);

      console.log("CDN files loaded, initializing FFmpeg...");

      await ffmpeg.load({
        coreURL,
        wasmURL,
        workerURL,
      });

      ffmpegLoaded = true;
      console.log("FFmpeg loaded successfully!");
    } catch (error) {
      console.error("FFmpeg load error:", error);
      ffmpeg = null;
      ffmpegLoaded = false;
      ffmpegLoading = null;
      throw error;
    }
  })();

  await ffmpegLoading;
}

export async function trimVideo(
  inputBlob: Blob,
  start: number,
  end: number
): Promise<Blob> {
  console.log("Starting trim:", { start, end, blobSize: inputBlob.size });

  await loadFFmpeg();

  if (!ffmpeg || !ffmpegLoaded) {
    throw new Error("FFmpeg not initialized");
  }

  console.log("Writing input file...");
  await ffmpeg.writeFile("input.webm", await fetchFile(inputBlob));

  console.log("Running FFmpeg exec...");
  await ffmpeg.exec([
    "-i", "input.webm",
    "-ss", `${start}`,
    "-to", `${end}`,
    "-c", "copy",
    "output.webm",
  ]);

  console.log("Reading output file...");
  const data = await ffmpeg.readFile("output.webm");

  // Clean up
  try {
    await ffmpeg.deleteFile("input.webm");
    await ffmpeg.deleteFile("output.webm");
  } catch (e) {
    // Ignore cleanup errors
  }

  const uint8 =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data;

  const arrayBuffer = new ArrayBuffer(uint8.byteLength);
  new Uint8Array(arrayBuffer).set(uint8);

  console.log("Trim complete, output size:", arrayBuffer.byteLength);
  return new Blob([arrayBuffer], { type: "video/webm" });
}

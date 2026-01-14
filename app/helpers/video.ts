import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading: Promise<void> | null = null;

// Use jsDelivr which has better CORS support
const BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

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

      // Load core files from jsDelivr CDN
      const coreURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript");
      const wasmURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, "application/wasm");

      console.log("CDN files loaded, initializing FFmpeg...");

      // Load without workerURL to use single-threaded mode
      await ffmpeg.load({
        coreURL,
        wasmURL,
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

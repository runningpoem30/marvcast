/* eslint-disable @typescript-eslint/no-explicit-any */

// This file loads FFmpeg entirely from CDN via script tags
// to bypass Next.js/Turbopack bundler issues

let ffmpegInstance: any = null;
let ffmpegLoaded = false;
let ffmpegLoading: Promise<void> | null = null;

const FFMPEG_CDN = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.min.js";
const FFMPEG_UTIL_CDN = "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.min.js";
const FFMPEG_CORE_CDN = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadFFmpeg(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg can only run in browser");
  }

  if (ffmpegInstance && ffmpegLoaded) {
    return;
  }

  if (ffmpegLoading) {
    await ffmpegLoading;
    return;
  }

  ffmpegLoading = (async () => {
    try {
      console.log("Loading FFmpeg scripts from CDN...");

      // Load FFmpeg and util scripts
      await loadScript(FFMPEG_UTIL_CDN);
      await loadScript(FFMPEG_CDN);

      console.log("Scripts loaded, initializing FFmpeg...");

      // Access FFmpeg from global scope
      const FFmpegWASM = (window as any).FFmpegWASM;
      const FFmpegUtil = (window as any).FFmpegUtil;

      if (!FFmpegWASM || !FFmpegUtil) {
        throw new Error("FFmpeg scripts not loaded properly");
      }

      ffmpegInstance = new FFmpegWASM.FFmpeg();

      ffmpegInstance.on("log", ({ message }: { message: string }) => {
        console.log("[FFmpeg]", message);
      });

      ffmpegInstance.on("progress", ({ progress }: { progress: number }) => {
        console.log("[FFmpeg Progress]", Math.round(progress * 100) + "%");
      });

      // Load the core from CDN
      await ffmpegInstance.load({
        coreURL: `${FFMPEG_CORE_CDN}/ffmpeg-core.js`,
        wasmURL: `${FFMPEG_CORE_CDN}/ffmpeg-core.wasm`,
      });

      ffmpegLoaded = true;
      console.log("FFmpeg loaded successfully!");
    } catch (error) {
      console.error("FFmpeg load error:", error);
      ffmpegInstance = null;
      ffmpegLoaded = false;
      ffmpegLoading = null;
      throw error;
    }
  })();

  await ffmpegLoading;
}

async function fetchFileAsUint8Array(blob: Blob): Promise<Uint8Array> {
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function trimVideo(
  inputBlob: Blob,
  start: number,
  end: number
): Promise<Blob> {
  console.log("Starting trim:", { start, end, blobSize: inputBlob.size });

  await loadFFmpeg();

  if (!ffmpegInstance || !ffmpegLoaded) {
    throw new Error("FFmpeg not initialized");
  }

  console.log("Writing input file...");
  const inputData = await fetchFileAsUint8Array(inputBlob);
  await ffmpegInstance.writeFile("input.webm", inputData);

  console.log("Running FFmpeg exec...");
  await ffmpegInstance.exec([
    "-i", "input.webm",
    "-ss", `${start}`,
    "-to", `${end}`,
    "-c", "copy",
    "output.webm",
  ]);

  console.log("Reading output file...");
  const data = await ffmpegInstance.readFile("output.webm");

  // Clean up
  try {
    await ffmpegInstance.deleteFile("input.webm");
    await ffmpegInstance.deleteFile("output.webm");
  } catch (e) {
    // Ignore cleanup errors
  }

  const uint8 =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data;

  console.log("Trim complete, output size:", uint8.byteLength);
  return new Blob([uint8], { type: "video/webm" });
}

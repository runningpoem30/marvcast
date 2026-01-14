/* eslint-disable @typescript-eslint/no-explicit-any */

// This file loads FFmpeg from local public folder to avoid CORS issues

let ffmpegInstance: any = null;
let ffmpegLoaded = false;
let ffmpegLoading: Promise<void> | null = null;

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
      console.log("Loading FFmpeg from local files...");

      // Load FFmpeg script from local public folder
      await loadScript("/ffmpeg/ffmpeg.min.js");

      console.log("Script loaded, initializing FFmpeg...");

      // Access FFmpeg from global scope
      const FFmpegWASM = (window as any).FFmpegWASM;

      if (!FFmpegWASM) {
        throw new Error("FFmpeg script not loaded properly");
      }

      ffmpegInstance = new FFmpegWASM.FFmpeg();

      ffmpegInstance.on("log", ({ message }: { message: string }) => {
        console.log("[FFmpeg]", message);
      });

      ffmpegInstance.on("progress", ({ progress }: { progress: number }) => {
        console.log("[FFmpeg Progress]", Math.round(progress * 100) + "%");
      });

      // Load the core and worker from local files
      await ffmpegInstance.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
        workerURL: "/ffmpeg/814.ffmpeg.js",
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

  console.log("Running FFmpeg exec (re-encoding for accurate trim)...");
  await ffmpegInstance.exec([
    "-i", "input.webm",
    "-ss", `${start}`,
    "-to", `${end}`,
    "-c:v", "libvpx",
    "-c:a", "copy",
    "-b:v", "1M",
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

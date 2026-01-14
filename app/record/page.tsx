"use client";
import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useRouter } from "next/navigation";
import { trimVideo } from "../helpers/video";
import Link from "next/link";

type TrimResult = {
  videoId: string;
  url: string;
};

function Record() {
  const [isMicEnabled, setIsMicEnabled] = React.useState(true);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    startTrim: "",
    endTrim: ""
  });
  const [trimResult, setTrimResult] = React.useState<TrimResult | null>(null);
  const [isTrimming, setIsTrimming] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("");

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const recordedBlobRef = React.useRef<Blob | null>(null);

  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!recordedBlobRef.current) {
      setError("No recording found. Please record a video first.");
      return;
    }

    const start = Number(formData.startTrim);
    const end = Number(formData.endTrim);

    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      setError("Invalid trim range. End time must be greater than start time.");
      return;
    }

    if (start < 0) {
      setError("Start time cannot be negative.");
      return;
    }

    try {
      setIsTrimming(true);
      setStatus("Loading FFmpeg...");

      const trimmedBlob = await trimVideo(
        recordedBlobRef.current,
        start,
        end
      );

      setStatus("Uploading trimmed video...");
      console.log("TRIM DONE", trimmedBlob.size);

      const fd = new FormData();
      fd.append("video", trimmedBlob, "trimmed.webm");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      setTrimResult(data);
      setStatus("Video trimmed and uploaded successfully!");

      setFormData({
        startTrim: "",
        endTrim: ""
      });
    } catch (err) {
      console.error("Trim/upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to trim and upload video");
      setStatus("");
    } finally {
      setIsTrimming(false);
    }
  }

  async function startRecording() {
    try {
      setError(null);
      setTrimResult(null);

      screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      if (isMicEnabled) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      const combinedStream = new MediaStream();

      screenStreamRef.current.getVideoTracks().forEach(t =>
        combinedStream.addTrack(t)
      );

      screenStreamRef.current.getAudioTracks().forEach(t =>
        combinedStream.addTrack(t)
      );

      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach(t =>
          combinedStream.addTrack(t)
        );
      }

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        recordedBlobRef.current = blob;
        console.log("FINAL VIDEO BLOB:", blob);
        console.log("Blob size:", blob.size);

        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsRecording(false);
      };

      // Handle when user stops sharing from browser UI
      screenStreamRef.current.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      setError("Failed to start recording. Please allow screen sharing.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  }

  const Navbar = () => {
    return (
      <nav className="flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
          <h1 className="text-base font-bold md:text-2xl">MARVCLIP</h1>
        </Link>
        <Link href="/videos">
          <Button variant="outline">All Videos</Button>
        </Link>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Recording Controls */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">
            Screen Recorder
          </h2>

          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className={`lg:px-6 lg:py-6 font-lilex font-light lg:text-xl flex items-center gap-2 cursor-pointer ${isRecording ? "opacity-50 cursor-not-allowed" : ""
                }`}
              onClick={startRecording}
              disabled={isRecording}
            >
              <span className="h-3 w-3 rounded-full bg-red-500" />
              {isRecording ? "Recording..." : "Start Recording"}
            </Button>

            <Button
              variant="outline"
              className={`lg:px-6 lg:py-6 font-lilex font-light lg:text-xl flex items-center gap-2 cursor-pointer ${!isRecording ? "opacity-50 cursor-not-allowed" : ""
                }`}
              onClick={stopRecording}
              disabled={!isRecording}
            >
              <span className="h-3 w-3 rounded-sm bg-neutral-800" />
              Stop Recording
            </Button>
          </div>

          <label className="mt-6 flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={isMicEnabled}
              onChange={() => setIsMicEnabled(v => !v)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Enable Microphone
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Video Preview */}
        {previewUrl && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
              Recording Preview
            </h3>
            <video
              src={previewUrl}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: "400px" }}
            />
          </div>
        )}

        {/* Trim Form */}
        {previewUrl && !trimResult && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
              Trim Your Video
            </h3>
            <p className="mb-6 text-neutral-600 dark:text-neutral-400">
              Enter the start and end time in seconds to trim your video.
            </p>

            <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Start Time (seconds)
                </label>
                <Input
                  className="w-40 h-12 text-lg"
                  type="number"
                  placeholder="0"
                  name="startTrim"
                  value={formData.startTrim}
                  onChange={onChange}
                  min="0"
                  step="0.1"
                  disabled={isTrimming}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  End Time (seconds)
                </label>
                <Input
                  className="w-40 h-12 text-lg"
                  type="number"
                  placeholder="10"
                  name="endTrim"
                  value={formData.endTrim}
                  onChange={onChange}
                  min="0"
                  step="0.1"
                  disabled={isTrimming}
                />
              </div>

              <Button
                type="submit"
                className="h-12 bg-gradient-to-r from-violet-500 to-pink-500 px-8 text-lg text-white hover:opacity-90"
                disabled={isTrimming}
              >
                {isTrimming ? "Processing..." : "Trim & Save"}
              </Button>
            </form>

            {status && (
              <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                {status}
              </div>
            )}
          </div>
        )}

        {/* Success Result */}
        {trimResult && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-xl font-semibold">Video Trimmed Successfully!</h3>
            </div>

            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Your video has been trimmed and saved. Click below to preview it.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <Button
                onClick={() => router.push(`/v/${trimResult.videoId}`)}
                className="bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90"
              >
                Preview Trimmed Video
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setTrimResult(null);
                  setPreviewUrl(null);
                  recordedBlobRef.current = null;
                }}
              >
                Record Another Video
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!previewUrl && (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-4 text-6xl">🎥</div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Ready to Record
            </h3>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Click "Start Recording" to capture your screen. Your recording will appear here for preview and trimming.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Record;

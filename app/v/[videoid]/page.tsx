"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/app/ui/button";
import Link from "next/link";

interface VideoData {
  videoId: string;
  blobUrl: string;
  createdAt: string;
  viewCount: number;
  totalWatchTime: number;
}

export default function VideoPage() {
  const params = useParams();
  const videoId = params.videoid as string;

  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    async function fetchVideo() {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        if (!res.ok) {
          throw new Error("Video not found");
        }
        const data = await res.json();
        setVideo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    }

    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  // Track watch time
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !video) return;

    const handleTimeUpdate = () => {
      const currentTime = videoEl.currentTime;
      const watchedSeconds = currentTime - lastTimeRef.current;

      // Only track if reasonable (not seeking)
      if (watchedSeconds > 0 && watchedSeconds < 2) {
        lastTimeRef.current = currentTime;
      }
    };

    const handlePause = async () => {
      const totalWatched = videoEl.currentTime;
      if (totalWatched > 1) {
        await fetch(`/api/videos/${videoId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchTime: Math.round(totalWatched) }),
        });
      }
    };

    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("ended", handlePause);

    return () => {
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("ended", handlePause);
    };
  }, [video, videoId]);

  const shareableLink = typeof window !== "undefined"
    ? `${window.location.origin}/v/${videoId}`
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-2xl">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-red-500">Video Not Found</h1>
        <p className="text-neutral-600">{error || "This video does not exist."}</p>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Navbar */}
      <nav className="flex w-full items-center justify-between border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
          <h1 className="text-base font-bold md:text-2xl">MARVCLIP</h1>
        </Link>
        <Link href="/videos">
          <Button variant="outline">All Videos</Button>
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Video Player */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-xl dark:border-neutral-800">
          <video
            ref={videoRef}
            src={video.blobUrl}
            controls
            className="w-full"
            style={{ maxHeight: "70vh" }}
          />
        </div>

        {/* Info Section */}
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Video Preview</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Created: {new Date(video.createdAt).toLocaleDateString()} •
                Views: {video.viewCount}
              </p>
            </div>
          </div>

          {/* Shareable Link */}
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Shareable Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareableLink}
                className="flex-1 rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <Button onClick={copyToClipboard} variant="outline">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Direct Blob URL */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Direct Video URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={video.blobUrl}
                className="flex-1 truncate rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(video.blobUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                variant="outline"
              >
                Copy
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Link href="/record">
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90">
              Record New Video
            </Button>
          </Link>
          <Link href="/videos">
            <Button variant="outline">View All Videos</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

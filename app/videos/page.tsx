"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/app/ui/button";

interface VideoData {
    videoId: string;
    blobUrl: string;
    createdAt: string;
    viewCount: number;
    totalWatchTime: number;
}

export default function VideosPage() {
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchVideos() {
            try {
                const res = await fetch("/api/videos");
                if (!res.ok) throw new Error("Failed to fetch videos");
                const data = await res.json();
                setVideos(data.videos || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load videos");
            } finally {
                setLoading(false);
            }
        }
        fetchVideos();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatWatchTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            {/* Navbar */}
            <nav className="flex w-full items-center justify-between border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
                <Link href="/" className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
                    <h1 className="text-base font-bold md:text-2xl">MARVCLIP</h1>
                </Link>
                <Link href="/record">
                    <Button className="bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90">
                        Record New
                    </Button>
                </Link>
            </nav>

            <div className="mx-auto max-w-7xl px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                        All Videos
                    </h1>
                    <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                        Browse all your recorded and trimmed videos
                    </p>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-pulse text-xl text-neutral-500">
                            Loading videos...
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {!loading && !error && videos.length === 0 && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="mb-4 text-6xl">🎬</div>
                        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                            No videos yet
                        </h2>
                        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                            Record your first video to get started
                        </p>
                        <Link href="/record" className="mt-6 inline-block">
                            <Button className="bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90">
                                Start Recording
                            </Button>
                        </Link>
                    </div>
                )}

                {!loading && !error && videos.length > 0 && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {videos.map((video) => (
                            <Link
                                key={video.videoId}
                                href={`/v/${video.videoId}`}
                                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:border-violet-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-violet-600"
                            >
                                {/* Video Preview */}
                                <div className="relative aspect-video bg-neutral-900">
                                    <video
                                        src={video.blobUrl}
                                        className="h-full w-full object-cover"
                                        muted
                                        preload="metadata"
                                        onMouseEnter={(e) => {
                                            const v = e.currentTarget;
                                            v.currentTime = 0;
                                            v.play().catch(() => { });
                                        }}
                                        onMouseLeave={(e) => {
                                            const v = e.currentTarget;
                                            v.pause();
                                            v.currentTime = 0;
                                        }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                                        <div className="rounded-full bg-white/90 p-4 shadow-lg">
                                            <svg
                                                className="h-8 w-8 text-violet-600"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Video Info */}
                                <div className="p-4">
                                    <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
                                        <span>{formatDate(video.createdAt)}</span>
                                        <span className="flex items-center gap-1">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                            </svg>
                                            {video.viewCount}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs text-neutral-500">
                                        Watch time: {formatWatchTime(video.totalWatchTime)}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Analytics Summary */}
                {!loading && !error && videos.length > 0 && (
                    <div className="mt-12 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                        <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
                            Analytics Overview
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-lg bg-gradient-to-br from-violet-500/10 to-pink-500/10 p-4">
                                <div className="text-3xl font-bold text-violet-600">
                                    {videos.length}
                                </div>
                                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Total Videos
                                </div>
                            </div>
                            <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
                                <div className="text-3xl font-bold text-blue-600">
                                    {videos.reduce((sum, v) => sum + v.viewCount, 0)}
                                </div>
                                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Total Views
                                </div>
                            </div>
                            <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4">
                                <div className="text-3xl font-bold text-green-600">
                                    {formatWatchTime(
                                        videos.reduce((sum, v) => sum + v.totalWatchTime, 0)
                                    )}
                                </div>
                                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Total Watch Time
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

import { kv } from "@vercel/kv";

export interface VideoMetadata {
    videoId: string;
    blobUrl: string;
    createdAt: string;
    viewCount: number;
    totalWatchTime: number;
}

const VIDEO_PREFIX = "video:";
const VIDEO_LIST_KEY = "videos:all";

/**
 * Save video metadata to KV
 */
export async function saveVideoMetadata(metadata: VideoMetadata): Promise<void> {
    await kv.set(`${VIDEO_PREFIX}${metadata.videoId}`, metadata);
    await kv.lpush(VIDEO_LIST_KEY, metadata.videoId);
}

/**
 * Get video metadata from KV
 */
export async function getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    return await kv.get<VideoMetadata>(`${VIDEO_PREFIX}${videoId}`);
}

/**
 * Get all video IDs
 */
export async function getAllVideoIds(): Promise<string[]> {
    return await kv.lrange(VIDEO_LIST_KEY, 0, -1) || [];
}

/**
 * Get all videos with metadata
 */
export async function getAllVideos(): Promise<VideoMetadata[]> {
    const videoIds = await getAllVideoIds();
    const videos: VideoMetadata[] = [];

    for (const videoId of videoIds) {
        const metadata = await getVideoMetadata(videoId);
        if (metadata) {
            videos.push(metadata);
        }
    }

    return videos;
}

/**
 * Increment view count for a video
 */
export async function incrementViewCount(videoId: string): Promise<number> {
    const metadata = await getVideoMetadata(videoId);
    if (!metadata) return 0;

    metadata.viewCount += 1;
    await kv.set(`${VIDEO_PREFIX}${videoId}`, metadata);
    return metadata.viewCount;
}

/**
 * Add watch time to a video
 */
export async function addWatchTime(videoId: string, seconds: number): Promise<void> {
    const metadata = await getVideoMetadata(videoId);
    if (!metadata) return;

    metadata.totalWatchTime += seconds;
    await kv.set(`${VIDEO_PREFIX}${videoId}`, metadata);
}

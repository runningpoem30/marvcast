import { NextResponse } from "next/server";
import { getVideoMetadata, incrementViewCount, addWatchTime } from "@/lib/kv";

export const runtime = "nodejs";

type RouteParams = {
    params: Promise<{ id: string }>;
};

// GET - Fetch video details and increment view count
export async function GET(req: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const metadata = await getVideoMetadata(id);

        if (!metadata) {
            return NextResponse.json(
                { error: "Video not found" },
                { status: 404 }
            );
        }

        // Increment view count
        const newViewCount = await incrementViewCount(id);

        return NextResponse.json({
            ...metadata,
            viewCount: newViewCount,
        });
    } catch (error) {
        console.error("Error fetching video:", error);
        return NextResponse.json(
            { error: "Failed to fetch video" },
            { status: 500 }
        );
    }
}

// POST - Track watch time
export async function POST(req: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { watchTime } = body;

        if (typeof watchTime !== "number" || watchTime < 0) {
            return NextResponse.json(
                { error: "Invalid watch time" },
                { status: 400 }
            );
        }

        await addWatchTime(id, watchTime);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error tracking watch time:", error);
        return NextResponse.json(
            { error: "Failed to track watch time" },
            { status: 500 }
        );
    }
}

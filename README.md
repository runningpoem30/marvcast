# MARVCLIP - Screen Recording and Video Trimming Platform

> **Production Ready** - This application is fully functional and deployed with all features required for the assignment. Live at [marvcast.goarya.dev](https://marvcast.goarya.dev)

---

## Overview

MARVCLIP is a browser-based screen recording and video trimming platform that allows users to:

- Record screen with optional microphone audio
- Trim recordings with precise start/end times
- Share videos via unique shareable links
- Track analytics including views and watch time

No accounts, no setup, no installations required. Everything runs in the browser.

---

## Features

| Feature | Description |
|---------|-------------|
| Screen Recording | Capture screen with system audio and microphone |
| Video Trimming | Frame-accurate trimming using FFmpeg.wasm |
| Cloud Storage | Videos stored in Vercel Blob (object storage) |
| Analytics | View counts and watch time tracked via Vercel KV |
| Shareable Links | Each video gets a unique URL for sharing |
| Video Gallery | Browse all recorded videos with analytics |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| Video Processing | FFmpeg.wasm (client-side) |
| Video Storage | Vercel Blob |
| Metadata Storage | Vercel KV (Upstash Redis) |
| Deployment | Vercel |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Screen     │───>│   FFmpeg     │───>│   Upload to      │   │
│  │   Recording  │    │   Trimming   │    │   Vercel Blob    │   │
│  │   (MediaAPI) │    │   (WASM)     │    │                  │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel Serverless                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  /api/upload │    │ /api/videos  │    │ /api/videos/[id] │   │
│  │  Save video  │    │ List videos  │    │ Get + analytics  │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Storage Layer                            │
├────────────────────────────┬────────────────────────────────────┤
│       Vercel Blob          │           Vercel KV                 │
│    (Video .webm files)     │     (Metadata + Analytics)         │
│                            │  - videoId, blobUrl, createdAt     │
│                            │  - viewCount, totalWatchTime       │
└────────────────────────────┴────────────────────────────────────┘
```

---

## Challenges and Solutions

### Challenge 1: FFmpeg on Serverless

**Initial Approach**: Started with native FFmpeg binary for video trimming on the server side. This worked perfectly in local development.

**Problem**: Vercel's serverless functions have strict limitations:
- No persistent file system
- 50MB function size limit
- 10-second execution timeout (free tier)
- Cannot install native binaries

**Attempted Solutions**:
- AWS S3 with Lambda: Required complex setup and cold start delays
- Cloudflare R2: Similar serverless limitations
- Streaming to external service: Added latency and complexity

**Final Solution**: Migrated entirely to FFmpeg.wasm for client-side processing:
- All video trimming happens in the browser
- No server-side processing needed
- Works with Vercel's serverless constraints
- User's CPU handles encoding (offloads server costs)

### Challenge 2: FFmpeg.wasm and Next.js Turbopack

**Problem**: Next.js 16 uses Turbopack as the default bundler, which has strict module resolution. FFmpeg.wasm uses dynamic imports internally, causing `Cannot find module as expression is too dynamic` errors in production.

**Debugging Journey**:
1. Tried CDN loading with `toBlobURL` - Same bundler errors
2. Configured webpack externals - Turbopack conflict
3. Used dynamic `import()` - Turbopack doesn't support expression imports
4. Added CORS headers - Worker still blocked

**Final Solution**: Host FFmpeg files locally in the `/public` folder and load via script tags:
- Bypasses the bundler entirely
- All files served from same origin (no CORS issues)
- Worker scripts load without restrictions

### Challenge 3: Stream Copy vs Re-encoding

**Problem**: Using `-c copy` (stream copy) for trimming produced black screen videos. The trim points didn't align with keyframes, so no video data was copied.

**Solution**: Switched to VP8 re-encoding with optimized settings:
```
-c:v libvpx -deadline realtime -cpu-used 8
```
This provides frame-accurate trimming while keeping encoding fast (approximately 5-10x faster than default settings).

### Challenge 4: COEP Headers and Cross-Origin Resources

**Problem**: SharedArrayBuffer (required by FFmpeg.wasm multi-threading) needs `Cross-Origin-Embedder-Policy: require-corp`. But this blocked Vercel Blob videos from loading on the preview page.

**Solution**: Applied headers only to the `/record` page and used `credentialless` mode:
```javascript
{
  source: "/record",
  headers: [
    { key: "Cross-Origin-Embedder-Policy", value: "credentialless" }
  ]
}
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/runningpoem30/marvcast.git
cd marvcast/wellfound

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Environment Variables

For full functionality, create a `.env.local` file:

```env
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_token

# Vercel KV (Upstash Redis)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

Note: Recording and playback work locally without these variables. Upload and analytics require Vercel deployment.

### Deploying to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add a Blob store (Storage > Create Database > Blob)
4. Add a KV store (Storage > Create Database > KV)
5. Environment variables are auto-configured
6. Deploy

---

## API Reference

### POST /api/upload

Upload a trimmed video to storage.

**Request**: `multipart/form-data` with `video` field

**Response**:
```json
{
  "videoId": "uuid-string",
  "url": "https://blob-url.vercel-storage.com/..."
}
```

### GET /api/videos

List all uploaded videos with metadata.

**Response**:
```json
{
  "videos": [
    {
      "videoId": "...",
      "blobUrl": "...",
      "createdAt": "2025-01-15T...",
      "viewCount": 42,
      "totalWatchTime": 1234
    }
  ]
}
```

### GET /api/videos/[id]

Get video details and increment view count.

### POST /api/videos/[id]

Track watch time analytics.

---

## Production Improvements

If this were a full production application, the following improvements would be considered:

### Performance
- Implement video thumbnails using canvas extraction
- Add chunked uploads for large videos (>100MB)
- Use Web Workers for FFmpeg to prevent UI blocking
- Implement progress saving for interrupted uploads

### Scalability
- Add CDN caching for video delivery
- Implement video compression tiers (SD/HD/4K)
- Queue-based processing for heavy workloads
- Multi-region storage replication

### Features
- User authentication and personal video libraries
- Video titles and descriptions
- Privacy settings (public/private/unlisted)
- Embed codes for external websites
- Collaborative editing and annotations

### Analytics
- Detailed viewer analytics (geography, device, referrer)
- Engagement heatmaps (which parts viewers watch/skip)
- Export analytics data
- A/B testing for sharing page layouts

### Security
- Rate limiting on uploads
- Video content moderation
- Signed URLs with expiration
- DMCA takedown workflow

---

## Project Structure

```
wellfound/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # Video upload endpoint
│   │   └── videos/
│   │       ├── route.ts         # List videos
│   │       └── [id]/route.ts    # Video details + analytics
│   ├── helpers/
│   │   └── video.ts             # FFmpeg.wasm loading and trimming
│   ├── record/page.tsx          # Recording and trimming UI
│   ├── v/[videoid]/page.tsx     # Video preview with share link
│   ├── videos/page.tsx          # Video gallery with analytics
│   └── ui/                      # Reusable UI components
├── lib/
│   └── kv.ts                    # Vercel KV helper functions
├── public/
│   └── ffmpeg/                  # FFmpeg.wasm files (locally hosted)
├── next.config.ts               # Next.js configuration
└── package.json
```

---

## License

MIT

---

## Author

Built as an assignment submission demonstrating full-stack development capabilities with modern web technologies and real-world problem-solving.

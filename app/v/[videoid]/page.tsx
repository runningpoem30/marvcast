type PageProps = {
  params: {
    videoId: string;
  };
};

export default function Page({ params }: PageProps) {
  const { videoId } = params;

  return (
    <div>
      <h1>Video Preview</h1>
      <video
        src={`/videos/${videoId}`}
        controls
        style={{ width: "100%", maxWidth: 700 }}
      />
    </div>
  );
}

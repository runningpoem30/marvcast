"use client";
import React from "react";

function Record() {
  const [isMicEnabled, setIsMicEnabled] = React.useState(true);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
  startTrim: "",
  endTrim: ""
});

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const recordedBlobRef = React.useRef<Blob | null>(null);


function onChange(e : React.ChangeEvent<HTMLInputElement>) {
  const { name, value } = e.target;

  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
}


 async function onSubmit(e : React.FormEvent<HTMLFormElement>){
    e.preventDefault();

    if(!recordedBlobRef.current){
        alert("no recording found");
        return;
    }

    const start = Number(formData.startTrim);
    const end = Number(formData.endTrim);

    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    alert("Invalid trim range");
    return;
}

    const formDataFinal = new FormData(); 

    formDataFinal.append("video", recordedBlobRef.current, "recording.webm");
    formDataFinal.append("trimStart", start.toString());
    formDataFinal.append("trimEnd", end.toString());

  await fetch("/api/trim", {
    method: "POST",
    body: formDataFinal
  });
  }

  async function startRecording() {
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
};
    

    mediaRecorderRef.current.start();
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
  }

  return (
    <div>
      <button onClick={startRecording}>Start recording</button>
      <button onClick={stopRecording}>Stop recording</button>

      <label>
        <input
          type="checkbox"
          checked={isMicEnabled}
          onChange={() => setIsMicEnabled(v => !v)}
        />
        Mic
      </label>
      {previewUrl && (
  <video
    src={previewUrl}
    controls
    style={{ width: "100%", maxWidth: 600 }}
  />
)}
<form onSubmit={onSubmit}>
  <input
    type="number"
    placeholder="Start time (seconds)"
    name="startTrim"
    value={formData.startTrim}
    onChange={onChange}
  />

  <input
    type="number"
    placeholder="End time (seconds)"
    name="endTrim"
    value={formData.endTrim}
    onChange={onChange}
  />

  <button type="submit">Send</button>
</form>


    </div>
  );
}

export default Record;

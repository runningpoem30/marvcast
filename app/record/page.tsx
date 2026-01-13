"use client";
import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useRouter } from "next/navigation";


function Record() {
  const [isMicEnabled, setIsMicEnabled] = React.useState(true);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
  startTrim: "",
  endTrim: ""
});
type TrimResult = {
  videoId: string;
  url: string;
};
const [trimResult, setTrimResult] = React.useState<TrimResult | null>(null);
const [isTrimming, setIsTrimming] = React.useState(false);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const recordedBlobRef = React.useRef<Blob | null>(null);
  
  const router = useRouter()

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

  const res = await fetch("/api/trim", {
    method: "POST",
    body: formDataFinal
  });

  if (!res.ok) {
   throw new Error("Trim failed");
}
 const data = await res.json();
 setTrimResult(data);
 

  setFormData({
    startTrim : "",
    endTrim: ""
  })
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



const Navbar = () => {
  return (
    <nav className="flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
        <h1 className="text-base font-bold md:text-2xl">MARVCLIP</h1>
      </div>
    </nav>
  );
};

  return (

    <div>
        <Navbar/>
        <div className="flex flex-row gap-x-10 lg:ml-40 ml-15 mt-20">
              <Button   variant="outline"
  className="lg:px-6 lg:py-7 font-lilex font-light lg:text-xl flex items-center gap-2 lg:[&_svg]:h-8 lg:[&_svg]:w-8 cursor-pointer" onClick={startRecording}>Start recording</Button>


      <Button  variant="outline"
  className="lg:px-6 lg:py-7 font-lilex font-light lg:text-xl flex items-center gap-2 lg:[&_svg]:h-8 lg:[&_svg]:w-8 cursor-pointer" onClick={stopRecording}>Stop recording</Button>

        </div>
    

    



      <label className="lg:ml-40 lg:mt-10">
        <input
          type="checkbox"
          checked={isMicEnabled}
          onChange={() => setIsMicEnabled(v => !v)}
        />
        Enable Mic ? 
      </label>

      {previewUrl && (
  <video className="ml-40 mt-10"
    src={previewUrl}
    controls
    style={{ width: "100%", maxWidth: 600 }}
  />
)}

{
    previewUrl ? <div className="lg:ml-40 lg:mt-20">
 <h1 className="text-xl font-light">Trim your video  , Please Enter the start time and end time in seconds : </h1>       
<form onSubmit={onSubmit}>
  <Input className='lg:w-75 h-15 placeholder:text-xl placeholder:font-lilex text-lg !text-xl font-lilex mb-5'
    type="number"
    placeholder="Start time (seconds)"
    name="startTrim"
    value={formData.startTrim}
    onChange={onChange}
  />

  <Input className='lg:w-75 h-15 placeholder:text-xl placeholder:font-lilex text-lg !text-xl font-lilex mb-5 ml-5'
    type="number"
    placeholder="End time (seconds)"
    name="endTrim"
    value={formData.endTrim}
    onChange={onChange}
  />

  <Button type="submit" className="border border-gray-400 cursor-pointer ml-5 lg:px-6 lg:py-6 text-xl font-light">Send</Button>
</form></div> : <div className="text-2xl font-light lg:ml-40 lg:mt-5">your recorded video will be previewed here : </div>
}
<div></div>
{
    trimResult ? <div> <Button  variant="outline" onClick={() => router.push(`/videos/${trimResult.videoId}`)}
  className="lg:px-6 lg:py-7 font-lilex font-light lg:text-xl flex items-center gap-2 lg:[&_svg]:h-8 lg:[&_svg]:w-8 cursor-pointer lg:ml-40" >Check Trimmed Video</Button></div> : <h2></h2>
}



    </div>
  );
}

export default Record;

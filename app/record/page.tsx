"use client";
import React from "react";

const options = {
  video: true,
};

let mediaRecorder: MediaRecorder | null = null;

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(options);
    console.log(stream);


    // this is the background encoder which is built into the browser
    // under the good this listens to the media stream and compresses frames 
    // and then produces encoded video chunks 


    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      console.log("Recording finished");
      console.log("Blob size:", blob.size);
    };

    mediaRecorder.start();
    console.log("Recording started");
  } catch (e) {
    console.error(e);
  }
}

function Record() {
  return (
    <div>
      <button onClick={startRecording}>Start recording</button>
    </div>
  );
}

export default Record;

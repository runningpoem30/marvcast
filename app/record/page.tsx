"use client";
import React from "react";

const options = {
  video: true,
};

let mediaRecorder: MediaRecorder | null = null;
let screenStream: MediaStream | null = null;


async function startRecording() {
  try {
    screenStream= await navigator.mediaDevices.getDisplayMedia(options);
    console.log(screenStream);


    // this is the background encoder which is built into the browser
    // under the good this listens to the media stream and compresses frames 
    // and then produces encoded video chunks 

    mediaRecorder = new MediaRecorder(screenStream, {
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

async function stopRecording(){
    try{
        
        mediaRecorder?.stop()
        screenStream?.getTracks().forEach(track => track.stop());
    }
    catch(e){
        console.log(e)
    }
}

function Record() {
  return (
    <div>
      <button onClick={startRecording}>Start recording</button>
      <button onClick={stopRecording}>Stop recording</button>
    </div>
  );
}

export default Record;

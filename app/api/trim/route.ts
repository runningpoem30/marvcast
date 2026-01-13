import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path"
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";


export const runtime = "nodejs"

export async function POST(req : Request){
    //we request the for the formdata from the frontend 
    const formData = await req.formData();

    const video = formData.get("video");
    const trimStart = formData.get("trimStart");
    const trimEnd = formData.get("trimEnd");



    if(!video || !trimStart || !trimEnd){
        return NextResponse.json({error : "missing fields"} , {status :400 })
    }


    // just for once you need to validate the number and data 
    const start = Number(trimStart);
    const end = Number(trimEnd);


 if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
     return NextResponse.json({ error: "Invalid trim range" }, { status: 400 });
  }



}





///we take the browser  , it records the video that is blob , and then send the form data ---> which is video + timestamps , backend will -parse that request , it will temporarily save that video on the disk because ffmpeg is a unix tool  , it operates on the disk , then only it can read , and then we will run ffmpeg , and create a trimmed file and then save that shit to the storage like amazon s3 and then treturn the public url after that we will see stuff like about analytics and stuff !
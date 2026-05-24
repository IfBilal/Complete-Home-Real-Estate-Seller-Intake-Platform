"use client";

import { compressImage, checkVideoSize } from "./compress";

export type UploadStage =
  | "compressing"
  | "requesting"
  | "uploading"
  | "confirming"
  | "analyzing"
  | "done"
  | "error";

export interface UploadProgress {
  stage:   UploadStage;
  percent: number; // 0-100
  error?:  string;
}

export interface UploadResult {
  fileId:        string;
  storagePath:   string;
  detectedRoom?: string;
  isMismatch?:   boolean;
  confidence?:   number;
}

type ProgressCallback = (p: UploadProgress) => void;

export async function uploadFile(
  file:         File,
  submissionId: string,
  room:         string,
  onProgress?:  ProgressCallback
): Promise<UploadResult> {
  const report = (stage: UploadStage, percent: number) =>
    onProgress?.({ stage, percent });

  const isVideo = file.type.startsWith("video/");

  // 0. Pre-flight checks + compression
  if (isVideo) {
    const check = checkVideoSize(file);
    if (check.oversized) throw new Error(`Video too large (${check.sizeMB} MB). Maximum is 150 MB.`);
  }

  let uploadFile = file;
  if (!isVideo) {
    report("compressing", 5);
    uploadFile = await compressImage(file).catch(() => file);
  }

  // 1. Init — get signed upload URL
  report("requesting", 10);
  const initRes = await fetch("/api/intake/upload/init", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      submissionId,
      room,
      fileType:     isVideo ? "video" : "photo",
      originalName: file.name,
      mimeType:     uploadFile.type,
      sizeBytes:    uploadFile.size,
    }),
  });

  if (!initRes.ok) {
    const json = await initRes.json().catch(() => ({ error: "Upload init failed" }));
    throw new Error(json.error ?? "Upload init failed");
  }

  const { data: initData } = await initRes.json();
  const { fileId, uploadUrl, storagePath } = initData as { fileId: string; uploadUrl: string; storagePath: string };

  // 2. Upload direct to Supabase Storage
  report("uploading", 20);
  const uploadRes = await fetch(uploadUrl, {
    method:  "PUT",
    headers: { "Content-Type": uploadFile.type },
    body:    uploadFile,
  });

  if (!uploadRes.ok) throw new Error("Storage upload failed");
  report("uploading", 75);

  // 3. Confirm
  report("confirming", 80);
  const confirmRes = await fetch("/api/intake/upload/confirm", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ fileId, submissionId }),
  });

  if (!confirmRes.ok) throw new Error("Upload confirmation failed");
  report("analyzing", 85);

  // 4. Poll status until AI analysis completes (max 30s)
  const result = await pollStatus(fileId, submissionId, onProgress);
  report("done", 100);

  return { fileId, storagePath, ...result };
}

async function pollStatus(
  fileId:       string,
  submissionId: string,
  onProgress?:  ProgressCallback
): Promise<Omit<UploadResult, "fileId" | "storagePath">> {
  const deadline = Date.now() + 30_000;
  let percent = 85;

  while (Date.now() < deadline) {
    await delay(1500);
    percent = Math.min(97, percent + 2);
    onProgress?.({ stage: "analyzing", percent });

    const res = await fetch(`/api/intake/upload/status?fileId=${fileId}&submissionId=${submissionId}`);
    if (!res.ok) continue;

    const { data } = await res.json();
    const status = data?.aiStatus as string | undefined;

    if (status === "done" || status === "skipped") {
      return {
        detectedRoom: data.detectedRoom,
        isMismatch:   data.isMismatch,
        confidence:   data.confidence,
      };
    }
  }

  // Timeout — treat as skipped, don't block the user
  return {};
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

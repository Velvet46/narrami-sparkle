export interface RecorderHandle {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export async function startRecording(): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  const mimeType = candidates.find((t) => (window as any).MediaRecorder?.isTypeSupported(t));
  if (!mimeType) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("Browser non supporta la registrazione audio");
  }
  const rec = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  rec.start(250);

  let cancelled = false;
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (cancelled) {
            resolve(new Blob([], { type: rec.mimeType }));
            return;
          }
          resolve(new Blob(chunks, { type: rec.mimeType }));
        };
        if (rec.state !== "inactive") rec.stop();
      }),
    cancel: () => {
      cancelled = true;
      if (rec.state !== "inactive") rec.stop();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

export async function transcribe(blob: Blob): Promise<string> {
  if (blob.size < 800) return "";
  const form = new FormData();
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  form.append("file", blob, `recording.${ext}`);
  const res = await fetch("/api/stt", { method: "POST", body: form });
  if (!res.ok) throw new Error(`STT ${res.status}`);
  const { text } = (await res.json()) as { text: string };
  return (text || "").trim();
}
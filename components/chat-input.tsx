"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Plus,
  Mic,
  X,
  AudioLines,
  Check,
  ArrowUp,
  ImageIcon,
  VideoIcon,
  FileIcon,
} from "lucide-react";
import {
  uploadToCloudinary,
  type UploadProgress,
} from "@/lib/cloudinary-upload";

/* ------------------ LIVE RAIL WAVEFORM ------------------ */

function LiveWaveform({
  active,
  height = 36,
}: {
  active: boolean;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const railRef = useRef<number[]>([]);

  useEffect(() => {
    if (!active) {
      cleanup();
      return;
    }

    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      draw();
    };

    start();
    return cleanup;
  }, [active]);

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d")!;
    const buffer = new Uint8Array(analyser.fftSize);

    const barWidth = 3;
    const gap = 2;
    const step = barWidth + gap;
    const maxBars = Math.floor(canvas.width / step);

    if (railRef.current.length !== maxBars) {
      railRef.current = Array(maxBars).fill(0.12);
    }

    const GAIN = 5;
    const CURVE = 0.65;
    const FLOOR = 0.12;

    const render = () => {
      analyser.getByteTimeDomainData(buffer);

      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buffer.length);

      let energy = Math.pow(rms * GAIN, CURVE);
      energy = Math.min(1, energy);

      const last = railRef.current[railRef.current.length - 1] ?? FLOOR;
      const next = last + (energy - last) * 0.35;

      railRef.current.shift();
      railRef.current.push(Math.max(FLOOR, next));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;

      for (let i = 0; i < railRef.current.length; i++) {
        const v = railRef.current[i];
        const h = v * canvas.height;

        ctx.globalAlpha = 0.35 + v * 0.65;
        ctx.fillStyle = "#e5e7eb";

        ctx.fillRect(i * step, centerY - h / 2, barWidth, h);
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
  };

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();

    railRef.current = [];
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = height * dpr;
      canvas.style.height = `${height}px`;
      canvas.getContext("2d")?.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [height]);

  return (
    <div className="flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

/* ------------------ CIRCULAR PROGRESS ------------------ */

function CircularProgress({ percentage }: { percentage: number }) {
  const size = 24;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        style={{ width: size, height: size }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-medium text-white">{percentage}%</span>
      </div>
    </div>
  );
}

/* ------------------ FILE PREVIEW ------------------ */

type FilePreview = {
  id: string;
  file: File;
  previewUrl: string;
  cloudUrl: string | null;
  publicId: string | null;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
};

function FilePreviewItem({
  preview,
  onRemove,
}: {
  preview: FilePreview;
  onRemove: () => void;
}) {
  const isImage = preview.file.type.startsWith("image/");
  const isVideo = preview.file.type.startsWith("video/");

  return (
    <div className="relative group">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-700">
        {isImage && (
          <img
            src={preview.previewUrl}
            alt={preview.file.name}
            className="w-full h-full object-cover"
          />
        )}
        {isVideo && (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800">
            <VideoIcon className="w-6 h-6 text-neutral-400" />
          </div>
        )}
        {!isImage && !isVideo && (
          <div className="w-full h-full flex items-center justify-center">
            <FileIcon className="w-6 h-6 text-neutral-400" />
          </div>
        )}

        {/* Upload progress overlay */}
        {preview.isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <CircularProgress percentage={preview.uploadProgress} />
          </div>
        )}

        {/* Error overlay */}
        {preview.error && (
          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Remove button */}
        {!preview.isUploading && (
          <button
            onClick={onRemove}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------ CHAT INPUT ------------------ */

type FileInfo = {
  url: string;
  name: string;
  type: string;
  publicId: string;
};

type ChatInputProps = {
  onSend?: (message: string, files?: FileInfo[]) => Promise<void> | void;
  placeholder?: string;
  className?: string;
};

export default function ChatInput({
  onSend,
  placeholder = "Ask anything",
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [value, setValue] = useState("");
  const [isMultiline, setIsMultiline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);

  const hasText = value.trim().length > 0;
  const hasFiles =
    filePreviews.length > 0 &&
    filePreviews.every((f) => f.cloudUrl && !f.isUploading);

  const handleSend = async () => {
    if ((!hasText && !hasFiles) || isSubmitting) return;
    const text = value.trim();

    // Get all uploaded file info (URL, name, type, publicId)
    const fileInfos: FileInfo[] = filePreviews
      .filter((f) => f.cloudUrl && !f.isUploading && f.publicId)
      .map((f) => ({
        url: f.cloudUrl!,
        name: f.file.name,
        type: f.file.type,
        publicId: f.publicId!,
      }));

    setIsSubmitting(true);
    try {
      await onSend?.(text, fileInfos.length > 0 ? fileInfos : undefined);
      setValue("");
      // Clean up file previews
      filePreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.previewUrl);
      });
      setFilePreviews([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPreviews: FilePreview[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      cloudUrl: null,
      publicId: null,
      uploadProgress: 0,
      isUploading: true,
      error: null,
    }));

    setFilePreviews((prev) => [...prev, ...newPreviews]);

    // Upload each file
    for (const preview of newPreviews) {
      try {
        const result = await uploadToCloudinary(
          preview.file,
          (progress: UploadProgress) => {
            setFilePreviews((prev) =>
              prev.map((p) =>
                p.id === preview.id
                  ? { ...p, uploadProgress: progress.percentage }
                  : p
              )
            );
          }
        );

        setFilePreviews((prev) =>
          prev.map((p) =>
            p.id === preview.id
              ? {
                  ...p,
                  cloudUrl: result.secureUrl,
                  publicId: result.publicId,
                  isUploading: false,
                  uploadProgress: 100,
                }
              : p
          )
        );
      } catch (error) {
        setFilePreviews((prev) =>
          prev.map((p) =>
            p.id === preview.id
              ? {
                  ...p,
                  isUploading: false,
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : p
          )
        );
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFilePreviews((prev) => {
      const preview = prev.find((p) => p.id === id);
      if (preview) {
        URL.revokeObjectURL(preview.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  /* -------- AUTO RESIZE TEXTAREA (PASTE + TYPE) -------- */

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight || "0");
    if (lineHeight > 0) {
      const lines = el.scrollHeight / lineHeight;
      setIsMultiline(lines > 1.2);
    } else {
      setIsMultiline(false);
    }
  }, [value]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks on stream to release the microphone
        stream.getTracks().forEach((track) => track.stop());
        // Do not clear audioChunksRef here; stopRecording() / sendForTranscription()
        // will decide whether to keep or discard the chunks.
        console.log(
          "MediaRecorder stopped, chunks length:",
          audioChunksRef.current.length
        );
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  };

  const sendForTranscription = async () => {
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    console.log("Sending chunks for transcription, count:", chunks.length);
    if (!chunks.length) {
      console.warn("No audio chunks to transcribe");
      return;
    }

    try {
      setIsTranscribing(true);
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const reader = new FileReader();

      const base64Audio: string = await new Promise((resolve, reject) => {
        reader.onerror = () => reject(reader.error);
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === "string") {
            const base64 = result.split(",")[1];
            resolve(base64);
          } else {
            reject(new Error("Failed to read audio blob"));
          }
        };
        reader.readAsDataURL(audioBlob);
      });

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audioData: base64Audio }),
      });

      if (!res.ok) {
        console.error("Transcription request failed");
        return;
      }

      const data: { transcript?: string } = await res.json();
      const transcript = data.transcript?.trim();
      console.log("Transcribed text from Deepgram:", transcript);
      if (transcript) {
        // Place the transcript into the input; let the user send manually
        setValue((v) => (v ? `${v} ${transcript}` : transcript));
      }
    } catch (err) {
      console.error("Error sending audio for transcription:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecording = async (commit: boolean) => {
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;

        const handleStop = () => {
          recorder.removeEventListener("stop", handleStop);
          setIsRecording(false);
          if (commit) {
            void sendForTranscription();
          } else {
            // Discard recorded chunks
            audioChunksRef.current = [];
          }
        };

        recorder.addEventListener("stop", handleStop);
        recorder.stop();
      } else {
        setIsRecording(false);
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (isMultiline) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [isMultiline]);

  return (
    <div className="w-full">
      {/* File previews */}
      {filePreviews.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {filePreviews.map((preview) => (
            <FilePreviewItem
              key={preview.id}
              preview={preview}
              onRemove={() => removeFile(preview.id)}
            />
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        className={`w-full rounded-2xl bg-neutral-800 text-white px-4 py-3 transition-all duration-200 ease-out ${
          className ?? ""
        }`}
      >
        {isRecording ? (
          // Recording state: show waveform UI
          <div className="flex items-center gap-3">
            <button
              disabled
              className="h-9 w-9 rounded-full bg-neutral-700 flex items-center justify-center opacity-40 cursor-not-allowed"
            >
              <Plus size={18} />
            </button>

            <LiveWaveform active={isRecording} />

            <button
              onClick={() => stopRecording(false)}
              className="h-9 w-9 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center"
            >
              <X size={18} />
            </button>

            <button
              onClick={() => stopRecording(true)}
              className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center"
            >
              <Check size={18} />
            </button>
          </div>
        ) : isTranscribing ? (
          // Transcribing state: hide waveform and input, show loading in same area
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="h-6 w-6 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
            <span className="text-xs text-neutral-300">
              Transcribing audio...
            </span>
          </div>
        ) : (
          // Normal state: show input UI
          <div
            className={
              isMultiline ? "flex flex-col gap-3" : "flex items-center gap-3"
            }
          >
            {isMultiline ? (
              <>
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={placeholder}
                  rows={1}
                  className="w-full resize-none bg-transparent outline-none text-sm leading-6 max-h-40 overflow-y-auto transition-[height] duration-200 ease-out"
                  disabled={isSubmitting}
                />

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center"
                  >
                    <Plus size={18} />
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={startRecording}
                      disabled={isTranscribing}
                      className="h-9 w-9 rounded-full bg-neutral-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mic size={18} />
                    </button>

                    <button
                      onClick={handleSend}
                      disabled={(!hasText && !hasFiles) || isSubmitting}
                      className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {hasText || hasFiles ? (
                        <ArrowUp size={18} />
                      ) : (
                        <AudioLines size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 w-9 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={placeholder}
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none text-sm leading-6 max-h-40 overflow-y-auto transition-[height] duration-200 ease-out"
                  disabled={isSubmitting}
                />

                <button
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="h-9 w-9 rounded-full bg-neutral-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mic size={18} />
                </button>

                <button
                  onClick={handleSend}
                  disabled={(!hasText && !hasFiles) || isSubmitting}
                  className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasText || hasFiles ? (
                    <ArrowUp size={18} />
                  ) : (
                    <AudioLines size={18} />
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

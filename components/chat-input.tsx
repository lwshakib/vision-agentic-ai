/**
 * ChatInput Component
 * This is a highly complex, multi-feature input system.
 * It supports:
 * 1. Auto-resizing multi-line text input.
 * 2. Voice recording with real-time waveform visualization.
 * 3. Automatic audio transcription via Deepgram.
 * 4. Multi-file uploads (images/videos) to S3 with progress tracking.
 */

'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
// Import a diverse set of icons for various UI states.
import {
  Plus,
  Mic,
  X,
  AudioLines,
  Check,
  ArrowUp,
  VideoIcon,
  FileIcon,
  Square,
  MicOff,
} from 'lucide-react';
// Import S3 upload utilities and progress types.
import {
  uploadToS3,
  type UploadProgress,
} from '@/lib/s3-upload';
import NextImage from 'next/image';
import { useFlux } from '@/hooks/useFlux';
import { toast } from 'sonner';

/* ------------------ LIVE RAIL WAVEFORM ------------------ */

/**
 * LiveWaveform Component
 * Renders a dynamic bar-style visualization of live audio input from the microphone.
 */
function LiveWaveform({
  active,
  height = 36,
}: {
  active: boolean;
  height?: number;
}) {
  // Refs for managing Canvas Web API and Web Audio API objects.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0); // Request Animation Frame ID.

  // Persistence for the bar heights to create a sliding transition effect.
  const railRef = useRef<number[]>([]);

  /**
   * Cleanup routine to stop all media tracks and close the audio context.
   */
  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();

    railRef.current = [];
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  }, []);

  /**
   * Drawing loop that converts frequency-domain audio data into visual bars.
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d')!;
    const buffer = new Uint8Array(analyser.fftSize);

    // Configuration for the bar grid.
    const barWidth = 3;
    const gap = 2;
    const step = barWidth + gap;
    const maxBars = Math.floor(canvas.width / step);

    // Initialize the bar height history if empty or resized.
    if (railRef.current.length !== maxBars) {
      railRef.current = Array(maxBars).fill(0.12);
    }

    // Constants for signal processing.
    const GAIN = 5;
    const CURVE = 0.65; // Non-linear amplification for better visibility of quiet sounds.
    const FLOOR = 0.12;

    const render = () => {
      // Get the current raw time-domain audio signal.
      analyser.getByteTimeDomainData(buffer);

      // Calculate Root Mean Square (RMS) energy to measure volume.
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buffer.length);

      // Apply non-linear scaling to the energy level for a "punchy" visual.
      let energy = Math.pow(rms * GAIN, CURVE);
      energy = Math.min(1, energy);

      // Apply a simple smoothing filter to the transition.
      const last = railRef.current[railRef.current.length - 1] ?? FLOOR;
      const next = last + (energy - last) * 0.35;

      // Shift the array to create the sliding "rail" effect.
      railRef.current.shift();
      railRef.current.push(Math.max(FLOOR, next));

      // Clear the canvas for the next frame.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;

      // Render each bar in the rail.
      for (let i = 0; i < railRef.current.length; i++) {
        const v = railRef.current[i];
        const h = v * canvas.height;

        // Visual styling: Dynamic alpha based on loudness.
        ctx.globalAlpha = 0.35 + v * 0.65;
        ctx.fillStyle = '#e5e7eb';

        // Draw the bar centered vertically.
        ctx.fillRect(i * step, centerY - h / 2, barWidth, h);
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
  }, []);

  /**
   * Effect to start or stop the audio stream and visualization loop.
   */
  useEffect(() => {
    if (!active) {
      cleanup();
      return;
    }

    const start = async () => {
      // Request microphone access.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize the Web Audio Context.
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      // Set up the analyser node for extracting signal data.
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;

      // Connect the mic stream to the analyser.
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      draw(); // Start the drawing loop.
    };

    start();
    return cleanup;
  }, [active, cleanup, draw]);

  /**
   * Handle canvas resizing and DPI scaling for crisp visuals.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = height * dpr;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d')?.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [height]);

  return (
    <div className="flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

/* ------------------ CIRCULAR PROGRESS ------------------ */

/**
 * CircularProgress Component
 * Shows a tiny circular loader for individual file uploads.
 */
function CircularProgress({ percentage }: { percentage: number }) {
  const size = 24;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Calculate dash offset based on completion percentage.
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        style={{ width: size, height: size }}
      >
        {/* Background track circle. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground progress circle. */}
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
      {/* Percentage text in the center. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-medium text-white">{percentage}%</span>
      </div>
    </div>
  );
}

/* ------------------ FILE PREVIEW ------------------ */

// Type definition for a file in the upload pipeline.
type FilePreview = {
  id: string;
  file: File;
  previewUrl: string; // Blob URL for instant local display.
  cloudUrl: string | null; // Final URL after S3 upload.
  publicId: string | null;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
};

/**
 * FilePreviewItem Component
 * Renders an individual thumbnail with upload status and removal functionality.
 */
function FilePreviewItem({
  preview,
  onRemove,
}: {
  preview: FilePreview;
  onRemove: () => void;
}) {
  const isImage = preview.file.type.startsWith('image/');
  const isVideo = preview.file.type.startsWith('video/');

  return (
    <div className="relative group">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-700">
        {/* Render local thumbnail if it's an image. */}
        {isImage && (
          <NextImage
            src={preview.previewUrl}
            alt={preview.file.name}
            className="w-full h-full object-cover"
            width={64}
            height={64}
            unoptimized
          />
        )}
        {/* Generic video icon placeholder for video files. */}
        {isVideo && (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800">
            <VideoIcon className="w-6 h-6 text-neutral-400" />
          </div>
        )}
        {/* Generic file icon for other types. */}
        {!isImage && !isVideo && (
          <div className="w-full h-full flex items-center justify-center">
            <FileIcon className="w-6 h-6 text-neutral-400" />
          </div>
        )}

        {/* Show progress overlay when uploading. */}
        {preview.isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <CircularProgress percentage={preview.uploadProgress} />
          </div>
        )}

        {/* Error state overlay. */}
        {preview.error && (
          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Remove button displayed on hover. */}
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

// Data structure passed to the parent after successful message submission.
type FileInfo = {
  url: string;
  name: string;
  type: string;
  publicId: string;
};

type ChatInputProps = {
  onSend?: (message: string, files?: FileInfo[]) => Promise<void> | void;
  onStop?: () => void;
  placeholder?: string;
  className?: string;
  isGenerating?: boolean;
  isVoiceMode?: boolean;
  onVoiceModeChange?: (value: boolean) => void;
  isSpeaking?: boolean;
};

/**
 * Main ChatInput component.
 */
export default function ChatInput({
  onSend,
  onStop,
  placeholder = 'Ask anything',
  className,
  isGenerating = false,
  isVoiceMode = false,
  onVoiceModeChange,
  isSpeaking = false,
}: ChatInputProps) {
  // DOM references for elements and recording states.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Local component states.
  const [value, setValue] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);

  // UI derive logic: Can the user send the current input?
  const hasText = value.trim().length > 0;
  const hasFiles =
    filePreviews.length > 0 &&
    filePreviews.every((f) => f.cloudUrl && !f.isUploading);

  /**
   * FLUX ASR STABILITY FIX:
   * We use refs for the callbacks to prevent useFlux from restarting
   * every time the chat messages/state update (which changes the identity of onSend).
   */
  const onSendRef = useRef(onSend);
  const onVoiceModeChangeRef = useRef(onVoiceModeChange);

  useEffect(() => {
    onSendRef.current = onSend;
    onVoiceModeChangeRef.current = onVoiceModeChange;
  }, [onSend, onVoiceModeChange]);

  const stableOnFinalTranscript = useCallback((text: string) => {
    if (text.trim()) {
      void onSendRef.current?.(text);
    }
  }, []);

  const stableOnError = useCallback((err: string) => {
    console.error('Flux ASR Error:', err);
    onVoiceModeChangeRef.current?.(false);
  }, []);

  const {
    start: startFlux,
    stop: stopFlux,
    isActive: isFluxActive,
    partialTranscript,
    isMuted,
    setIsMuted,
    volume,
  } = useFlux({
    onFinalTranscript: stableOnFinalTranscript,
    onError: stableOnError,
  });

  // Interruption Logic: Abort LLM/Speech if user starts talking
  useEffect(() => {
    if (
      isVoiceMode &&
      partialTranscript.trim().length > 2 &&
      (isGenerating || isSpeaking)
    ) {
      onStop?.();
    }
  }, [partialTranscript, isGenerating, isSpeaking, isVoiceMode, onStop]);

  const [voiceStatus, setVoiceStatus] = useState<
    'idle' | 'connecting' | 'active' | 'ending'
  >('idle');

  useEffect(() => {
    if (isVoiceMode) {
      setVoiceStatus('connecting');
      void startFlux();
    } else {
      setVoiceStatus('idle');
      stopFlux();
    }
  }, [isVoiceMode, startFlux, stopFlux]);

  useEffect(() => {
    if (isFluxActive && voiceStatus === 'connecting') {
      setVoiceStatus('active');
    }
  }, [isFluxActive, voiceStatus]);

  /**
   * Orchestrates the primary sending logic, combining text and uploaded files.
   */
  const handleSendOrStop = async () => {
    if (isGenerating && onStop) {
      onStop();
      return;
    }

    if ((!hasText && !hasFiles) || isSubmitting) return;
    const text = value.trim();

    // Collect all successfully uploaded file metadata.
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
      // Trigger the parent's send callback.
      await onSend?.(text, fileInfos.length > 0 ? fileInfos : undefined);
      setValue(''); // Reset text box.

      // Cleanup local blob URLs to prevent memory leaks.
      filePreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.previewUrl);
      });
      setFilePreviews([]); // Clear attachment list.
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Logic for when the user selects files from their device.
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Filter only images for counting and size validation
    const filesArray = Array.from(files);
    const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
    
    // Check for size limit first
    const oversizedFiles = filesArray.filter(f => f.size > MAX_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error('File too large', {
        description: 'Each image must be less than 1MB.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newImageFiles = filesArray.filter(f => f.type.startsWith('image/'));
    const currentImageCount = filePreviews.filter(p => p.file.type.startsWith('image/')).length;

    if (currentImageCount + newImageFiles.length > 2) {
      toast.error('Limit Reached', {
        description: 'You can only upload a maximum of 2 images per message.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Create a preview object for each newly selected file.
    const newPreviews: FilePreview[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file), // Local URL for immediate UI feedback.
      cloudUrl: null,
      publicId: null,
      uploadProgress: 0,
      isUploading: true,
      error: null,
    }));

    setFilePreviews((prev) => [...prev, ...newPreviews]);

    // Sequential upload processing for each file.
    for (const preview of newPreviews) {
      try {
        const result = await uploadToS3(
          preview.file,
          (progress: UploadProgress) => {
            // Update UI with real-time percentage.
            setFilePreviews((prev) =>
              prev.map((p) =>
                p.id === preview.id
                  ? { ...p, uploadProgress: progress.percentage }
                  : p,
              ),
            );
          },
        );

        // Upload complete: store S3 response data.
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
              : p,
          ),
        );
      } catch (error) {
        // Record upload failure.
        setFilePreviews((prev) =>
          prev.map((p) =>
            p.id === preview.id
              ? {
                  ...p,
                  isUploading: false,
                  error:
                    error instanceof Error ? error.message : 'Upload failed',
                }
              : p,
          ),
        );
      }
    }

    // Reset the input so the user can pick the same file again if desired.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * UI action to remove an attached file.
   */
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

  /**
   * Layout effect to perfectly resize the input area based on its current content height.
   */
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto'; // Reset to calculate true scrollHeight.
    el.style.height = `${el.scrollHeight}px`; // Set to scrollHeight.

    // Determine if the input has expanded into multiple lines.
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight || '0');
    if (lineHeight > 0) {
      const lines = el.scrollHeight / lineHeight;
      setIsMultiline(lines > 1.2);
    } else {
      setIsMultiline(false);
    }
  }, [value]);

  /**
   * Voice Input: Starts microphone capture and raw data gathering.
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle raw audio data availability.
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle stream termination events.
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop()); // Stop mic completely.
        console.log(
          'MediaRecorder stopped, chunks length:',
          audioChunksRef.current.length,
        );
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  /**
   * Sends the collected audio buffer to the backend for speech-to-text conversion.
   */
  const sendForTranscription = async () => {
    const chunks = audioChunksRef.current;
    audioChunksRef.current = []; // Reset locally.
    console.log('Sending chunks for transcription, count:', chunks.length);
    if (!chunks.length) {
      console.warn('No audio chunks to transcribe');
      return;
    }

    try {
      setIsTranscribing(true);
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const reader = new FileReader();

      // Convert audio blob to base64 string for API transmission.
      const base64Audio: string = await new Promise((resolve, reject) => {
        reader.onerror = () => reject(reader.error);
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            const base64 = result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Failed to read audio blob'));
          }
        };
        reader.readAsDataURL(audioBlob);
      });

      // Invoke the transcription API route.
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioData: base64Audio }),
      });

      if (!res.ok) {
        console.error('Transcription request failed');
        return;
      }

      const data: { transcript?: string } = await res.json();
      const transcript = data.transcript?.trim();
      console.log('Transcribed text from Deepgram:', transcript);

      // If a transcript was returned, append it to the current input text.
      if (transcript) {
        setValue((v) => (v ? `${v} ${transcript}` : transcript));
      }
    } catch (err) {
      console.error('Error sending audio for transcription:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  /**
   * Voice Input: Stops capture and decides whether to transcribe or discard.
   */
  const stopRecording = async (commit: boolean) => {
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;

        /**
         * Wait for the recorder to fully finish emitting its final chunks.
         */
        const handleStop = () => {
          recorder.removeEventListener('stop', handleStop);
          setIsRecording(false);
          if (commit) {
            void sendForTranscription();
          } else {
            audioChunksRef.current = []; // Explicitly discard if canceled.
          }
        };

        recorder.addEventListener('stop', handleStop);
        recorder.stop();
      } else {
        setIsRecording(false);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  };

  /**
   * UI focus correction when switching modes.
   */
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
      {/* File Upload List: Displayed above the input box. */}
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

      {/* Hidden file selector system hook. */}

      {/* Hidden file selector system hook. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main interactive input chassis. */}
      <div
        className={`w-full rounded-2xl bg-neutral-800 text-white px-4 py-3 transition-all duration-200 ease-out ${
          className ?? ''
        }`}
      >
        {isRecording ? (
          /* -------- ACTIVE MANUAL RECORDING UI -------- */
          <div className="flex items-center gap-3">
            <button
              disabled
              className="h-9 w-9 rounded-full bg-neutral-700 flex items-center justify-center opacity-40 cursor-not-allowed"
            >
              <Plus size={18} />
            </button>

            {/* Live audio stream visualization. */}
            <LiveWaveform active={isRecording} />

            {/* Cancel recording. */}
            <button
              onClick={() => stopRecording(false)}
              className="h-9 w-9 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center"
            >
              <X size={18} />
            </button>

            {/* Confirm and Transcribe. */}
            <button
              onClick={() => stopRecording(true)}
              className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center"
            >
              <Check size={18} />
            </button>
          </div>
        ) : isTranscribing ? (
          /* -------- TRANSCRIBING STATE UI -------- */
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="h-6 w-6 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
            <span className="text-xs text-neutral-300">
              Transcribing audio...
            </span>
          </div>
        ) : (
          /* -------- NORMAL INPUT UI -------- */
          <div
            className={
              isMultiline ? 'flex flex-col gap-3' : 'flex items-center gap-3'
            }
          >
            {isMultiline ? (
              /* Expanded View: Toolbar below text area. */
              <>
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    // Send on Enter (if no Shift key).
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendOrStop();
                    }
                  }}
                  placeholder={placeholder}
                  rows={1}
                  className="w-full resize-none bg-transparent outline-none text-sm leading-6 max-h-40 overflow-y-auto transition-[height] duration-200 ease-out"
                  disabled={isSubmitting}
                />

                <div className="flex items-center justify-between gap-3">
                  {/* Bottom-left: Attach button. */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus size={18} />
                  </button>

                  <div className="flex items-center gap-3">
                    {/* Voice input controls. */}
                    {isVoiceMode ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                        {/* Mute Toggle */}
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className={`h-10 w-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                            isMuted
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-neutral-700 text-white'
                          }`}
                        >
                          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>

                        {voiceStatus === 'connecting' ? (
                          <button
                            onClick={() => {
                              stopFlux();
                              onVoiceModeChange?.(false);
                            }}
                            className="flex items-center gap-2 px-4 h-10 rounded-full bg-neutral-700 text-white transition-all hover:scale-105 active:scale-95 animate-in fade-in zoom-in-95"
                          >
                            <X size={16} />
                            <span className="text-sm font-medium">Cancel</span>
                          </button>
                        ) : voiceStatus === 'active' ? (
                          <button
                            onClick={() => {
                              stopFlux();
                              setVoiceStatus('ending');
                              setTimeout(() => onVoiceModeChange?.(false), 800);
                            }}
                            className="group flex items-center gap-3 px-5 h-10 rounded-full bg-white text-black transition-all hover:scale-105 active:scale-95 animate-in fade-in zoom-in-95"
                          >
                            <div className="flex items-center gap-[1px] h-3">
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="w-[1.5px] bg-black rounded-full"
                                  style={{
                                    height: isMuted
                                      ? '2px'
                                      : `${4 + volume * (8 + Math.random() * 8)}px`,
                                    opacity: isMuted ? 0.3 : 1,
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">
                              End
                            </span>
                          </button>
                        ) : voiceStatus === 'ending' ? (
                          <div className="flex items-center gap-2 px-4 h-10 rounded-full bg-neutral-800 border border-neutral-700 animate-pulse">
                            <span className="text-sm font-medium text-neutral-400">
                              Ending...
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={startRecording}
                          disabled={isTranscribing}
                          className="h-10 w-10 rounded-full bg-neutral-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                        >
                          <Mic size={18} />
                        </button>

                        <button
                          onClick={() => {
                            if (isGenerating) {
                              onStop?.();
                            } else if (hasText || filePreviews.length > 0) {
                              handleSendOrStop();
                            } else {
                              onVoiceModeChange?.(true);
                            }
                          }}
                          disabled={isSubmitting}
                          className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                        >
                          {isGenerating ? (
                            <Square fill="currentColor" size={14} />
                          ) : hasText || filePreviews.length > 0 ? (
                            <ArrowUp size={18} />
                          ) : (
                            <AudioLines size={18} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Inline View: Toolbar on same line as text input. */
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                >
                  <Plus size={18} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendOrStop();
                    }
                  }}
                  placeholder={placeholder}
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none text-sm leading-6 max-h-40 overflow-y-auto transition-[height] duration-200 ease-out"
                  disabled={isSubmitting}
                />

                <div className="flex items-center gap-2 h-10">
                  {isVoiceMode ? (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                      {/* Mute Toggle */}
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                          isMuted
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-neutral-700 text-white'
                        }`}
                      >
                        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>

                      {/* Status Interaction Button */}
                      {voiceStatus === 'connecting' ? (
                        <button
                          onClick={() => {
                            stopFlux();
                            onVoiceModeChange?.(false);
                          }}
                          className="flex items-center gap-2 px-3 h-10 rounded-full bg-neutral-700 text-white transition-all hover:scale-105 active:scale-95 font-semibold"
                        >
                          <X size={16} />
                          <span className="text-xs">Cancel</span>
                        </button>
                      ) : voiceStatus === 'active' ? (
                        <button
                          onClick={() => {
                            stopFlux();
                            setVoiceStatus('ending');
                            setTimeout(() => onVoiceModeChange?.(false), 800);
                          }}
                          className="group flex items-center gap-2 px-3 h-10 rounded-full bg-white text-black transition-all hover:scale-105 active:scale-95"
                        >
                          <div className="flex items-center gap-[1px] h-3">
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="w-[1.5px] bg-black rounded-full"
                                style={{
                                  height: isMuted
                                    ? '2px'
                                    : `${4 + volume * (8 + Math.random() * 8)}px`,
                                  opacity: isMuted ? 0.3 : 1,
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold uppercase">
                            End
                          </span>
                        </button>
                      ) : (
                        <div className="px-3 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center">
                          <span className="text-xs font-medium text-neutral-400">
                            Ending...
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={startRecording}
                        disabled={isTranscribing}
                        className="h-10 w-10 rounded-full bg-neutral-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                      >
                        <Mic size={18} />
                      </button>

                      <button
                        onClick={() => {
                          if (isGenerating) {
                            onStop?.();
                          } else if (hasText || filePreviews.length > 0) {
                            handleSendOrStop();
                          } else {
                            onVoiceModeChange?.(true);
                          }
                        }}
                        disabled={isSubmitting}
                        className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                      >
                        {isGenerating ? (
                          <Square fill="currentColor" size={14} />
                        ) : hasText || filePreviews.length > 0 ? (
                          <ArrowUp size={18} />
                        ) : (
                          <AudioLines size={18} />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

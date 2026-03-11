'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook to manage live ASR using Flux (Cloudflare Worker).
 * Handles WebSocket connection, audio capture, and PCM conversion.
 */
export function useFlux({
  onTranscript,
  onFinalTranscript,
  onError,
}: {
  onTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: string) => void;
} = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const lastTurnIndexRef = useRef(-1);
  
  // Use a ref to track mute state inside the audio callback without closure staleness
  const isMutedRef = useRef(false);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setIsMuted(false);
    lastTurnIndexRef.current = -1;
  }, []);

  const start = useCallback(async () => {
    try {
      // 1. Fetch Config
      const res = await fetch('/api/flux/config');
      if (!res.ok) throw new Error('Failed to load ASR config');
      const { url, token } = await res.json();

      // 2. Connect WebSocket
      const socketUrl = new URL(url);
      socketUrl.searchParams.set('token', token);
      
      const ws = new WebSocket(socketUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Flux ASR Connected');
        setIsActive(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcript) {
            if (data.event === 'Update') {
              setPartialTranscript(data.transcript);
              onTranscript?.(data.transcript);
            } else if (data.event === 'EndOfTurn') {
              const turnIndex = data.turn_index ?? 0;
              if (turnIndex > lastTurnIndexRef.current) {
                lastTurnIndexRef.current = turnIndex;
                setPartialTranscript('');
                onFinalTranscript?.(data.transcript);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing Flux message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket Error:', e);
        onError?.('ASR Connection Error');
      };

      ws.onclose = () => {
        console.log('🔌 Flux ASR Closed');
        cleanup();
      };

      // 3. Audio Capture & PCM Conversion
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000, 
      });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN || isMutedRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        ws.send(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

    } catch (err: any) {
      console.error('Error starting Flux:', err);
      onError?.(err.message || 'Failed to start ASR');
      cleanup();
    }
  }, [cleanup, onTranscript, onFinalTranscript, onError]);

  const stop = useCallback(() => {
    cleanup();
    setPartialTranscript('');
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    start,
    stop,
    isActive,
    partialTranscript,
    isMuted,
    setIsMuted,
  };
}

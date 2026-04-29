import { useState, useRef, useCallback, useEffect } from 'react';
import {
  GeminiLiveAPI,
  AudioStreamer,
  AudioPlayer,
  MultimodalLiveResponseType,
} from '@/lib/gemini-live-client';

export function useLiveAPI() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isError, setIsError] = useState(false);
  const [volume, setVolume] = useState(0);
  const [shouldConnect, setShouldConnect] = useState(false);
  const clientRef = useRef<GeminiLiveAPI | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const isConnectingRef = useRef(false);
  const isManualDisconnectRef = useRef(false);

  // Callbacks for the UI to subscribe to
  const onReceiveTextRef = useRef<((text: string, isFinal: boolean, role: 'user' | 'assistant', isCumulative: boolean) => void) | null>(null);
  const onTurnCompleteRef = useRef<(() => void) | null>(null);

  const disconnect = useCallback((manual: boolean = false) => {
    if (manual) {
      isManualDisconnectRef.current = true;
      setShouldConnect(false);
    }
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(async () => {
    if (isConnectingRef.current || (clientRef.current && clientRef.current.connected)) return;
    isConnectingRef.current = true;
    isManualDisconnectRef.current = false;
    setShouldConnect(true);
    
    try {
      setIsError(false);
      // Fetch token
      console.log('📡 Fetching Gemini Live token from /api/voice-agent/token...');
      const res = await fetch('/api/voice-agent/token');
      if (!res.ok) {
        console.error('❌ Failed to fetch token:', res.status, res.statusText);
        throw new Error('Failed to fetch live API token');
      }
      const data = await res.json();
      console.log('✅ Token fetched successfully');
      
      const client = new GeminiLiveAPI(data.token);
      clientRef.current = client;

      client.setSystemInstructions('You are Vision, a helpful AI voice assistant. Keep your responses conversational and concise.');
      
      const streamer = new AudioStreamer(client, (level) => {
        setVolume(level);
      });
      streamerRef.current = streamer;

      const player = new AudioPlayer();
      playerRef.current = player;
      await player.init();

      client.onOpen = async () => {
        setIsConnected(true);
        await streamer.start();
      };

      client.onClose = () => {
        console.warn('⚠️ Gemini Live WebSocket Closed. Session ended.');
        disconnect();
      };

      client.onError = (msg) => {
        console.error('Live API Error:', msg);
        setIsError(true);
        disconnect();
      };

      client.onReceiveResponse = async (response) => {
        if (response.type === MultimodalLiveResponseType.AUDIO) {
          setIsSpeaking(true);
          await player.play(response.data);
        } else if (response.type === MultimodalLiveResponseType.INTERRUPTED) {
          player.interrupt();
          setIsSpeaking(false);
        } else if (response.type === MultimodalLiveResponseType.TURN_COMPLETE) {
          setIsSpeaking(false);
          if (onTurnCompleteRef.current) onTurnCompleteRef.current();
        } else if (response.type === MultimodalLiveResponseType.INPUT_TRANSCRIPTION) {
          if (onReceiveTextRef.current) {
            onReceiveTextRef.current(response.data.text || '', response.data.finished, 'user', false);
          }
        } else if (response.type === MultimodalLiveResponseType.TEXT) {
           if (onReceiveTextRef.current) {
            onReceiveTextRef.current(response.data || '', true, 'assistant', true);
          }
        } else if (response.type === MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION) {
           if (onReceiveTextRef.current) {
            onReceiveTextRef.current(response.data.text || '', response.data.finished, 'assistant', false);
          }
        }
      };

      client.connect();
    } catch (err) {
      console.error(err);
      setIsError(true);
      disconnect();
    } finally {
      isConnectingRef.current = false;
    }
  }, [disconnect, shouldConnect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const onTranscription = useCallback((fn: (text: string, isFinal: boolean, role: 'user' | 'assistant', isCumulative: boolean) => void) => {
    onReceiveTextRef.current = fn;
  }, []);

  const onTurnComplete = useCallback((fn: () => void) => {
    onTurnCompleteRef.current = fn;
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    isError,
    volume,
    onTranscription,
    onTurnComplete,
  };
}

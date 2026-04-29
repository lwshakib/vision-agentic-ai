// Response type constants
export const MultimodalLiveResponseType = {
  TEXT: 'TEXT',
  AUDIO: 'AUDIO',
  SETUP_COMPLETE: 'SETUP COMPLETE',
  INTERRUPTED: 'INTERRUPTED',
  TURN_COMPLETE: 'TURN COMPLETE',
  TOOL_CALL: 'TOOL_CALL',
  ERROR: 'ERROR',
  INPUT_TRANSCRIPTION: 'INPUT_TRANSCRIPTION',
  OUTPUT_TRANSCRIPTION: 'OUTPUT_TRANSCRIPTION',
};

/**
 * Parses response messages from the Gemini Live API
 */
function parseResponseMessages(data: any) {
  const responses: any[] = [];
  const serverContent = data?.serverContent;
  const parts = serverContent?.modelTurn?.parts;

  try {
    if (data?.setupComplete) {
      responses.push({
        type: MultimodalLiveResponseType.SETUP_COMPLETE,
        data: '',
        endOfTurn: false,
      });
      return responses;
    }

    if (data?.toolCall) {
      responses.push({
        type: MultimodalLiveResponseType.TOOL_CALL,
        data: data.toolCall,
        endOfTurn: false,
      });
      return responses;
    }

    if (parts?.length) {
      for (const part of parts) {
        if (part.inlineData) {
          responses.push({
            type: MultimodalLiveResponseType.AUDIO,
            data: part.inlineData.data,
            endOfTurn: false,
          });
        } else if (part.text) {
          responses.push({
            type: MultimodalLiveResponseType.TEXT,
            data: part.text,
            endOfTurn: false,
          });
        }
      }
    }

    if (serverContent?.inputTranscription) {
      responses.push({
        type: MultimodalLiveResponseType.INPUT_TRANSCRIPTION,
        data: {
          text: serverContent.inputTranscription.text || '',
          finished: serverContent.inputTranscription.finished || false,
        },
        endOfTurn: false,
      });
    }

    if (serverContent?.outputTranscription) {
      responses.push({
        type: MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION,
        data: {
          text: serverContent.outputTranscription.text || '',
          finished: serverContent.outputTranscription.finished || false,
        },
        endOfTurn: false,
      });
    }

    if (serverContent?.interrupted) {
      responses.push({
        type: MultimodalLiveResponseType.INTERRUPTED,
        data: '',
        endOfTurn: false,
      });
    }

    if (serverContent?.turnComplete) {
      responses.push({
        type: MultimodalLiveResponseType.TURN_COMPLETE,
        data: '',
        endOfTurn: true,
      });
    }
  } catch (err) {
    console.log('⚠️ Error parsing response data: ', err, data);
  }

  return responses;
}

/**
 * Main Gemini Live API client
 */
export class GeminiLiveAPI {
  public token: string;
  public model: string;
  public modelUri: string;
  public responseModalities: string[];
  public systemInstructions: string;
  public voiceName: string;
  public temperature: number;
  public inputAudioTranscription: boolean;
  public outputAudioTranscription: boolean;
  public automaticActivityDetection: any;
  public activityHandling: string;
  public serviceUrl: string;
  public connected: boolean;
  public webSocket: WebSocket | null;
  public totalBytesSent: number;

  public onReceiveResponse: (message: any) => void;
  public onOpen: () => void;
  public onClose: () => void;
  public onError: (message: string) => void;

  constructor(token: string, model: string = 'gemini-3.1-flash-live-preview') {
    this.token = token;
    this.model = model;
    this.modelUri = `models/${this.model}`;

    this.responseModalities = ['AUDIO'];
    this.systemInstructions = '';
    this.voiceName = 'Puck'; // Default voice
    this.temperature = 1.0;
    this.inputAudioTranscription = true;
    this.outputAudioTranscription = true;
    this.totalBytesSent = 0;

    this.automaticActivityDetection = {
      disabled: false,
      silence_duration_ms: 2000,
      prefix_padding_ms: 500,
      end_of_speech_sensitivity: 'END_SENSITIVITY_UNSPECIFIED',
      start_of_speech_sensitivity: 'START_SENSITIVITY_UNSPECIFIED',
    };

    this.activityHandling = 'ACTIVITY_HANDLING_UNSPECIFIED';

    this.serviceUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${this.token}`;

    this.connected = false;
    this.webSocket = null;
    this.heartbeatTimer = null;

    this.onReceiveResponse = () => {};
    this.onOpen = () => {};
    this.onClose = () => {};
    this.onError = () => {};
  }

  setSystemInstructions(newSystemInstructions: string) {
    this.systemInstructions = newSystemInstructions;
  }

  setVoice(voiceName: string) {
    this.voiceName = voiceName;
  }

  connect() {
    this.setupWebSocketToService();
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    this.connected = false;
  }

  sendMessage(message: any) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  async onReceiveMessage(messageEvent: MessageEvent) {
    let jsonData;
    if (messageEvent.data instanceof Blob) {
      jsonData = await messageEvent.data.text();
    } else if (messageEvent.data instanceof ArrayBuffer) {
      jsonData = new TextDecoder().decode(messageEvent.data);
    } else {
      jsonData = messageEvent.data;
    }

    try {
      const messageData = JSON.parse(jsonData);
      console.log('📥 WebSocket Message:', messageData); 
      
      if (messageData.error) {
         console.error('❌ Server reported error:', messageData.error);
      }

      const responses = parseResponseMessages(messageData);
      for (const response of responses) {
        this.onReceiveResponse(response);
      }
    } catch (err) {
      console.error('Error parsing JSON message:', err, jsonData);
    }
  }

  setupWebSocketToService() {
    this.webSocket = new WebSocket(this.serviceUrl);

    this.webSocket.onclose = (ev) => {
      console.warn(`⚠️ Gemini Live WebSocket Closed. Code: ${ev.code}, Reason: ${ev.reason}`);
      this.connected = false;
      this.stopHeartbeat();
      this.onClose();
    };

    this.webSocket.onerror = (ev) => {
      console.error('❌ Gemini Live WebSocket Error:', ev);
      this.connected = false;
      this.onError('Connection error');
    };

    this.webSocket.onopen = () => {
      console.log('✅ Gemini Live WebSocket Connected');
      this.connected = true;
      this.totalBytesSent = 0;
      this.sendInitialSetupMessages();
      this.startHeartbeat();
      this.onOpen();
    };

    this.webSocket.onmessage = this.onReceiveMessage.bind(this);
  }

  sendInitialSetupMessages() {
    const sessionSetupMessage: any = {
      setup: {
        model: this.modelUri,
        generationConfig: {
          responseModalities: this.responseModalities,
          temperature: this.temperature,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voiceName,
              },
            },
          },
        },
        systemInstruction: { parts: [{ text: this.systemInstructions }] },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: this.automaticActivityDetection.disabled,
            silenceDurationMs: this.automaticActivityDetection.silence_duration_ms,
            prefixPaddingMs: this.automaticActivityDetection.prefix_padding_ms,
            endOfSpeechSensitivity: this.automaticActivityDetection.end_of_speech_sensitivity,
            startOfSpeechSensitivity: this.automaticActivityDetection.start_of_speech_sensitivity,
          },
          activityHandling: this.activityHandling,
        },
      },
    };

    if (this.inputAudioTranscription) {
      sessionSetupMessage.setup.inputAudioTranscription = {};
    }
    if (this.outputAudioTranscription) {
      sessionSetupMessage.setup.outputAudioTranscription = {};
    }

    this.sendMessage(sessionSetupMessage);
  }

  sendTextMessage(text: string) {
    const message = {
      realtimeInput: {
        text: text,
      },
    };
    this.sendMessage(message);
  }

  sendRealtimeInputMessage(data: string, mimeType: string) {
    const blob = { mimeType, data };
    const message: any = { realtimeInput: {} };

    if (mimeType.startsWith('audio/')) {
      message.realtimeInput.audio = blob;
    } else if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
      message.realtimeInput.video = blob;
    }

    this.sendMessage(message);
  }

  sendAudioMessage(base64PCM: string) {
    this.sendRealtimeInputMessage(base64PCM, 'audio/pcm;rate=16000');
  }

  private heartbeatTimer: any = null;
  private startHeartbeat() {
    // Disabled heartbeat for now to check if it causes disconnects
    /*
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
       if (this.connected && this.webSocket?.readyState === WebSocket.OPEN) {
          this.sendMessage({ realtimeInput: { audio: { data: '', mimeType: 'audio/pcm;rate=16000' } } });
       }
    }, 10000);
    */
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
       clearInterval(this.heartbeatTimer);
       this.heartbeatTimer = null;
    }
  }
}

/**
 * Audio Streamer - Captures and streams microphone audio
 */
export class AudioStreamer {
  private client: GeminiLiveAPI;
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  public isStreaming: boolean = false;
  private sampleRate: number = 16000;

  private onLevel?: (level: number) => void;

  constructor(geminiClient: GeminiLiveAPI, onLevel?: (level: number) => void) {
    this.client = geminiClient;
    this.onLevel = onLevel;
  }

  async start() {
    try {
      const audioConstraints = {
        sampleRate: this.sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: this.sampleRate });
      this.audioContext = ctx;

      if (!this.audioContext || (ctx.state as string) === 'closed') {
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
        }
        return false;
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      try {
        await ctx.audioWorklet.addModule('/audio-processors/capture.worklet.js');
      } catch (err) {
        console.error('Failed to load capture worklet:', err);
        throw err;
      }

      if (!this.audioContext || (ctx.state as string) === 'closed') {
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
        }
        return false;
      }

      this.audioWorklet = new AudioWorkletNode(
        ctx,
        'audio-capture-processor',
      );

      this.audioWorklet.port.onmessage = (event) => {
        if (!this.isStreaming) return;

        if (event.data.type === 'audio') {
          const inputData = event.data.data;
          
          if (this.onLevel) {
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            this.onLevel(rms);
          }

          const pcmData = this.convertToPCM16(inputData);
          const base64Audio = this.arrayBufferToBase64(pcmData);

          if (this.client && this.client.connected) {
            this.client.sendAudioMessage(base64Audio);
          }
        }
      };

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.audioWorklet);

      this.isStreaming = true;
      return true;
    } catch (error) {
      console.error('Failed to start audio streaming:', error);
      throw error;
    }
  }

  stop() {
    this.isStreaming = false;

    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet.port.close();
      this.audioWorklet = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  convertToPCM16(float32Array: Float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample * 0x7fff;
    }
    return int16Array.buffer;
  }

  arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

/**
 * Audio Player - Plays audio responses from Gemini
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized: boolean = false;
  private volume: number = 1.0;
  private sampleRate: number = 24000;

  async init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: this.sampleRate });
      this.audioContext = ctx;

      if (!this.audioContext || (ctx.state as string) === 'closed') {
        return;
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      try {
        await ctx.audioWorklet.addModule('/audio-processors/playback.worklet.js');
      } catch (err) {
        console.error('Failed to load playback worklet:', err);
        throw err;
      }

      if (!this.audioContext || (ctx.state as string) === 'closed') {
        return;
      }

      this.workletNode = new AudioWorkletNode(
        ctx,
        'pcm-processor',
      );

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      this.workletNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio player:', error);
      throw error;
    }
  }

  async play(base64Audio: string) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const inputArray = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(inputArray.length);
      for (let i = 0; i < inputArray.length; i++) {
        float32Data[i] = inputArray[i] / 32768;
      }

      this.workletNode?.port.postMessage(float32Data);
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      throw error;
    }
  }

  interrupt() {
    if (this.workletNode) {
      this.workletNode.port.postMessage('interrupt');
    }
  }

  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}

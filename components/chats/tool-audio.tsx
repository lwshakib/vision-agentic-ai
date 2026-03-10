'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, MusicIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ToolTextToSpeechProps {
  audioUrl: string;
  text?: string;
  voice?: string;
}

export function ToolAudioPlayer({ audioUrl, text, voice }: ToolTextToSpeechProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync state with actual audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const audios = document.getElementsByTagName('audio');
      for (let i = 0; i < audios.length; i++) {
        if (audios[i] !== audioRef.current) audios[i].pause();
      }
      audioRef.current.play().catch((err) => {
        console.error('Playback failed:', err);
        toast.error('Playback failed. Please try again.');
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `speech-${voice || 'audio'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Audio downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download audio');
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 my-2 w-full max-w-sm rounded-2xl border bg-card/60 shadow-sm backdrop-blur-sm transition-all hover:bg-card/80">
      <div className="flex items-center gap-4 overflow-hidden">
        {/* Modern Icon Container */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
          <MusicIcon className={cn("size-5", isPlaying && "animate-pulse")} />
        </div>

        {/* Info Section */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight">Synthesized Audio</span>
            {voice && (
              <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground border border-muted">
                {voice}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wide text-muted-foreground/80 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
            {isPlaying ? 'Now playing · ' + (text?.substring(0, 20) || '') + '...' : 'Ready to play'}
          </span>
        </div>
      </div>

      {/* Action Section */}
      <div className="flex items-center gap-1.5 shrink-0">
        <audio ref={audioRef} src={audioUrl} className="hidden" />
        
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={handleDownload}
          title="Download Audio"
        >
          <DownloadIcon className="size-4" />
        </Button>

        <Button
          size="icon"
          variant="outline"
          className={cn(
            "size-9 rounded-full transition-all active:scale-95",
            isPlaying 
              ? 'border-foreground bg-foreground text-background shadow-sm' 
              : 'border-muted bg-background hover:bg-muted/50'
          )}
          onClick={handleTogglePlay}
        >
          {isPlaying ? (
            <PauseIcon className="size-4 fill-current" />
          ) : (
            <PlayIcon className="size-4 fill-current" />
          )}
        </Button>
      </div>
    </div>
  );
}


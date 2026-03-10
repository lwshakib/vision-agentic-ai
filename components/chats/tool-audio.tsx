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

import { ToolCard } from './tool-card';

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
    <ToolCard
      icon={MusicIcon}
      title="AI Generated Speech"
      subtitle={text}
      badge={voice || 'HYPERION'}
      onDownload={handleDownload}
    >
      <div className="flex items-center justify-between gap-3 p-4 bg-card/50">
        <div className="flex items-center gap-4 overflow-hidden">
          {/* Modern Icon Container */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <MusicIcon className={cn("size-6", isPlaying && "animate-pulse")} />
          </div>

          {/* Info Section */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Synthesized Audio</span>
              {voice && (
                <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-muted">
                  {voice}
                </span>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              {isPlaying ? 'Now Playing' : 'Ready to play'}
            </span>
          </div>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-2 px-1">
          <audio ref={audioRef} src={audioUrl} className="hidden" />
          
          <Button
            size="icon"
            variant="outline"
            className={cn(
              "size-10 rounded-full transition-all active:scale-95",
              isPlaying 
                ? 'border-primary bg-primary text-primary-foreground shadow-lg' 
                : 'border-primary/20 bg-primary/5 hover:bg-primary/10 hover:text-primary'
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
    </ToolCard>
  );
}

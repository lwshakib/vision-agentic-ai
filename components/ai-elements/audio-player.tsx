'use client';

import {
  MediaControlBar,
  MediaController,
  MediaDurationDisplay,
  MediaMuteButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from 'media-chrome/react';
import type { ComponentProps, CSSProperties } from 'react';
import { DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ProAudioPlayerProps {
  src?: string;
  data?: {
    base64: string;
    mediaType: string;
  };
  className?: string;
  fileName?: string;
}

export function ProAudioPlayer({
  src,
  data,
  className,
  fileName = 'speech.mp3',
}: ProAudioPlayerProps) {
  const audioSrc =
    src || (data ? `data:${data.mediaType};base64,${data.base64}` : '');

  const handleDownload = async () => {
    try {
      const response = await fetch(audioSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Audio download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download audio');
    }
  };

  if (!audioSrc) return null;

  return (
    <MediaController
      audio
      className={cn('my-4 w-full', className)}
      style={
        {
          '--media-button-icon-width': '1.25rem',
          '--media-button-icon-height': '1.25rem',
          '--media-icon-color': 'currentColor',
          '--media-font-size': '12px',
          '--media-background-color': 'transparent',
          '--media-control-background': 'transparent',
          '--media-control-hover-background': 'transparent',
          '--media-primary-color': 'var(--color-primary)',
          '--media-range-bar-color': 'var(--color-primary)',
          '--media-range-track-background': 'var(--color-muted)',
          width: '100%',
        } as CSSProperties
      }
    >
      <audio slot="media" src={audioSrc} preload="metadata" />

      <MediaControlBar className="flex h-14 items-center gap-2">
        {/* Play/Pause */}
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="size-10 shrink-0 rounded-full hover:bg-transparent hover:text-foreground"
        >
          <MediaPlayButton />
        </Button>

        {/* Seek Backward */}
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 rounded-full opacity-60 hover:bg-transparent hover:text-foreground hover:opacity-100"
        >
          <MediaSeekBackwardButton seekOffset={10} />
        </Button>

        {/* Time Display */}
        <div className="flex shrink-0 items-center px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
          <MediaTimeDisplay />
        </div>

        {/* Seek Slider */}
        <MediaTimeRange className="mx-1 h-8 flex-1" />

        {/* Duration Display */}
        <div className="flex shrink-0 items-center px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
          <MediaDurationDisplay />
        </div>

        {/* Seek Forward */}
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 rounded-full opacity-60 hover:bg-transparent hover:text-foreground hover:opacity-100"
        >
          <MediaSeekForwardButton seekOffset={10} />
        </Button>

        {/* Volume */}
        <div className="group flex items-center gap-1 overflow-hidden transition-all duration-300">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-8 shrink-0 rounded-full hover:bg-transparent hover:text-foreground"
          >
            <MediaMuteButton />
          </Button>
          <MediaVolumeRange className="w-0 transition-all duration-300 group-hover:w-16" />
        </div>

        {/* Custom Download Button */}
        <Button
          size="icon"
          variant="ghost"
          className="size-10 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-transparent hover:text-primary"
          onClick={handleDownload}
          title="Download Audio"
        >
          <DownloadIcon className="size-5" />
        </Button>
      </MediaControlBar>
    </MediaController>
  );
}

'use client';

interface ToolTextToSpeechProps {
  audioUrl: string;
  text?: string;
}

export function ToolAudioPlayer({ audioUrl, text }: ToolTextToSpeechProps) {
  return (
    <div className="my-3 rounded-lg border border-border/40 overflow-hidden bg-muted/30">
      <div className="p-3 bg-muted/50 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Generated Audio</span>
        </div>
        {text && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            &quot;{text}&quot;
          </p>
        )}
      </div>
      <div className="p-4 flex justify-center bg-background">
        <audio controls src={audioUrl} className="w-full" />
      </div>
    </div>
  );
}

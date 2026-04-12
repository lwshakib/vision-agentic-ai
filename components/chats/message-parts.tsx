'use client';

import React, { useMemo } from 'react';
import {
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import { Source, SourceTrigger, SourceContent } from './source';
import { ToolImage } from '@/components/tools/tool-image';
import { ProAudioPlayer } from '@/components/ai-elements/audio-player';
import { ToolError } from '@/components/tools/tool-status';
import { ToolFileDownload } from '@/components/tools/tool-file';
import {
  ImageIcon,
  MusicIcon,
  FileTextIcon,
  GlobeIcon,
  SearchIcon,
  BrainIcon,
} from 'lucide-react';

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from '@/components/ai/chain-of-thought';

interface MessagePart {
  type: string;
  text?: string;
  reasoning?: string;
  isStreaming?: boolean;
  duration?: number;
  sources?: SourceItem[];
  input?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  output?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  state?: string;
  [key: string]: unknown;
}

interface SourceItem {
  url?: string;
  href?: string;
  title?: string;
  name?: string;
  description?: string;
}

interface MessagePartsProps {
  messageId: string;
  parts: MessagePart[];
  isVersioned?: boolean;
  version?: number | string;
}

export function ChatMessageParts({
  messageId,
  parts,
  isVersioned,
  version,
}: MessagePartsProps) {
  const { processParts, finalParts, hasActiveSteps } = useMemo(() => {
    const process: React.ReactNode[] = [];
    const final: React.ReactNode[] = [];
    let hasActive = false;

    const validParts = parts.filter(
      (part) => part.type !== 'file' && part.type !== 'attachment',
    );

    validParts.forEach((part, i) => {
      const key = `${messageId}-${i}`;

      if (part.type === 'text') {
        if (part.text) {
          final.push(
            <div key={key} className="flex flex-col gap-1">
              <MessageResponse className="[&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1.5 [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:text-xs">
                {part.text}
              </MessageResponse>
              {isVersioned && version && (
                <span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Version {version}
                </span>
              )}
            </div>,
          );
        }
        return;
      }

      if (part.type === 'reasoning') {
        const reasoningText = part.reasoning ?? part.text ?? '';
        if (reasoningText) {
          const isStreaming = Boolean(part.isStreaming);
          if (isStreaming) hasActive = true;
          process.push(
            <ChainOfThoughtStep
              key={key}
              icon={BrainIcon}
              label={isStreaming ? 'Thinking...' : 'Thought process'}
              description={reasoningText}
              status={isStreaming ? 'active' : 'complete'}
            />,
          );
        }
        return;
      }

      if (part.type === 'sources') {
        const sources = part.sources ?? [];
        if (sources.length > 0) {
          final.push(
            <div key={key} className="mb-3 flex flex-wrap justify-start gap-2">
              {sources.map((source: SourceItem) => {
                const href = source.url ?? source.href;
                if (!href) return null;
                const title = source.title ?? source.name ?? source.url ?? href;
                return (
                  <Source href={href} key={href}>
                    <SourceTrigger showFavicon />
                    <SourceContent
                      title={title}
                      description={source.description}
                    />
                  </Source>
                );
              })}
            </div>,
          );
        }
        return;
      }

      if (
        typeof part.type === 'string' &&
        (part.type.startsWith('tool-') || part.type === 'tool-ui')
      ) {
        const toolCall = part;
        const toolName =
          part.type === 'tool-ui'
            ? (toolCall.toolName as string)
            : part.type.replace('tool-', '');

        const state = (toolCall.state || toolCall.status) as string;
        const input = (toolCall.input || toolCall.args) as any;
        const output = (toolCall.output || toolCall.result) as any;

        const isLoading =
          state === 'input-streaming' ||
          state === 'input-available' ||
          state === 'running';
        const hasOutput =
          (state === 'output-available' || state === 'ready' || output) &&
          !!output;

        if (isLoading) hasActive = true;

        if (toolName === 'webSearch') {
          const text = input?.query?.trim()
            ? `Searching web for "${input.query}"`
            : 'Searching web';
          process.push(
            <ChainOfThoughtStep
              key={key}
              icon={SearchIcon}
              label={text}
              status={isLoading ? 'active' : 'complete'}
            >
              {!isLoading && hasOutput && output?.results?.length > 0 && (
                <ChainOfThoughtSearchResults>
                  {output.results.map((r: any, idx: number) => {
                    let hostname = 'Result';
                    try {
                      hostname = r.url ? new URL(r.url).hostname : 'Result';
                    } catch (e) {}
                    return (
                      <ChainOfThoughtSearchResult key={idx}>
                        {hostname}
                      </ChainOfThoughtSearchResult>
                    );
                  })}
                </ChainOfThoughtSearchResults>
              )}
            </ChainOfThoughtStep>,
          );
          return;
        }

        if (toolName === 'extractWebUrl') {
          const urls = input?.urls ?? output?.urls ?? [];
          const text =
            urls.length > 0
              ? `Extracting content from ${urls.length} link${urls.length > 1 ? 's' : ''}`
              : 'Extracting content';
          process.push(
            <ChainOfThoughtStep
              key={key}
              icon={GlobeIcon}
              label={text}
              status={isLoading ? 'active' : 'complete'}
            >
              {!isLoading && hasOutput && output?.results?.length > 0 && (
                <ChainOfThoughtSearchResults>
                  {output.results.map((r: any, idx: number) => {
                    let hostname = 'Result';
                    try {
                      hostname = r.url ? new URL(r.url).hostname : 'Result';
                    } catch (e) {}
                    return (
                      <ChainOfThoughtSearchResult key={idx}>
                        {hostname}
                      </ChainOfThoughtSearchResult>
                    );
                  })}
                </ChainOfThoughtSearchResults>
              )}
            </ChainOfThoughtStep>,
          );
          return;
        }

        if (toolName === 'generateImage' || toolName === 'imageToImage') {
          if (isLoading) {
            process.push(
              <ChainOfThoughtStep
                key={key}
                icon={ImageIcon}
                label={
                  toolName === 'imageToImage'
                    ? 'Generating variations...'
                    : 'Generating image...'
                }
                status="active"
              />,
            );
          } else if (hasOutput) {
            process.push(
              <ChainOfThoughtStep
                key={`${key}-done`}
                icon={ImageIcon}
                label={
                  toolName === 'imageToImage'
                    ? 'Generated variations'
                    : 'Generated image'
                }
                status="complete"
              />,
            );
            if (output.success && output.image) {
              final.push(
                <ToolImage
                  key={key}
                  imageSrc={output.image}
                  prompt={input?.prompt}
                  options={{
                    model:
                      input?.model ||
                      (toolName === 'generateImage'
                        ? 'FLUX.2'
                        : 'ImageToImage'),
                    width: input?.width,
                    height: input?.height,
                  }}
                />,
              );
            } else if (!output.success) {
              final.push(
                <ToolError
                  key={key}
                  title="Image generation failed"
                  error="The system encountered an error while processing your image."
                />,
              );
            }
          }
          return;
        }

        if (toolName === 'textToSpeech') {
          if (isLoading) {
            process.push(
              <ChainOfThoughtStep
                key={key}
                icon={MusicIcon}
                label="Synthesizing speech..."
                status="active"
              />,
            );
          } else if (hasOutput) {
            process.push(
              <ChainOfThoughtStep
                key={`${key}-done`}
                icon={MusicIcon}
                label="Speech synthesized"
                status="complete"
              />,
            );
            if (output.success && output.audioUrl) {
              final.push(
                <ProAudioPlayer
                  key={key}
                  src={output.audioUrl}
                  fileName={'audio-' + (input?.voice || 'speech') + '.mp3'}
                />,
              );
            } else if (!output.success) {
              final.push(
                <ToolError
                  key={key}
                  title="Speech generation failed"
                  error="The system encountered an error while synthesizing your audio."
                />,
              );
            }
          }
          return;
        }

        if (toolName === 'generateFile') {
          const type = input?.type?.toUpperCase() || 'FILE';
          if (isLoading) {
            process.push(
              <ChainOfThoughtStep
                key={key}
                icon={FileTextIcon}
                label={`Generating ${type.toLowerCase()}...`}
                status="active"
              />,
            );
          } else if (hasOutput) {
            process.push(
              <ChainOfThoughtStep
                key={`${key}-done`}
                icon={FileTextIcon}
                label="Document created"
                status="complete"
              />,
            );
            if (output.success && output.url) {
              final.push(
                <ToolFileDownload
                  key={key}
                  url={output.url}
                  fileName={output.fileName}
                  type={input?.type || 'file'}
                />,
              );
            } else if (!output.success) {
              final.push(
                <ToolError
                  key={key}
                  title="File generation failed"
                  error="The system encountered an error while creating your document."
                />,
              );
            }
          }
          return;
        }
      }
    });

    return {
      processParts: process,
      finalParts: final,
      hasActiveSteps: hasActive,
    };
  }, [parts, isVersioned, version, messageId]);

  const [isChainOpen, setIsChainOpen] = React.useState(hasActiveSteps);

  React.useEffect(() => {
    setIsChainOpen(hasActiveSteps);
  }, [hasActiveSteps]);

  return (
    <MessageContent>
      {processParts.length > 0 && (
        <ChainOfThought
          className="mb-4"
          open={isChainOpen}
          onOpenChange={setIsChainOpen}
        >
          <ChainOfThoughtHeader />
          <ChainOfThoughtContent>{processParts}</ChainOfThoughtContent>
        </ChainOfThought>
      )}
      {finalParts}
    </MessageContent>
  );
}

'use client';

import React from 'react';
import {
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Source, SourceTrigger, SourceContent } from './source';
import { ToolImage } from './tool-image';
import { ToolSearchResults } from './tool-search';
import { ToolAudioPlayer } from './tool-audio';
import { ToolLoading, SearchLoading, ToolError } from './tool-status';
import { ToolFileDownload } from './tool-file';
import { ToolCard } from './tool-card';
import { ImageIcon, MusicIcon, FileTextIcon, GlobeIcon, SearchIcon } from 'lucide-react';

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
  return (
    <MessageContent>
      {parts
        .filter(
          (part: MessagePart) =>
            part.type !== 'file' && part.type !== 'attachment',
        )
        .map((part: MessagePart, i: number) => {
          const key = `${messageId}-${i}`;

          if (part.type === 'text') {
            const text = part.text ?? '';
            if (!text) return null;

            return (
              <div key={key} className="flex flex-col gap-1">
                <MessageResponse className="[&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1.5 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto">
                  {text}
                </MessageResponse>
                {isVersioned && version && (
                  <span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Version {version}
                  </span>
                )}
              </div>
            );
          }

          if (part.type === 'reasoning') {
            const reasoningText = part.reasoning ?? part.text ?? '';
            const isStreaming = Boolean(part.isStreaming);
            const duration = typeof part.duration === 'number' ? part.duration : undefined;
            if (!reasoningText) return null;

            return (
              <Reasoning key={key} className="w-full" isStreaming={isStreaming} duration={duration}>
                <ReasoningTrigger />
                <ReasoningContent>{reasoningText}</ReasoningContent>
              </Reasoning>
            );
          }

          if (part.type === 'sources') {
            const sources = part.sources ?? [];
            if (!sources.length) return null;

            return (
              <div
                key={key}
                className="mb-3 flex flex-wrap justify-start gap-2"
              >
                {sources.map((source: SourceItem) => {
                  const href = source.url ?? source.href;
                  if (!href) return null;
                  const title =
                    source.title ?? source.name ?? source.url ?? href;
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
              </div>
            );
          }

          if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
            const toolCall = part;

            // Web Search
            if (toolCall.type === 'tool-webSearch') {
              const input = toolCall.input;
              const output = toolCall.output;
              const isLoading =
                toolCall.state === 'input-streaming' ||
                toolCall.state === 'input-available';
              const hasOutput = toolCall.state === 'output-available' && output;

              if (isLoading) {
                const text = input?.query?.trim()
                  ? `Searching web for "${input.query}"..`
                  : 'Searching web..';
                return (
                  <ToolCard
                    key={key}
                    icon={SearchIcon}
                    title={text.endsWith('..') ? text.slice(0, -2) + '...' : text}
                    isLoading={true}
                    isSimpleLoading={true}
                  >
                    {null}
                  </ToolCard>
                );
              }

              if (hasOutput && output?.results?.length > 0) {
                return (
                  <ToolCard
                    key={key}
                    icon={GlobeIcon}
                    title="Search Results"
                    subtitle={input?.query}
                    badge="Verified Sources"
                  >
                    <ToolSearchResults results={output.results} />
                  </ToolCard>
                );
              }
              return null;
            }

            // Extract Web URL
            if (toolCall.type === 'tool-extractWebUrl') {
              const input = toolCall.input;
              const output = toolCall.output;
              const isLoading =
                toolCall.state === 'input-streaming' ||
                toolCall.state === 'input-available';
              const hasOutput = toolCall.state === 'output-available' && output;
              const urls = input?.urls ?? output?.urls ?? [];

              if (isLoading) {
                const text =
                  urls.length > 0
                    ? `Extracting content from ${urls.length} URL${urls.length > 1 ? 's' : ''}..`
                    : 'Extracting content..';
                return (
                  <ToolCard
                    key={key}
                    icon={GlobeIcon}
                    title={text.endsWith('..') ? text.slice(0, -2) + '...' : text}
                    isLoading={true}
                    isSimpleLoading={true}
                  >
                    {null}
                  </ToolCard>
                );
              }

              if (hasOutput && output?.results?.length > 0) {
                return (
                  <ToolCard
                    key={key}
                    icon={GlobeIcon}
                    title="Extracted Content"
                    badge={`${output.results.length} Sources`}
                  >
                    <ToolSearchResults results={output.results} />
                  </ToolCard>
                );
              }
              return null;
            }

            // Image to Image
            if (toolCall.type === 'tool-imageToImage') {
              const input = toolCall.input;
              const output = toolCall.output;
              const isLoading =
                toolCall.state === 'input-streaming' ||
                toolCall.state === 'input-available';
              const hasOutput = toolCall.state === 'output-available' && output;

              if (isLoading) {
                return (
                  <ToolCard
                    key={key}
                    icon={ImageIcon}
                    title="Generating image from your image..."
                    isLoading={true}
                    isSimpleLoading={true}
                  >
                    {null}
                  </ToolCard>
                );
              }

              if (hasOutput && output.success && output.image) {
                return (
                  <ToolImage
                    key={key}
                    imageSrc={output.image}
                    prompt={input?.prompt}
                    options={{
                      model: input?.model || 'ImageToImage',
                    }}
                  />
                );
              }

              if (hasOutput && !output.success) {
                return (
                  <ToolError
                    key={key}
                    title="Image generation failed"
                    error="The system encountered an error while processing your image."
                  />
                );
              }
            }

            // Generate Image
            if (toolCall.type === 'tool-generateImage') {
              const input = toolCall.input;
              const output = toolCall.output;
              const isLoading =
                toolCall.state === 'input-streaming' ||
                toolCall.state === 'input-available';
              const hasOutput = toolCall.state === 'output-available' && output;

              if (isLoading) {
                return (
                  <ToolCard
                    key={key}
                    icon={ImageIcon}
                    title="Generating image..."
                    isLoading={true}
                    isSimpleLoading={true}
                  >
                    {null}
                  </ToolCard>
                );
              }

              if (hasOutput && output.success && output.image) {
                return (
                  <ToolImage
                    key={key}
                    imageSrc={output.image}
                    prompt={input?.prompt}
                    options={{
                      model: input?.model || 'FLUX.2',
                      width: input?.width,
                      height: input?.height,
                    }}
                  />
                );
              }

              if (hasOutput && !output.success) {
                return (
                  <ToolError
                    key={key}
                    title="Image generation failed"
                    error="The system encountered an error while generating your visual."
                  />
                );
              }
            }

            // Text to Speech
            if (toolCall.type === 'tool-textToSpeech') {
              const input = toolCall.input;
              const output = toolCall.output;
              const isLoading =
                toolCall.state === 'input-streaming' ||
                toolCall.state === 'input-available';
              const hasOutput = toolCall.state === 'output-available' && output;

              if (isLoading) {
                return (
                  <ToolCard
                    key={key}
                    icon={MusicIcon}
                    title="Generating speech..."
                    isLoading={true}
                    isSimpleLoading={true}
                  >
                    {null}
                  </ToolCard>
                );
              }

              if (hasOutput && output.success && output.audioUrl) {
                return (
                  <ToolAudioPlayer
                    key={key}
                    audioUrl={output.audioUrl}
                    text={input?.text}
                    voice={input?.voice}
                  />
                );
              }

              if (hasOutput && !output.success) {
                return (
                  <ToolError
                    key={key}
                    title="Speech generation failed"
                    error="The system encountered an error while synthesizing your audio."
                  />
                );
              }
            }

            // Generate File
            if (toolCall.type === 'tool-generateFile') {
              const input = toolCall.input;
              const output = toolCall.output;
              const isLoading =
                toolCall.state === 'input-streaming' ||
                toolCall.state === 'input-available';
              const hasOutput = toolCall.state === 'output-available' && output;

              if (isLoading) {
                const type = input?.type?.toUpperCase() || 'FILE';
                return (
                  <ToolCard
                    key={key}
                    icon={FileTextIcon}
                    title={`Generating ${type.toLowerCase()}...`}
                    isLoading={true}
                    isSimpleLoading={true}
                  >
                    {null}
                  </ToolCard>
                );
              }

              if (hasOutput && output.success && output.url) {
                return (
                  <ToolFileDownload
                    key={key}
                    url={output.url}
                    fileName={output.fileName}
                    type={input?.type || 'file'}
                  />
                );
              }

              if (hasOutput && !output.success) {
                return (
                  <ToolError
                    key={key}
                    title="File generation failed"
                    error="The system encountered an error while creating your document."
                  />
                );
              }
            }
          }

          return null;
        })}
    </MessageContent>
  );
}

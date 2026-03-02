'use client';

import { Source, SourceTrigger, SourceContent } from './source';

interface SearchResult {
  title?: string;
  url?: string;
  content?: string;
  favicon?: string | null;
}

interface ToolSearchProps {
  results: SearchResult[];
}

export function ToolSearchResults({ results }: ToolSearchProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {results.map((item, index) => {
        if (!item.url) return null;

        return (
          <Source href={item.url} key={item.url ?? index}>
            <SourceTrigger showFavicon />
            <SourceContent
              title={item.title || item.url}
              description={item.content}
            />
          </Source>
        );
      })}
    </div>
  );
}

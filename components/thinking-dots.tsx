'use client';

import { useState, useEffect } from 'react';
import { Shimmer } from '@/components/ai-elements/shimmer';

export function ThinkingDots() {
  const [dots, setDots] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 6 ? 3 : prev + 1));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-1 text-xs font-medium">
      <Shimmer className="text-muted-foreground">
        {`Thinking${'.'.repeat(dots)}`}
      </Shimmer>
    </div>
  );
}

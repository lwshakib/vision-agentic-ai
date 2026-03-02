/**
 * ThinkingDots Component
 * Displays a simple, animated "Thinking..." text indicator.
 * Used during AI response generation to signal background activity.
 */

'use client';

import { useState, useEffect } from 'react';
// Import Shimmer component for a subtle pulsing text effect.
import { Shimmer } from '@/components/ai-elements/shimmer';

/**
 * Renders an animated ellipsis progress indicator.
 */
export function ThinkingDots() {
  // State to track the number of dots to display (cycles from 3 to 6).
  const [dots, setDots] = useState(3);

  /**
   * Effect to increment the dot count every 500ms.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // Loop the count: 3 -> 4 -> 5 -> 6 -> 3...
      setDots((prev) => (prev >= 6 ? 3 : prev + 1));
    }, 500);

    // Standard interval cleanup on component unmount.
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-1 text-xs font-medium">
      {/* Container for the text with shimmer animation. */}
      <Shimmer className="text-muted-foreground">
        {/* Dynamically build the 'Thinking...' string based on current state. */}
        {`Thinking${'.'.repeat(dots)}`}
      </Shimmer>
    </div>
  );
}

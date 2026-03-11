import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // undefined initial state for SSR compatibility
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    // Media query listener for standard tablet/mobile breakpoint (768px)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Handler to update state on window resize
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Register the listener
    mql.addEventListener('change', onChange);

    // Initial check on mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Cleanup listener on unmount to prevent memory leaks
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}

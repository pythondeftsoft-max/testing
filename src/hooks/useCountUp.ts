import { useEffect, useRef, useState } from 'react';

/**
 * Hook for animated count-up effect on numbers.
 * Creates a premium "Billion Dollar SaaS" feel for metrics.
 * 
 * @param target - The final number to count to
 * @param duration - Animation duration in milliseconds (default: 2000)
 * @param enabled - Whether the animation should run (default: true)
 * @returns The current animated value
 */
export function useCountUp(target: number, duration = 2000, enabled = true) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // Don't animate if disabled or already animated
    if (!enabled || hasAnimatedRef.current) {
      setValue(target);
      return;
    }

    // Reset for new targets
    if (target !== value && !hasAnimatedRef.current) {
      startRef.current = null;
    }

    let raf = 0;
    
    const step = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }
      
      const progress = Math.min(1, (timestamp - startRef.current) / duration);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setValue(Math.floor(eased * target));
      
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        hasAnimatedRef.current = true;
        setValue(target); // Ensure we end on exact target
      }
    };
    
    raf = requestAnimationFrame(step);
    
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return value;
}

/**
 * Formats a count-up value for display with optional prefix/suffix.
 */
export function formatCountUpValue(
  value: number,
  options?: {
    prefix?: string;
    suffix?: string;
    decimals?: number;
    compact?: boolean;
  }
): string {
  const { prefix = '', suffix = '', decimals = 0, compact = false } = options || {};
  
  let formatted: string;
  
  if (compact && value >= 1000000) {
    formatted = (value / 1000000).toFixed(1) + 'M';
  } else if (compact && value >= 1000) {
    formatted = (value / 1000).toFixed(1) + 'K';
  } else if (decimals > 0) {
    formatted = value.toFixed(decimals);
  } else {
    formatted = value.toLocaleString();
  }
  
  return `${prefix}${formatted}${suffix}`;
}

export default useCountUp;

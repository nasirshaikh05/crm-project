import { useEffect, useRef, useState } from "react";

/**
 * Animates a numeric value up from 0 (or from its previous value) to `target`
 * over `durationMs`. Returns the live number to render — format it yourself
 * (commas, %, etc.) at the call site.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

/** Parses "12,869,323" / "26%" / "$4.1M" into a numeric part + prefix/suffix, so
 * the animated number can be reformatted back into its original shape. */
export function parseDisplayValue(display: string) {
  const match = display.match(/^([^\d.-]*)([\d,.]+)(.*)$/);
  if (!match) return { prefix: "", numeric: 0, suffix: "", decimals: 0 };
  const [, prefix, numericStr, suffix] = match;
  const cleaned = numericStr.replace(/,/g, "");
  const decimals = cleaned.includes(".") ? cleaned.split(".")[1].length : 0;
  return { prefix, numeric: parseFloat(cleaned), suffix, decimals };
}

export function formatCountUp(display: string, current: number) {
  const { prefix, suffix, decimals } = parseDisplayValue(display);
  const formatted = current.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${formatted}${suffix}`;
}

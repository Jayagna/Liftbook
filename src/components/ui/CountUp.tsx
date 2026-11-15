import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Number that counts from its previous value to the new one. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString(), duration = 900, ...rest }: TextProps & {
  value: number; format?: (n: number) => string; duration?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); from.current = value; return; }
    const start = from.current, t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / duration);
      const v = start + (value - start) * (1 - Math.pow(1 - k, 3));
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);
  return <Text {...rest}>{format(shown)}</Text>;
}

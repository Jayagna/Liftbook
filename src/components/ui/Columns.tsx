// Lays children out in N equal columns, filling left to right so the order still reads naturally.
// With one column it renders the children as they are, so phone layouts are unchanged.
import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { space } from '@/theme/tokens';

export function Columns({ cols, gap = space.md, children }: { cols: number; gap?: number; children: ReactNode }) {
  const items = Children.toArray(children);
  if (cols <= 1) return <>{items}</>;
  const buckets: ReactNode[][] = Array.from({ length: cols }, () => []);
  items.forEach((c, i) => buckets[i % cols].push(c));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
      {buckets.map((b, i) => <View key={i} style={{ flex: 1, minWidth: 0, gap }}>{b}</View>)}
    </View>
  );
}

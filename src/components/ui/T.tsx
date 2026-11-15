import { Text, type TextProps } from 'react-native';
import { type as typo } from '@/theme/tokens';

type Variant = keyof typeof typo;
export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[typo[v], style]} />;
}

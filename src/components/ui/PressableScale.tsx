import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '@/hooks/haptics';

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that springs down slightly on touch and gives a light haptic. */
export function PressableScale({
  style, onPress, scaleTo = 0.96, haptics = true, children, ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptics?: boolean }) {
  const s = useSharedValue(1);
  const reduce = useReducedMotion();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      onPressIn={(e) => { if (!reduce) s.value = withSpring(scaleTo, { damping: 18, stiffness: 420 }); rest.onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, { damping: 14, stiffness: 300 }); rest.onPressOut?.(e); }}
      onPress={(e) => { if (haptics) haptic.tap(); onPress?.(e); }}
      style={[style, a]}
    >
      {children}
    </APressable>
  );
}

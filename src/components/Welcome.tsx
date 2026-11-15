import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { actions } from '@/store/store';
import { color, font, radius, space } from '@/theme/tokens';
import { PressableScale } from './ui/PressableScale';
import { Ring } from './ui/Ring';
import { T } from './ui/T';

/** Shown until a profile exists; leads into onboarding. */
export function Welcome() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  // Shorter screens (a browser with its toolbars showing) get a tighter layout so every button clears the tab bar.
  const compact = useWindowDimensions().height < 760;
  const k = compact ? 0.72 : 1;
  const enter = (i: number) => (reduce ? undefined : FadeInDown.delay(120 * i).springify().damping(16));
  return (
    <View style={[styles.root, { paddingTop: insets.top + (compact ? 16 : 40), paddingBottom: insets.bottom + (compact ? 96 : 120) }]}>
      <LinearGradient colors={['rgba(200,255,80,0.16)', 'rgba(13,16,16,0)']} style={styles.glow} pointerEvents="none" />
      <Animated.View entering={enter(0)} style={compact ? styles.ringsCompact : styles.rings}>
        <Ring size={200 * k} stroke={14 * k} progress={0.78} tint={color.lime} tint2="#E9FFB0">
          <Ring size={156 * k} stroke={12 * k} progress={0.62} tint={color.water}>
            <Ring size={116 * k} stroke={10 * k} progress={0.85} tint={color.carbs} />
          </Ring>
        </Ring>
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <T v="label" style={{ color: color.lime, textAlign: 'center' }}>Liftbook</T>
        <T style={[styles.hero, compact && { fontSize: 38, lineHeight: 38 }]}>Train with intent.{'\n'}Eat with purpose.</T>
        <T v="small" style={styles.sub}>Your plan, your macros, your progress. Built around you, not a template.</T>
      </Animated.View>
      <Animated.View entering={enter(2)} style={{ gap: compact ? space.sm : space.md, alignSelf: 'stretch' }}>
        <PressableScale style={styles.cta} onPress={() => router.push('/onboarding')}>
          <T style={styles.ctaText}>Get started</T>
        </PressableScale>
        <PressableScale style={styles.ghost} onPress={() => actions.enterSample()}>
          <T v="bodyMed">Preview with sample data</T>
        </PressableScale>
        <PressableScale style={styles.link} onPress={() => router.push('/profile')} accessibilityLabel="I have a backup file">
          <T v="small" style={{ color: color.text }}>I have a backup file</T>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  rings: { marginTop: space.xl, marginBottom: space.xl },
  ringsCompact: { marginTop: space.sm, marginBottom: space.md },
  hero: { fontFamily: font.display, fontSize: 46, lineHeight: 46, color: color.text, textAlign: 'center', marginTop: space.sm, textTransform: 'uppercase' },
  sub: { textAlign: 'center', marginTop: space.md, maxWidth: 320, alignSelf: 'center' },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: color.lime, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase', color: color.limeInk },
  link: { height: 36, alignItems: 'center', justifyContent: 'center' },
  ghost: { height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineStrong },
});

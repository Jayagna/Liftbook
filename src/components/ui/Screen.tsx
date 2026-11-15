import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/store';
import { useLayout } from '@/theme/layout';
import { color, radius, space } from '@/theme/tokens';
import { Aurora } from './Aurora';
import { T } from './T';

export const TAB_BAR_SPACE = 110;

/** Scrollable tab screen with a large display title. Content is centred and capped in width on big screens. */
export function Screen({ title, eyebrow, right, children }: { title: string; eyebrow?: string; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const L = useLayout();
  return (
    <View style={styles.root}>
      <Aurora />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (L.wide ? space.xxl : space.md),
          paddingBottom: L.wide ? 56 : insets.bottom + TAB_BAR_SPACE,
          paddingLeft: L.rail + L.gutter, paddingRight: L.gutter, alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: L.contentMax, gap: space.md }}>
          <View style={[styles.header, L.wide && { marginBottom: space.md }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {eyebrow ? <T v="label" style={{ color: color.lime }}>{eyebrow}</T> : null}
              <T v="title" style={[styles.title, L.tiny && styles.titleTiny, L.wide && styles.titleWide]}>{title}</T>
            </View>
            {right}
          </View>
          <StorageBanner />
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

/** Shown on every tab while a change could not be written to the device, so lost saves are never silent. */
function StorageBanner() {
  const failed = useApp((s) => s.storageError);
  if (!failed) return null;
  return (
    <View style={styles.storage} accessibilityRole="alert">
      <T v="label" style={{ color: color.danger }}>Not saved</T>
      <T v="small" style={{ color: color.text }}>Your last change could not be saved on this phone. Its storage for this app may be full. Go to Profile and save a backup file now so nothing is lost.</T>
    </View>
  );
}

const styles = StyleSheet.create({
  storage: { gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(255,107,94,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,107,94,0.5)' },
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginBottom: space.xs },
  title: { fontSize: 38, lineHeight: 40, marginTop: 2 },
  titleTiny: { fontSize: 32, lineHeight: 34 },
  titleWide: { fontSize: 52, lineHeight: 54, letterSpacing: 0 },
});

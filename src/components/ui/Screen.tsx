import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/store/store';
import { color, radius, space } from '@/theme/tokens';
import { Aurora } from './Aurora';
import { T } from './T';

export const TAB_BAR_SPACE = 110;

/** Scrollable tab screen with a large display title. */
export function Screen({ title, eyebrow, right, children }: { title: string; eyebrow?: string; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Aurora />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + TAB_BAR_SPACE, paddingHorizontal: space.lg, gap: space.md }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <T v="label" style={{ color: color.lime }}>{eyebrow}</T> : null}
            <T v="title" style={styles.title}>{title}</T>
          </View>
          {right}
        </View>
        <StorageBanner />
        {children}
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
});

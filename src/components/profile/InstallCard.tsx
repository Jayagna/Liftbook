// Web build only: explains how to add the app to the home screen, and why to do that before logging anything.
// Hidden once the app is running from the home screen, and never shown in the native app.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, View } from 'react-native';
import { Card, CardHeader } from '@/components/ui/Card';
import { T } from '@/components/ui/T';
import { color, space } from '@/theme/tokens';

function installed(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function InstallCard({ index = 0 }: { index?: number }) {
  if (installed()) return null;
  return (
    <Card index={index}>
      <CardHeader title="Add to your home screen" icon={<Ionicons name="phone-portrait-outline" size={14} color={color.lime} />} />
      <View style={{ gap: space.sm }}>
        <T v="small">You are using Liftbook in a browser tab. Added to the home screen it opens full screen, gets its own icon and works without signal.</T>
        <T v="small" style={{ color: color.text }}>iPhone: open this page in Safari, tap Share, then Add to Home Screen.</T>
        <T v="small" style={{ color: color.text }}>Android: open the browser menu, then Install app or Add to Home screen.</T>
        <T v="small">The home screen app keeps its own data, separate from this tab. Add it first, then set up or restore your backup inside it.</T>
      </View>
    </Card>
  );
}

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const ok = Platform.OS === 'ios' || Platform.OS === 'android';
export const haptic = {
  tap: () => { if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  select: () => { if (ok) Haptics.selectionAsync().catch(() => {}); },
  success: () => { if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
};

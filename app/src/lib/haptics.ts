import * as Haptics from 'expo-haptics';
import { prefs } from './prefs';

export function selection() {
  if (prefs.haptics) Haptics.selectionAsync();
}

export function notify(type: 'success' | 'error') {
  if (!prefs.haptics) return;
  Haptics.notificationAsync(
    type === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
  );
}

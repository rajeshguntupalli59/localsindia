import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsApi } from './api';

export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // Must run before requesting a token — Android 13+ requires the channel to exist first.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationsApi.registerDevice(token);
  } catch {
    // Push registration is best-effort — never block login/app-start on it.
  }
}

export async function unregisterCurrentDevicePushToken(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationsApi.unregisterDevice(token);
  } catch {
    // Best-effort on logout too.
  }
}

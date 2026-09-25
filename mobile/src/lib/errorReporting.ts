import axios from 'axios';
import appJson from '../../app.json';

// EXPO_PUBLIC_API_URL only for local testing; release builds use production.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net/api/v1';

export function reportError(error: unknown, context?: string) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  axios.post(`${API_BASE}/errors/report`, {
    platform: 'mobile',
    message,
    stack,
    context,
    app_version: appJson.expo.version,
  }).catch(() => {});
}

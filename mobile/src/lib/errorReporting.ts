import axios from 'axios';
import appJson from '../../app.json';

const API_BASE = 'https://localsindia-backend.azurewebsites.net/api/v1';

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

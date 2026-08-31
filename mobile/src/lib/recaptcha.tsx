import { forwardRef, useImperativeHandle, useRef, type ElementRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// Google reCAPTCHA v3, run inside an invisible WebView — React Native has no
// DOM to load the widget's JS directly (unlike frontend/src/lib/recaptcha.ts).
// Uses the exact same site key/secret already configured for the web
// frontend; no separate Google Cloud Console setup needed. `baseUrl` makes
// the inline HTML present as if loaded from localsindia.com, matching the
// site key's registered domain — reCAPTCHA validates the token against that.
const SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '';
const TOKEN_TIMEOUT_MS = 8000; // never let a slow/broken widget hang the OTP flow

const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://www.google.com/recaptcha/api.js?render=${SITE_KEY}"></script>
</head><body>
<script>
function execute(action) {
  grecaptcha.ready(function() {
    grecaptcha.execute('${SITE_KEY}', { action: action }).then(function(token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ token: token }));
    }).catch(function(err) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ error: String(err) }));
    });
  });
}
</script>
</body></html>`;

export type RecaptchaHandle = {
  getToken: (action: string) => Promise<string | undefined>;
};

type PendingResolver = (token: string | undefined) => void;

const RecaptchaWebView = forwardRef<RecaptchaHandle>((_props, ref) => {
  const webviewRef = useRef<ElementRef<typeof WebView>>(null);
  const pending = useRef<PendingResolver | null>(null);

  useImperativeHandle(ref, () => ({
    getToken: (action: string) =>
      new Promise<string | undefined>(resolve => {
        if (!SITE_KEY || !webviewRef.current) {
          resolve(undefined);
          return;
        }
        pending.current = resolve;
        webviewRef.current.injectJavaScript(`execute(${JSON.stringify(action)}); true;`);
        setTimeout(() => {
          if (pending.current === resolve) {
            pending.current = null;
            resolve(undefined);
          }
        }, TOKEN_TIMEOUT_MS);
      }),
  }));

  if (!SITE_KEY) return null;

  return (
    <WebView
      ref={webviewRef}
      source={{ html, baseUrl: 'https://www.localsindia.com' }}
      style={{ width: 0, height: 0 }}
      javaScriptEnabled
      originWhitelist={['*']}
      onMessage={(event: WebViewMessageEvent) => {
        const resolve = pending.current;
        if (!resolve) return;
        pending.current = null;
        try {
          const data = JSON.parse(event.nativeEvent.data);
          resolve(data.token);
        } catch {
          resolve(undefined);
        }
      }}
    />
  );
});

export default RecaptchaWebView;

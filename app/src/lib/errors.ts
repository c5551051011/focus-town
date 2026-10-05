import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../config';
import { prefs } from './prefs';

// 크래시 리포트: DSN이 없거나 개발 모드, 또는 사용자가 공유를 끈 경우에는 보내지 않는다.
export function initErrorReporting(): void {
  if (!SENTRY_DSN) return;
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      enabled: !__DEV__,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: (event) => (prefs.analytics ? event : null),
    });
  } catch {}
}

export function reportError(error: unknown): void {
  if (!SENTRY_DSN || !prefs.analytics) return;
  try {
    Sentry.captureException(error);
  } catch {}
}

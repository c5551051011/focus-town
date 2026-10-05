// 외부 서비스 설정. 키가 비어 있으면 해당 기능은 조용히 꺼진다.
// 빌드 시 값은 eas.json의 env 또는 EAS secrets(EXPO_PUBLIC_*)로 주입한다.

export const SUPPORT_EMAIL = ''; // 문의/피드백 메일 주소 (비어 있으면 피드백 버튼이 숨겨진다)

// GitHub Pages(docs/ 폴더)에 게시되는 문서 주소
const SITE = 'https://c5551051011.github.io/focus-town';
export const PRIVACY_URL = `${SITE}/privacy.html`;
export const TERMS_URL = `${SITE}/terms.html`;

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

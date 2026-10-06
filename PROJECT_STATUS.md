# Focus Town (포커스 타운) 프로젝트 현황

> 갱신: 2026-10-06 · 저장소: https://github.com/c5551051011/focus-town (브랜치 `main`)
> 이 문서는 "지금까지 무엇이 만들어졌고, 어떻게 돌리고, 무엇이 남았는지"를 한 곳에 정리한 것입니다.
> 기획 원문은 `focus_town_final.md`(한국어 기획서), 서버 설정은 `backend/README.md`, 기기 테스트 항목은 `TESTING_TODO.md` 에 있습니다.

---

## 1. 한 줄 소개
집중하는 동안 귀여운 **픽셀 건물**이 지어지고, 끝나면 나만의 **마을**에 쌓이는 모바일(iOS/Android) 집중 타이머 게임. 친구와 함께 집중하면 **한 건물을 같이 짓고**, 누군가 앱을 벗어나면 건물이 상합니다.

- 화면 언어: 영어, 폰트: Press Start 2P (모든 글씨가 픽셀 폰트)
- 톤: 단순하고 친숙한 UI, 둥근 "소프트 카드" 스타일 + 픽셀 아트

---

## 2. 기능 현황 한눈에

| 영역 | 상태 | 비고 |
|---|---|---|
| 온보딩(6장) · 캐릭터 만들기 | 완료 | 알림 동의(ALLOW), 앱 차단 관심(I'M IN), SKIP = 동의 없이 다음 장 |
| FOCUS(시작 화면) | 완료 | 건물 미리보기, 시간 휠(5~120분), 모드 알약, 사운드, 친구 선택, START |
| 솔로 집중 | 완료 | 15초 이탈 유예, 하루 1회 통화 패스, 강제 종료 후 복구 |
| 친구(팔로우) | 완료 | 이름 검색, 친구 코드/링크, 서로 팔로우 = 친구 |
| 그룹 집중 | 완료 · 에뮬레이터 2대로 검증 | 팀 내구성, 탈락, 늦은 참여 승인, 결과 |
| 팀원 넛지(알림 보내기) | 코드 완료 · **서버/FCM 설정 필요** | 아래 6장 |
| TOWN(마을) | 완료 | 8×8 아이소메트릭 땅, 기간 필터, 건물 수 요약 |
| STATS | 완료 | 스트릭, 요약, 7일×24시간 타임라인, 달력 |
| ME · 설정 | 완료 | 프로필, 팔로잉/팔로워, 친구, 설정, 계정 삭제 |
| 배경 사운드 | 완료 | 21종(모드별 추천), 합성 싱잉볼 포함 |
| 화면 밖 진행 표시 | iOS 라이브 액티비티 · Android 알림 카드 | Android 확인 완료, **iOS 실기기 확인 대기** |
| 분석/오류 수집 | 준비됨(키 없음) | PostHog + Sentry, 사용자가 끌 수 있음 |
| 앱 차단(Screen Time) | 미구현 | 온보딩에서 "Coming soon" + 관심 수집만 |

---

## 3. 화면별 설명

### 3.1 온보딩 → 캐릭터
- 6장: BUILD YOUR TOWN → CHOOSE YOUR TIME → STAY IN THE APP → GENTLE NUDGES(알림) → BLOCK DISTRACTIONS(앱 차단) → GROW EVERY DAY
- 동의 장(알림, 앱 차단)에서는 큰 버튼이 **동의**(ALLOW / I'M IN), **SKIP** 은 동의 없이 다음 장으로 갑니다. 마지막 장에 약관/개인정보 안내.
- 캐릭터: 동물 4종 × 색 9종 × 모자 5종 + 이름. 이메일 로그인(코드)으로 기존 계정 복원 가능.

### 3.2 FOCUS
- 위: 제목 + 오늘 목표 진행 알약, 가운데: 건물 + 이름 + 시간(탭하면 휠), 아래: 모드 알약, **Sound / Friends** 칩(높이 고정), **START**
- 친구를 고르면 그룹(최대 3명 초대), 고르지 않으면 혼자. 버튼 문구는 항상 START / Done.
- START → 5초 카운트다운(CANCEL 가능) → 집중.

### 3.3 집중 화면
- 건물이 8개 층으로 쌓이고 캐릭터가 망치질. 큰 타이머, 전체 진행률 바, 상태 문구(중간), 꾹 눌러 정지(1.5초).
- 그룹: 진행률 바 **바로 아래에 같은 폭의 TEAM BUILDING 바**, 이탈 팀원이 있으면 "OO is away! Tap the screen to nudge."
- 이탈 경고: 화면 전체가 붉게 깜빡임(돌아온 직후, iOS 제어 센터/앱 전환, 팀원 화면). 앱이 완전히 백그라운드면 화면이 안 보이므로 **알림 + 15초 카운트다운 카드**가 담당합니다.

### 3.4 결과 화면
- 성공 "TA-DA!" / 그룹 "TEAMWORK!", 실패 "OOPS!" / "OH NO!" / "WHOOPS!", 나감 "BYE BYE!"
- 같은 틀: 위(둥근 받침 위 건물 + 제목), 아래(큰 글씨 메시지, 팀 바, 멤버 카드, 둥근 버튼). 나감/탈락은 왼쪽 위 **X** 로 닫기.
- 그룹 성공: **참여 인원만큼 건물이 한 덩어리로** 보이고, 내구성이 낮을수록 기울고 눌리며 40% 미만이면 한 채가 폐허가 됩니다.

### 3.5 그 밖
- TOWN, STATS(타임라인·달력), ME(프로필·팔로우 목록·친구·집중 기록), 설정(목표, 알림, 사운드, 개인정보, 계정), 확인 창은 앱 스타일 시트(`ConfirmSheet`).

---

## 4. 게임 규칙

**건물(집중 시간 기준)**: 오두막 0분 · 집 20분 · 타워 45분 · 도서관 70분 · 성 100분
**모드**: STUDY, READING, WORK, EXERCISE, REST, SLEEP + 직접 추가한 태그

**솔로**
- 앱을 벗어나 **15초 넘기면 붕괴**. 15초 안에 돌아오면 정상.
- 하루 1회 "통화 패스": 벗어나 있던 시간만큼 타이머를 멈춘 것으로 처리.
- 앱을 강제 종료해도 진행 중 세션을 복구.

**그룹**
- 초대는 **서로 팔로우하는 친구**끼리만. 방장이 시작하면 즉시 진행(READY 대기 없음), 최대 4명.
- 이탈 15초 유예 후 초과 시간만큼 팀 내구성이 **초당 약 1.67%** 감소, 한 명의 초과 이탈이 **45초면 탈락**.
- 결과 건물: 내구성 70%↑ 원래 건물 / 40~69% 한 단계 작게 / 40%↓ 오두막 / 0% 붕괴.
- 늦은 참여: 시작 후 **3분 안 자유 참여**, 이후엔 현재 참여자 **전원 허용** 필요.
- 넛지: 이탈 중(10초 넘게 신호 없음)인 팀원에게 푸시, 같은 사람에게 20초에 한 번.

---

## 5. 기술 구성

| 구분 | 내용 |
|---|---|
| 앱 | Expo SDK 57, React Native 0.86, TypeScript (`app/`) |
| 서버 | Supabase: 익명(게스트) + 이메일 코드 로그인, Postgres, **모든 접근은 RPC 함수 + RLS** (`backend/`) |
| 빌드 | EAS Build (`app/eas.json` 의 `preview`=내부 배포, `production`), 로컬 Android 릴리스 빌드 |
| 네이티브 | `expo-live-activity`(iOS 라이브 액티비티), 자체 Kotlin 모듈 `modules/focus-ongoing`(Android 진행 카드), expo-notifications, expo-audio |
| 분석 | PostHog(fetch), Sentry(JS, 소스맵 업로드 끔) — 키가 비어 있으면 동작하지 않음 |
| 문서 사이트 | `docs/` (GitHub Pages: 개인정보, 약관, 팔로우 링크 페이지) |
| 스토어 자료 | `store/listing.md`, `store/graphics/` |

**주요 폴더**
```
app/App.tsx                 앱 루트(탭, 오버레이, 그룹 흐름, 계정)
app/src/screens/            Setup, Timer, GroupFlow, Town, Stats, Profile, Settings, Onboarding ...
app/src/components/         SessionLayout, ResultLayout, TeamBuilding, ConfirmSheet, InviteBanner ...
app/src/lib/                useFocusSession, useGroupSession, rooms, social, liveProgress, notifications, push ...
app/modules/focus-ongoing/  Android 진행 카드(Kotlin)
backend/supabase/migrations 0001~0004 SQL
backend/tests/              로컬 PostgreSQL 시나리오 테스트
docs/  store/               공개 문서, 스토어 자료
```

**디자인 시스템**: `theme.ts`(`colors`, `soft`), `ui.tsx`(`Txt` 픽셀 글씨, `Sans` 카드 화면용 크기 매핑, 알약, 시트), `cards.tsx`(`ScreenTitle` 등 탭 제목 위치 통일).

---

## 6. 서버 (Supabase)

프로젝트 URL/공개(publishable) 키는 `app/src/config.ts` 에 있습니다(공개용 키). **secret / service_role 키는 앱이나 git 에 절대 넣지 않습니다.**

| 파일 | 내용 |
|---|---|
| `0001_profiles.sql` | 프로필(캐릭터), 계정 삭제 |
| `0002_rooms.sql` | 그룹 방, 멤버, 투표, 초대, 내구성 계산, 하트비트, 종료 |
| `0003_social.sql` | 친구 코드, 팔로우, 검색, 친구 초대로 시작, 초대 수락/거절 |
| `0004_nudge.sql` | 푸시 토큰 보관(RPC로만 접근), `nudge_away` (20초 제한) |

**해야 할 일 (대시보드에서 직접)**
1. SQL Editor 에서 **`0004_nudge.sql` 실행** (0001~0003 은 이미 적용됨)
2. Authentication → Sign In / Providers → **Allow anonymous sign-ins** 켜기 (게스트 계정, 켜 둔 상태로 테스트했음)
3. (선택) 이메일 로그인용 템플릿에 `{{ .Token }}`, SMTP 설정
4. 넛지 푸시를 실제로 받으려면 Android 는 **Firebase(FCM) 설정** — https://docs.expo.dev/push-notifications/fcm-credentials/ , iOS 는 EAS 가 APNs 키 관리

로컬 시험: `backend/tests/README.md` (PostgreSQL 14+ 에서 마이그레이션 → 시나리오 SQL 실행, `nudge_scenarios.sql` 통과 확인함).

---

## 7. 빌드와 배포

### 7.1 Android (로컬 릴리스 APK)
```bash
cd app/android
export ANDROID_HOME=$HOME/Library/Android/sdk SENTRY_DISABLE_AUTO_UPLOAD=true
./gradlew assembleRelease
# 결과: app/android/app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

### 7.2 iOS (EAS, 내부 배포 = 등록된 아이폰에만 설치)
```bash
cd app
npx eas-cli build -p ios --profile preview
```
- 번들 ID `com.jjinchoi.focustown` (+ 라이브 액티비티 `com.jjinchoi.focustown.LiveActivity`), Apple 팀 `3FFQ9Z7QHZ`(개인), 등록 기기: 사용자의 iPhone
- 인증서/프로비저닝은 EAS 서버에 저장되어 있어 `--non-interactive` 로도 빌드됩니다. Apple 로그인(비밀번호/2단계 인증)이 필요한 경우는 **직접 터미널에서** 입력해야 합니다.
- 설치: 빌드 페이지(링크는 8장) → 아이폰 Safari 에서 열기 → 설치. 처음엔 설정 → 개인정보 보호 및 보안 → **개발자 모드** 켜기, 설정 → 일반 → VPN 및 기기 관리에서 프로필 **신뢰**.
- 라이브 액티비티는 설정 → Focus Town → 실시간 현황(Live Activities) 이 켜져 있어야 합니다.

### 7.3 TestFlight / App Store (아직 하지 않음)
- 필요한 것: ① App Store Connect 에 앱 레코드 생성(번들 ID 동일), ② `production` 프로필로 빌드(`npx eas-cli build -p ios --profile production`), ③ `npx eas-cli submit -p ios`
- 출시 전: 개인정보/약관 문서의 개발자 이름·문의 메일 채우기, GitHub Pages 켜기(main /docs), 스토어 스크린샷(`store/listing.md` 참고)

---

## 8. 최근 빌드 기록

| 대상 | 내용 |
|---|---|
| iOS 1차 | EAS 빌드 `e5cdb77e-…` 성공 (커밋 `60b72b3`, 2026-10-06) |
| iOS 2차 | EAS 빌드 `8ca8d46f-56cc-4d7f-b349-54c3e25383f7` **성공** (커밋 `07f0ca0`, 2026-10-06 22:07) — 빌드 페이지 https://expo.dev/accounts/c5551051011/projects/focus-town/builds/8ca8d46f-56cc-4d7f-b349-54c3e25383f7 (아이폰 Safari 에서 열어 설치) |
| Android | 로컬 릴리스 APK (에뮬레이터 설치로 검증) |

---

## 9. 테스트 현황

**확인함 (Android 에뮬레이터 2~3대)**
- 친구 코드 검색 → 팔로우 → 맞팔로우, 새 팔로워 자동 갱신(10초)
- 초대 배너 → 합류, 두 기기 타이머 동기화
- 한 명 이탈 시 내구성 감소(35초 이탈 → 67%), 45초 초과 시 탈락, 3분 뒤 늦은 참여 승인
- 결과 화면(성공/실패/탈락), 합쳐진 건물 미리보기(여러 내구성)
- 알림 권한이 있을 때 이탈 3초 뒤 알림 + 15초 카운트다운 카드
- 온보딩 6장, Unfollow 확인 창, 칩 높이 고정
- 서버 규칙: 로컬 PostgreSQL 시나리오 전부 통과

**아직 확인 못함**
- **iPhone 실기기**: 이번 빌드 설치, 라이브 액티비티(잠금 화면/Dynamic Island), 폰트·줄 간격이 Android 와 같은지
- 넛지 푸시가 실제로 도착하는지(0004 적용 + FCM)
- 나감/탈락 화면의 X 버튼, 그룹 결과의 새 팀 바(코드 반영, 화면 미확인)
- 알림 권한을 거부한 기기에서 START 시 뜨는 안내 창
- 이메일 코드 로그인 템플릿

---

## 10. 남은 할 일

**바로 (몇 분)**
- [ ] `0004_nudge.sql` 실행
- [ ] iPhone 에 새 빌드 설치 → 라이브 액티비티와 친구/그룹 흐름 확인
- [ ] 개인정보/약관의 `[DEVELOPER NAME]`, `[CONTACT EMAIL]` 채우기, `SUPPORT_EMAIL`(`app/src/config.ts`) 설정, GitHub Pages(main /docs) 켜기

**출시 준비**
- [ ] 스토어 스크린샷(현재 화면으로) + 캡션 이미지
- [ ] Sentry / PostHog 키 설정(`EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`)
- [ ] 이메일 로그인 SMTP/템플릿
- [ ] 번들 ID 에 개발자 이름이 들어가 있어(`com.jjinchoi.focustown`) 필요하면 변경(변경 시 새 앱으로 취급됨)
- [ ] TestFlight → App Store 심사

**기능 후보**
- 초대 푸시(앱이 꺼져 있어도), 친구 추천
- 앱 차단(Screen Time / Family Controls, Apple 승인 절차가 길어 일찍 시작 권장). 온보딩 I'M IN 응답은 `screenTimeInterest` 로 저장 중
- 마을 대항전 등 소셜 확장

---

## 11. 알려진 한계

- 린트: `App.tsx` 에 기존부터 있던 오류 1건(선언 전 사용)과 경고 2건이 남아 있음(동작에는 영향 없음).
- 앱이 백그라운드인 동안 화면의 붉은 깜빡임은 볼 수 없음 → 알림/카드로 대체. **알림 권한이 없으면 이탈 경고가 전혀 뜨지 않음**(온보딩과 START 안내로 보완).
- 통화 패스 화면, 늦은 참여 대기 화면은 아직 예전 각진 버튼 스타일.
- 릴리스 빌드의 시간 휠 최소값은 5분(1분은 개발 모드 전용), 그룹 테스트는 5분 세션으로 해야 함.

---

## 12. 작업 이력 (주요 커밋)

| 커밋 | 내용 |
|---|---|
| (초기) | 솔로 모드, 픽셀 아트, 시간 휠, 모드, 통계, 설정 |
| ~ | Supabase 연동, 친구/그룹, 게스트 계정, 라이브 진행 카드, 사운드 21종 |
| `60b72b3` | FOCUS 정리, 온보딩 다듬기 |
| `0cbd865` | 새 팔로워 자동 갱신, 안드로이드 뒤로 가기가 오버레이 닫기 |
| `6c2cb61` | 팀원 넛지, 붉은 깜빡임, 팀 바 정렬, 결과/카운트다운/초대 배너 스타일 |
| `6271077` | 결과 화면 통일, 합쳐진 건물, 온보딩 동의 흐름, 확인 창, 칩 높이 고정 |
| 최신 | 집중 화면 글씨 위치 복원, 온보딩 그림·글씨 축소, iOS 재빌드, 이 문서 |

# Towny (타우니) 프로젝트 현황

> 갱신: 2026-10-07 · 저장소: https://github.com/c5551051011/towny (브랜치 `main`)
> 이 문서는 "지금까지 무엇이 만들어졌고, 어떻게 돌리고, 무엇이 남았는지"를 한 곳에 정리한 것입니다.
> 기획 원문은 `focus_town_final.md`(한국어 기획서), 서버 설정은 `backend/README.md`, 기기 테스트 항목은 `TESTING_TODO.md` 에 있습니다.

---

## 0. 이름 변경 (Focus Town → Towny) 체크리스트

앱 이름이 **Towny**(한글 표기 타우니)로 바뀌었습니다. 사용자에게 보이는 곳(앱 이름, 화면 제목, 알림, 공유 문구, 딥링크 `towny://`, 공개 문서, 스토어 자료)은 모두 바꿨고, 아래는 직접 해야 하는 곳입니다.

| 대상 | 할 일 | 비고 |
|---|---|---|
| GitHub 저장소 | ✅ 완료 — 저장소 이름 `towny`, 로컬 연결 주소도 변경함 | 이전 주소는 자동으로 연결됨 |
| GitHub Pages | ✅ 열림 — `https://c5551051011.github.io/towny/privacy.html` | 앱의 `config.ts`, `social.ts`, 스토어 자료가 이 주소를 씀 |
| Supabase | Project Settings → General → Project name 을 `Towny` 로 변경 | **프로젝트 주소(URL)와 키는 바뀌지 않음** → 코드 변경 없음. Authentication → SMTP 의 Sender name, 이메일 템플릿 문구도 Towny 로 |
| App Store Connect | 앱 만들 때 이름을 `Towny` 로 | 이름이 이미 쓰이고 있으면 `Towny: Pixel Focus Timer` 처럼 부제를 붙여 등록 |
| EAS(expo.dev) | 프로젝트 이름은 그대로 두어도 됨 | 슬러그 `focus-town` 은 프로젝트 ID 와 연결되어 있어 바꾸면 빌드가 실패함. 바꾸려면 expo.dev 에서 먼저 슬러그를 바꾼 뒤 `app.json` 의 `slug` 를 맞춤 |
| 번들 ID / 패키지명 | ✅ `app.towny.mobile` 로 변경함 (App Store Connect 에 앱을 만들기 전) | 이전 `com.jjinchoi.focustown` 으로 설치한 테스트 앱은 별개의 앱이라 아이폰에서 지워야 함. 이전 ID 는 Apple 개발자 사이트에 남아 있어도 무방 |
| 저장 키 | `focus_town_*` 그대로 | 앱에 저장된 기록이 사라지지 않게 유지 |

## 다음 대화로 이어가기 (2026-10-07 기준)

**코드 상태**: `main`. 앱 이름 Towny, 번들 ID `app.towny.mobile`, 저장소 `github.com/c5551051011/towny`. 확인은 `git log --oneline -15`.

**빌드/제출 현황** (확인은 `cd app && npx eas-cli build:list --limit 8`, 제출은 `npx eas-cli submit:list --platform ios --limit 4`)
- iOS production **10 / 11 / 12번**: 모두 빌드 성공, App Store Connect(TestFlight) 제출됨. 12번은 다른 대화에서 시작된 빌드(11 이후 JS 수정까지 포함). **잠금 감지 수정(아래)은 12번에 없다** — 다음 빌드가 필요.
- 제출은 `app/eas.json` 의 `submit.production.ios.ascAppId`(6819791122) 덕분에 질문·로그인 없이 `npx eas-cli submit -p ios --latest --non-interactive` 로 된다.
- Android preview APK: EAS 빌드 `e8566ee5-a625-4d4f-a1cb-1cb3125321d3` (설치 파일: https://expo.dev/artifacts/eas/q-n58SUwlWMY2OxmnPb_drG8LO63L-fbEHzjtYWaxwA.apk)

**⚠ 빌드는 사용자 승인 후에만** (EAS 무료 빌드 횟수 한정). 빌드·제출·push 는 사용자가 시킬 때만 한다. 규칙은 루트 `CLAUDE.md`.

**아직 빌드에 안 들어간 변경 (다음 빌드에 한 번에)**
- **iOS 잠금 감지(Swift, 네이티브)**: `modules/lock-state`. **빌드 13 은 심사 업로드에서 거절됨(ITMS-90699: 기기 잠금 알림을 들으면 안 됨)** — 비공개 시스템 신호(`com.apple.springboard.lockcomplete`/`lockstate`)를 넣었기 때문. 지금 코드는 **공개 API 만** 쓴다(`protectedDataWillBecomeUnavailable`/`DidBecomeAvailable` 알림 + `isProtectedDataAvailable`). 공개 알림은 잠근 뒤 몇 초 늦게 와서, 백그라운드로 간 뒤 iOS 는 **8초**(`LOCK_CHECK_MS`) 동안 잠금을 확인한 뒤에만 이탈 경고/카운트다운을 켠다(Android 는 1.5초). 잠그고 10초 안에 풀면 iOS 가 풀림 알림을 안 줘서 잠금이 아니라 "그냥 이탈"로 센다(올바른 결과). **빌드 13 은 App Store 심사에 못 쓰므로 새 빌드가 필요.**
- **EAS Update(OTA)**: `expo-updates` 설치, `app.json` 에 `runtimeVersion: fingerprint` + `updates.url`, `eas.json` 에 채널(`preview`/`production`). **이 설정이 들어간 빌드부터** JS 수정을 빌드 없이 배포할 수 있다: `cd app && npx eas-cli update --channel production --message "설명"`. 네이티브가 바뀌면(fingerprint 가 달라지면) 빌드를 새로 해야 한다.
- 닉네임 추천/중복 검사, START 버튼 모양, 효과음 볼륨, 음악 미리듣기 아이콘은 빌드 12 에 이미 들어 있음.

**Supabase SQL**: 0005 lock, 0006 invite_push, 0007 faster_nudge, 0008 unique_names 는 실행됨. **`0009_enable_pg_net.sql` 은 실행 필요** — `pg_net` 이 꺼져 있어서 서버 푸시(초대/넛지)가 한 번도 안 갔음(`net._http_response` 가 없다는 오류로 확인).

**이번에 바뀐 동작**
- 진행바에 `PROGRESS NN%`. iOS 라이브 액티비티 진행바는 0에서 차오른다(`expo-live-activity` Swift 를 `app/patches/` 로 패치, `postinstall: patch-package`). 시작 시각은 `progressBar.progress` 에 실어 보낸다. Android 카드는 숫자 카운트다운만 있다.
- 그룹: 이탈 판정 6초(서버 0007), 하트비트 2.5초, 피해 시작 유예 **30초**(`DAMAGE_START_SEC`, 서버와 같아야 함). 팀원 **넛지(알림 보내기)는 앱에서 제거함**(서버의 `nudge_away` 는 남아 있지만 앱이 부르지 않음). 솔로 유예는 그대로 15초.
- 초대: 앱이 열려 있으면 2.5초마다 확인 + 앱으로 돌아오면 즉시, 앱이 꺼져 있으면 서버가 푸시(0006 트리거).
- 마을 지도: 여럿이 지은 그룹 건물은 완성 화면과 같은 겹친 모양(`TeamBuilding scale`)으로 놓는다. 세션에 `durability` 저장(이전 기록은 멀쩡한 모양).
- 닉네임: 만들 때 `CozySeal45` 식 추천이 채워지고 "Suggest another name" 버튼, 저장 전 `name_taken` 으로 중복 검사, 서버 대소문자 무관 유일 인덱스(충돌 시 숫자 붙여 자동 저장 + 알림).

**초대 푸시 진단**(0009 실행 후에도 앱이 꺼져 있을 때 안 오면): Supabase SQL Editor 에서 `select user_id, left(token, 30), updated_at from push_tokens;`(받는 사람 토큰이 있는지), `select created, status_code, content from net._http_response order by created desc limit 5;`(Expo 가 돌려준 응답. `InvalidCredentials`/`DeviceNotRegistered` 등이 나오면 iOS 푸시 자격 증명(APNs 키) 문제 → `cd app && npx eas-cli credentials -p ios` 에서 Push Notifications 키 설정). 토큰이 없으면 앱이 토큰을 못 받은 것(알림 권한/푸시 capability).

**테스트해야 할 것 (사용자가 기기로)**: 음악 OFF 일 때 화면 잠금, 초대 속도(앱 열림/꺼짐), **앱이 꺼져 있을 때 초대 푸시가 도착하는지**(안 오면 아래 진단), 친구/그룹 전체 흐름, 새 빌드의 잠금 감지(잠그자마자 카운트다운이 뜨지 않는지, 잠금 직후 다른 앱을 열면 이탈로 세는지).

**다음에 할 일 (순서)**
1. 변경이 더 모이면 승인받고 iOS 빌드 → 제출 → TestFlight 확인(위 테스트 목록)
2. 스크린샷 다시 찍기(FOCUS 시작 화면, 완료 화면 새 문구) → `store/` 자료 갱신
3. App Store Connect 심사 제출(정보·스크린샷·App Privacy·연령 등급은 입력됨, 심사 메모는 `store/listing.md` 맨 아래)
4. Apple 에 Family Controls(Screen Time) 권한 신청 → 승인 후 `eas.json` 의 `ENABLE_SCREEN_TIME` 과 `EXPO_PUBLIC_ENABLE_SCREEN_TIME` 을 "1" 로 (7.4). 지금은 꺼져 있어 설정의 "Focus lock" 항목이 안 보이는 것이 정상.
5. 소셜 로그인(Apple + 구글 + 카카오)은 제출 이후 단계

**업로드 용량**: EAS 업로드가 약 165MB. 음악 mp3(`app/assets/music`, 약 86MB)가 작업 폴더와 `.git` 에 한 번씩 들어 있어서다. `.easignore` 로는 못 줄이고, 줄이려면 mp3 를 낮은 비트레이트로 다시 인코딩해야 한다(음질 trade-off).

**작업 방식 메모**: 사용자는 한국어 답변·단계별 안내를 선호하고, Apple 로그인(비밀번호/2단계)은 직접 입력해야 함(제출은 API 키 등록으로 이제 불필요). Mac 에 Xcode 가 없어 Swift 는 EAS 빌드로만 컴파일 확인. Android 시험은 세 번째 에뮬레이터(`Pixel_3a_API_34`, 포트 5558; 화면이 검게 나오면 `adb shell input keyevent KEYCODE_WAKEUP`)로 하고, 사용자가 쓰는 5554/5556 은 건드리지 않음. 로컬 `app/android` 는 예전 패키지명(`com.jjinchoi.focustown`)이라 에뮬레이터 앱은 그 이름으로 설치된다. 에뮬레이터 빌드 산출물(`modules/focus-ongoing/android/build/`)은 이제 git 에서 제외됨.

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
| 로그인 | 이메일 코드(완료) · 소셜은 다음 단계 | **친구/초대/팔로우 링크는 로그인 필요**, 솔로 집중은 로그인 없이 가능. 게스트 계정은 더 이상 자동 생성하지 않음 |
| 친구(팔로우) | 완료 | 이름 검색, 친구 코드/링크, 서로 팔로우 = 친구 (로그인 필요) |
| 그룹 집중 | 완료 · 에뮬레이터 2대로 검증 | 팀 내구성, 탈락, 늦은 참여 승인, 결과 |
| 팀원 넛지(알림 보내기) | **제거함** | 서버 함수만 남음 |
| TOWN(마을) | 완료 | 8×8 아이소메트릭 땅, 기간 필터, 건물 수 요약 |
| STATS | 완료 | 스트릭, 요약, 7일×24시간 타임라인, 달력 |
| ME · 설정 | 완료 | 프로필, 팔로잉/팔로워, 친구, 설정, 계정 삭제 |
| 배경 사운드 | 완료 | 26종(모드별 추천), 합성 싱잉볼 포함 |
| 화면 밖 진행 표시 | iOS 라이브 액티비티 · Android 알림 카드 | Android 확인 완료, **iOS 실기기 확인 대기** |
| 분석/오류 수집 | 준비됨(키 없음) | PostHog + Sentry, 사용자가 끌 수 있음 |
| 앱 차단(Screen Time) | iOS 코드 완료 · **Apple 승인 대기** | 설정에서 앱 고르기, 집중 중 잠금. Android 는 아직 없음 (아래 7.4) |

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
- 그룹: 진행률 바 **바로 아래에 같은 폭의 TEAM BUILDING 바**, 이탈 팀원이 있으면 "OO is away!"
- 이탈 경고: 화면 전체가 붉게 깜빡임(돌아온 직후, iOS 제어 센터/앱 전환, 팀원 화면). 앱이 완전히 백그라운드면 화면이 안 보이므로 **알림 + 15초 카운트다운 카드**가 담당합니다.

### 3.4 결과 화면
- 성공 "TA-DA!" / 그룹 "TEAMWORK!", 실패 "OOPS!" / "OH NO!" / "WHOOPS!", 나감 "BYE BYE!"
- 같은 틀: 위(둥근 받침 위 건물 + 제목), 아래(큰 글씨 메시지, 팀 바, 멤버 카드, 둥근 버튼). 나감/탈락은 왼쪽 위 **X** 로 닫기.
- 그룹 성공: **참여 인원만큼 건물이 한 덩어리로** 보이고, 내구성이 낮을수록 기울고 눌리며 40% 미만이면 한 채가 폐허가 됩니다.

### 3.5 그 밖
- TOWN, STATS(타임라인·달력), ME(프로필·팔로우 목록·친구·집중 기록), 설정(목표, 알림, 사운드, 개인정보, 계정), 확인 창은 앱 스타일 시트(`ConfirmSheet`).

---

**화면 잠금은 이탈이 아님 (배터리 절약)** — 집중 중에 폰 화면을 잠가 두어도 집중이 이어집니다.
- Android: 네이티브 모듈(`focus-ongoing`)이 화면 꺼짐/잠금 해제 시각을 기록, 앱이 백그라운드로 가는 순간 화면이 꺼져 있으면 이탈로 치지 않음(경고 알림, 15초 카드 없음). 에뮬레이터에서 확인함(35초 잠금 후 집중 유지, 홈 버튼으로 나가면 예전처럼 이탈 처리).
- iOS: 새 모듈 `lock-state`(Swift)가 공개 API 인 보호된 데이터 알림(`protectedDataWillBecomeUnavailable` / `DidBecomeAvailable`)을 들음. 기기에 암호가 있어야 신호가 옴(없으면 예전처럼 이탈 처리). **아이폰 실기기에서 아직 확인하지 못함** — TestFlight 에서 화면을 잠갔다 푸는 시험이 필요.
- 복귀할 때는 "잠겨 있던 시간"을 뺀 값으로 판정, 잠금을 푼 뒤 다른 앱을 쓰다 오면 정상적으로 이탈 처리.
- 그룹: 잠금을 서버에 알려(`set_locked`) 팀원 화면에 "자리 비움"이 뜨지 않음. 앱으로 돌아오면 자동 해제.
- 잠가 둔 사이 집중이 끝나면 "All done! Come see your new building." 알림이 옴.

## 4. 게임 규칙

**건물(집중 시간 기준)**: 오두막 0분 · 집 20분 · 타워 45분 · 도서관 70분 · 성 100분
**모드**: STUDY, READING, WORK, EXERCISE, REST, SLEEP + 직접 추가한 태그

**솔로**
- 앱을 벗어나 **15초 넘기면 붕괴**. 15초 안에 돌아오면 정상.
- 하루 1회 "통화 패스": 벗어나 있던 시간만큼 타이머를 멈춘 것으로 처리.
- 앱을 강제 종료해도 진행 중 세션을 복구.

**그룹**
- 초대는 **서로 팔로우하는 친구**끼리만. 방장이 시작하면 즉시 진행(READY 대기 없음), 최대 4명.
- 이탈 **30초** 유예 후 초과 시간만큼 팀 내구성이 **초당 약 1.67%** 감소, 한 명의 초과 이탈이 **45초면 탈락**.
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
| `0005_lock.sql` | 화면 잠금 중인 멤버를 이탈/피해/넛지에서 제외 (`set_locked`, `locked_until`) |
| `0006_invite_push.sql` | 그룹 초대를 받으면 앱이 꺼져 있어도 푸시 (`room_invites` insert 트리거) |
| `0007_faster_nudge.sql` | 이탈 판정 10→6초, 피해 시작 유예 15→30초 (`_room_state`, `nudge_away`) |
| `0008_unique_names.sql` | 닉네임 대소문자 무관 유일 인덱스 + `name_taken` (기존 중복은 숫자를 붙여 정리) |

**해야 할 일 (대시보드에서 직접)**
1. SQL Editor 에서 `0001`~`0008` 을 순서대로 실행 (모두 적용됨)
2. Authentication → Sign In / Providers → **Allow anonymous sign-ins** 켜기 (게스트 계정, 켜 둔 상태로 테스트했음)
3. (선택) 이메일 로그인용 템플릿에 `{{ .Token }}`, SMTP 설정
4. 넛지 푸시를 실제로 받으려면 Android 는 **Firebase(FCM) 설정** — https://docs.expo.dev/push-notifications/fcm-credentials/ , iOS 는 EAS 가 APNs 키 관리

로컬 시험: `backend/tests/README.md` (PostgreSQL 14+ 에서 마이그레이션 → 시나리오 SQL 실행, `nudge_scenarios.sql` 통과 확인함).

---

## 6.5 로그인 방식

- **지금**: 이메일 6자리 코드(비밀번호 없음). 앱: `AuthSheet`, 서버: Supabase Auth OTP.
- 코드가 실제로 오려면 Supabase 대시보드에서: Authentication → Email Templates(**Confirm signup**, **Magic Link**)에 `{{ .Token }}` 포함, 그리고 **Custom SMTP** 설정(기본 메일 서비스는 시간당 발송 수가 매우 적어 실사용 불가. Resend, Postmark 등 권장).
- **소셜 로그인(구글/카카오)은 다음 단계**: Apple 심사 규칙 4.8 때문에 소셜 로그인을 넣으면 **Sign in with Apple 도 반드시** 함께 넣어야 합니다. 구글(Cloud Console OAuth 클라이언트), 카카오(Kakao Developers 앱), Apple(App ID capability) 설정이 필요해 사용자 작업이 많음. 이메일 코드만으로도 첫 제출은 가능.


**Supabase 이메일 템플릿 (Authentication → Emails → Templates)** — 앱은 링크가 아니라 **6자리 코드**로 로그인하므로 두 템플릿 모두 `{{ .Token }}` 을 보여 주고 링크(`{{ .ConfirmationURL }}`)는 넣지 않습니다. 처음 가입하는 사람에게는 **Confirm signup**, 이미 계정이 있는 사람에게는 **Magic Link** 가 나갑니다.
- 제목: `Your Towny sign-in code`
- 본문(HTML):
```html
<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;">
  <h2 style="margin:0 0 12px;">Welcome to Towny 🏠</h2>
  <p style="margin:0 0 16px;">Enter this code in the app to sign in:</p>
  <p style="font-size:36px;font-weight:bold;letter-spacing:8px;margin:0 0 16px;">{{ .Token }}</p>
  <p style="color:#666;margin:0;">The code expires soon. If you didn't request it, you can ignore this email.</p>
</div>
```
- 같이 확인: Authentication → Sign In / Providers → Email 의 **Email OTP Length = 6**, **Email OTP Expiration** 은 기본(3600초)이나 10분 정도로 줄여도 됨.

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
- 번들 ID `app.towny.mobile` (+ 라이브 액티비티 `app.towny.mobile.LiveActivity`), Apple 팀 `3FFQ9Z7QHZ`(개인), 등록 기기: 사용자의 iPhone
- 인증서/프로비저닝은 EAS 서버에 저장되어 있어 `--non-interactive` 로도 빌드됩니다. Apple 로그인(비밀번호/2단계 인증)이 필요한 경우는 **직접 터미널에서** 입력해야 합니다.
- 설치: 빌드 페이지(링크는 8장) → 아이폰 Safari 에서 열기 → 설치. 처음엔 설정 → 개인정보 보호 및 보안 → **개발자 모드** 켜기, 설정 → 일반 → VPN 및 기기 관리에서 프로필 **신뢰**.
- 라이브 액티비티는 설정 → Towny → 실시간 현황(Live Activities) 이 켜져 있어야 합니다.

### 7.4 Screen Time(앱 차단) — Apple 승인이 먼저 필요
- 구현: `app/modules/screen-time`(Swift, FamilyControls + ManagedSettings), `app/src/lib/screenTime.ts`, 설정 > Focus lock, 온보딩 "I'M IN". 집중 시작에 선택한 앱을 잠그고, 끝나거나 멈추거나 앱을 켤 때 풉니다.
- **Apple 의 Family Controls 권한이 승인되어야** 실기기/TestFlight/App Store 에서 동작합니다. 승인 전에 권한을 앱에 넣으면 iOS 빌드 인증서 발급이 실패하므로, 권한은 환경변수 `ENABLE_SCREEN_TIME=1` 일 때만 넣습니다(`app/plugins/withScreenTime.js`, `app/eas.json` 의 env, 기본 "0"). 같은 이유로 **승인 전에는 설정/온보딩의 Screen Time 화면을 숨깁니다**(`EXPO_PUBLIC_ENABLE_SCREEN_TIME`). 승인 후에는 두 값을 모두 "1" 로 바꿉니다.
- 승인 절차: ① Account Holder 가 https://developer.apple.com/contact/request/family-controls-distribution 에서 신청(번들 ID `app.towny.mobile`) ② 승인 후 `eas.json` 의 `ENABLE_SCREEN_TIME` 을 "1" 로 ③ iOS 재빌드(인증서 갱신 때 Apple 로그인 필요할 수 있음). 승인 전에는 설정의 스위치를 켜면 "Not available yet" 안내가 뜹니다.
- **허용 목록 방식**: 고른 앱만 계속 쓰고 **나머지 모든 앱·웹사이트를 집중 내내 잠금**(`shield.applicationCategories = .all(except:)`). 선택 화면 제목 "Apps to allow". **Towny 와 전화는 번들 ID 로 항상 허용**(`Application(bundleIdentifier:).token`, Swift). Towny 토큰을 못 만들면 잠그지 않음. 허용 앱을 하나도 안 골라도 잠금은 동작. Swift 변경이라 **기기 확인은 다음 빌드 후**(전화/Towny 가 실제로 열리는지, 잠금이 풀리는지).
- 알려진 한계: 앱이 강제 종료되면 잠금이 남을 수 있어(다음에 앱을 켤 때 풀림) 필요하면 DeviceActivity 확장으로 종료 시각에 자동 해제 추가. Android 는 접근성/사용 통계 권한이 필요한 별도 구현이 필요해 미지원.

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
- [ ] Supabase: 이메일 템플릿(`{{ .Token }}`)과 Custom SMTP 설정 (로그인 코드가 오려면 필수)
- [ ] Apple 에 Family Controls 권한 신청 (7.4)
- [ ] GitHub Pages(main /docs) 켜기

**출시 준비**
- [ ] 스토어 스크린샷(현재 화면으로) + 캡션 이미지
- [ ] Sentry / PostHog 키 설정(`EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`)
- [ ] 이메일 로그인 SMTP/템플릿
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
- 이메일 코드만 지원(소셜 로그인 없음). 로그인하지 않으면 친구/그룹 기능을 쓸 수 없음.
- 릴리스 빌드의 시간 휠 최소값은 5분(1분은 개발 모드 전용), 그룹 테스트는 5분 세션으로 해야 함.

---

## 12. 작업 이력 (주요 커밋)

| 커밋 | 내용 |
|---|---|
| (초기) | 솔로 모드, 픽셀 아트, 시간 휠, 모드, 통계, 설정 |
| ~ | Supabase 연동, 친구/그룹, 게스트 계정, 라이브 진행 카드, 사운드 26종 |
| `60b72b3` | FOCUS 정리, 온보딩 다듬기 |
| `0cbd865` | 새 팔로워 자동 갱신, 안드로이드 뒤로 가기가 오버레이 닫기 |
| `6c2cb61` | 팀원 넛지, 붉은 깜빡임, 팀 바 정렬, 결과/카운트다운/초대 배너 스타일 |
| `6271077` | 결과 화면 통일, 합쳐진 건물, 온보딩 동의 흐름, 확인 창, 칩 높이 고정 |
| 최신 | 집중 화면 글씨 위치 복원, 온보딩 그림·글씨 축소, iOS 재빌드, 이 문서 |

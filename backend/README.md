# Focus Town backend (Supabase)

서버는 Supabase(Auth + Postgres)를 사용합니다. 별도 서버 코드는 없고, DB 정의(SQL)만 이 폴더에 둡니다.

## 처음 한 번 설정하기

1. **테이블 만들기**: Supabase 대시보드 → SQL Editor → `supabase/migrations/` 의 SQL 파일을 **번호 순서대로**(0001 → 0002 → 0003 → 0004) 붙여 넣고 각각 Run. 이미 실행한 파일은 다시 실행하지 않아도 됩니다.
2. **게스트(이메일 없이) 로그인 켜기** — 지금 테스트에 필요한 설정입니다.
   Authentication → Sign In / Providers → **Allow anonymous sign-ins** 를 켭니다. 앱은 캐릭터를 만든 뒤 자동으로 게스트 계정을 만들어 친구/그룹을 쓸 수 있게 합니다. (게스트 계정은 그 기기에서만 유지되며, 로그아웃하면 복구할 수 없습니다.)
3. **로그인 메일에 코드 넣기** (이메일로 기존 계정을 불러올 때 필요, 나중에 해도 됩니다) (앱은 이메일로 받은 6자리 코드로 로그인합니다):
   Authentication → Emails → Templates 에서 **Confirm signup** 과 **Magic Link** 두 템플릿 모두 본문에 아래 줄을 넣습니다.
   ```html
   <h2>Your Focus Town code</h2>
   <p>Enter this code in the app: <b>{{ .Token }}</b></p>
   ```
4. **메일 발송 한도**: 기본 메일 서버는 시간당 발송 수가 매우 적습니다. 테스트는 괜찮지만, 출시 전에 Authentication → Emails → SMTP Settings 에서 커스텀 SMTP(Resend, SendGrid 등)를 연결하세요.

## 키 관리
- 앱에 들어가는 것은 **Project URL** 과 **publishable key** 뿐입니다 (`app/src/config.ts`). 공개되어도 안전하게 설계된 값이며, 데이터 보호는 각 테이블의 RLS 정책이 담당합니다.
- `secret key` / `service_role key` 는 절대 앱 코드나 Git에 넣지 마세요.

## 마이그레이션 목록
| 파일 | 내용 |
| :--- | :--- |
| `0001_profiles.sql` | 프로필(이름·캐릭터) 테이블, RLS, 계정 삭제 함수 |
| `0002_rooms.sql` | 그룹 방 테이블과 규칙 함수(create/join/ready/start/late_join/respond_join/heartbeat/finish/leave), 초대 기록 |
| `0003_social.sql` | 친구 코드, 팔로우(following/followers), 이름 검색, 친구 초대로 바로 시작하는 그룹(`create_room_with_invites`), 초대 수락/거절 |
| `0004_nudge.sql` | 이탈한 팀원에게 "돌아와요" 푸시 보내기: `push_tokens`(RPC로만 접근), `set_push_token`, `clear_push_token`, `nudge_away` (같은 사람에게 20초에 한 번) |

## 팀원 넛지 (0004)
- 집중 중 팀원이 앱을 벗어나 있으면(10초 넘게 신호 없음) 다른 팀원이 화면을 탭해 "돌아와요" 알림을 보낼 수 있다. 같은 사람에게는 20초에 한 번만 간다.
- 알림은 데이터베이스가 Expo 푸시 서비스(`exp.host`)로 직접 보낸다 (Supabase 의 `pg_net` 확장 사용, 기본 켜져 있음). 푸시 토큰은 `push_tokens` 테이블에 있고 다른 사람은 읽을 수 없다.
- **실제 기기에 알림이 닿으려면** Android 는 Firebase(FCM) 설정이 필요하다: https://docs.expo.dev/push-notifications/fcm-credentials/ . 설정 전에는 넛지 버튼은 동작하지만 알림은 도착하지 않는다. iOS 는 EAS 가 APNs 키를 관리한다.

## 친구와 그룹 규칙 (0002, 0003)
- **친구**: 이름 검색 또는 친구 코드(링크)로 팔로우. **서로 팔로우하면 친구**이고, 그룹 초대는 친구에게만 보낼 수 있다.
- **그룹 시작**: 방장이 친구를 고르고(최대 3명) 시작하면 **바로 진행**된다(READY 대기 없음). 초대받은 친구는 앱에서 초대를 보고 참여한다. (예전 `create_room`/`set_ready`/`start_room` 함수는 호환을 위해 남겨 두었지만 앱은 쓰지 않는다)
- 시작 후 **3분(`late_join_seconds`)** 안에는 누구나 바로 늦게 참여. 그 뒤에는 현재 참여자 **전원이 허용**해야 참여.
- 팀 건물 내구성 100%에서 시작. 15초를 넘겨 앱을 벗어나 있으면 초과한 1초마다 100/60 % 감소.
- 한 사람의 초과 이탈이 45초(총 60초 이탈)가 되면 그 사람은 탈락, 팀은 계속.
- 종료 시 내구성 70% 이상 → 원래 건물 / 40~69% → 한 단계 작은 건물 / 1~39% → 오두막 / 0% → 붕괴.
- 앱은 테이블에 직접 접근하지 않고 RPC 함수로만 읽고 씁니다(RLS로 직접 접근 차단).
- 규칙은 `backend/tests/` 의 시나리오로 로컬 PostgreSQL에서 시험할 수 있습니다.

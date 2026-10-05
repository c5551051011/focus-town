# Focus Town backend (Supabase)

서버는 Supabase(Auth + Postgres)를 사용합니다. 별도 서버 코드는 없고, DB 정의(SQL)만 이 폴더에 둡니다.

## 처음 한 번 설정하기

1. **테이블 만들기**: Supabase 대시보드 → SQL Editor → `supabase/migrations/` 의 SQL 파일을 **번호 순서대로**(0001 → 0002) 붙여 넣고 각각 Run. 이미 실행한 파일은 다시 실행하지 않아도 됩니다.
2. **로그인 메일에 코드 넣기** (앱은 이메일로 받은 6자리 코드로 로그인합니다):
   Authentication → Emails → Templates 에서 **Confirm signup** 과 **Magic Link** 두 템플릿 모두 본문에 아래 줄을 넣습니다.
   ```html
   <h2>Your Focus Town code</h2>
   <p>Enter this code in the app: <b>{{ .Token }}</b></p>
   ```
3. **메일 발송 한도**: 기본 메일 서버는 시간당 발송 수가 매우 적습니다. 테스트는 괜찮지만, 출시 전에 Authentication → Emails → SMTP Settings 에서 커스텀 SMTP(Resend, SendGrid 등)를 연결하세요.

## 키 관리
- 앱에 들어가는 것은 **Project URL** 과 **publishable key** 뿐입니다 (`app/src/config.ts`). 공개되어도 안전하게 설계된 값이며, 데이터 보호는 각 테이블의 RLS 정책이 담당합니다.
- `secret key` / `service_role key` 는 절대 앱 코드나 Git에 넣지 마세요.

## 마이그레이션 목록
| 파일 | 내용 |
| :--- | :--- |
| `0001_profiles.sql` | 프로필(이름·캐릭터) 테이블, RLS, 계정 삭제 함수 |
| `0002_rooms.sql` | 그룹 방 테이블과 규칙 함수(create/join/ready/start/late_join/respond_join/heartbeat/finish/leave) |

## 그룹 방 규칙 (0002_rooms.sql)
- 방장이 방을 만들고(최대 4인) 6자리 코드를 공유. 준비(READY)한 사람들로 방장이 시작.
- 시작 후 **3분(`late_join_seconds`)** 안에는 누구나 바로 늦게 참여. 그 뒤에는 현재 참여자 **전원이 허용**해야 참여.
- 팀 건물 내구성 100%에서 시작. 15초를 넘겨 앱을 벗어나 있으면 초과한 1초마다 100/60 % 감소.
- 한 사람의 초과 이탈이 45초(총 60초 이탈)가 되면 그 사람은 탈락, 팀은 계속.
- 종료 시 내구성 70% 이상 → 원래 건물 / 40~69% → 한 단계 작은 건물 / 1~39% → 오두막 / 0% → 붕괴.
- 앱은 테이블에 직접 접근하지 않고 RPC 함수로만 읽고 씁니다(RLS로 직접 접근 차단).
- 규칙은 `backend/tests/` 의 시나리오로 로컬 PostgreSQL에서 시험할 수 있습니다.

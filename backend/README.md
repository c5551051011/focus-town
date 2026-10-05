# Focus Town backend (Supabase)

서버는 Supabase(Auth + Postgres)를 사용합니다. 별도 서버 코드는 없고, DB 정의(SQL)만 이 폴더에 둡니다.

## 처음 한 번 설정하기

1. **테이블 만들기**: Supabase 대시보드 → SQL Editor → `supabase/migrations/0001_profiles.sql` 내용을 붙여 넣고 Run.
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

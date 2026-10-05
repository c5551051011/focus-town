# 테스트 체크리스트 (아직 기기에서 확인하지 않은 기능)

> 마지막 갱신: 2026-10-06. 테스트를 마치면 항목을 지우거나 ✅ 로 바꿔 주세요.

## 0. 먼저 해야 할 서버 설정 (Supabase)
- [ ] SQL Editor 에서 `backend/supabase/migrations/0002_rooms.sql` 다시 실행 → 이어서 `0003_social.sql` 실행
- [ ] Authentication → Sign In / Providers → **Allow anonymous sign-ins** 켜기 (게스트 계정, 이메일 없이 테스트)
- [ ] (나중에) 이메일 로그인: Confirm signup / Magic Link 템플릿에 `{{ .Token }}` 넣기

## 1. 새 빌드 만들기
- [ ] `cd app && npx eas-cli build -p android --profile preview` (라이브 진행 표시 포함이라 개발/프리뷰 빌드 필요, Expo Go 불가)
- [ ] 기기 2대(또는 에뮬레이터 + 폰)에 설치

## 2. 친구 · 그룹
- [ ] 두 기기 모두 캐릭터 만들기 (게스트 계정은 자동 생성)
- [ ] A: ME → ADD FRIENDS → 친구 코드 확인 → B 검색창에 붙여넣기 → FOLLOW
- [ ] A 에서 FOLLOW BACK (서로 팔로우하면 FRIENDS)
- [ ] A: FOCUS → WITH FRIENDS 에서 B 선택 → START → B 화면 상단 초대 배너 → JOIN
- [ ] 집중 중: 참여자 캐릭터 전원 표시, TEAM BUILDING 내구성 바
- [ ] 한쪽이 앱을 15초 넘게 벗어나면 내구성이 줄어드는지, 45초 초과 이탈 시 탈락하는지
- [ ] 3분 뒤 늦은 참여는 전원 허용(ALLOW/DENY) 필요한지
- [ ] 종료 후 결과(내구성에 따른 건물)와 마을에 건물이 생기는지

## 3. 화면을 벗어났을 때 진행 표시
- [ ] Android: 알림 영역에 남은 시간/진행 카드가 보이는지
- [ ] iOS: 잠금 화면 / Dynamic Island 라이브 액티비티 (Apple 계정 활성화 후)

# 그룹 방 SQL 시험 (로컬 PostgreSQL)

Supabase에 올리기 전에 로컬 PostgreSQL(14 이상)에서 규칙을 시험합니다.

```bash
createdb ft_test
psql ft_test -f backend/tests/mock_auth.sql
psql ft_test -f backend/supabase/migrations/0001_profiles.sql
psql ft_test -f backend/supabase/migrations/0002_rooms.sql
psql ft_test -f backend/tests/rooms_scenarios.sql   # 방 만들기/참여/늦은 참여/투표/이탈/종료 시나리오
psql ft_test -f backend/tests/rooms_tiers.sql        # 내구성에 따른 건물 등급
```

`rooms_scenarios.sql` 은 각 단계의 기대 결과를 `\echo` 로 설명해 두었으니 출력과 비교해서 보세요.
기대하는 핵심 결과: 늦은 참여 허용 3분 안 → 즉시 참여, 3분 뒤 → 전원 투표 필요, 한 명이 40초 이탈하면 내구성 58%, 초과 이탈 45초 → 탈락, 종료 후에는 같은 결과 확정.

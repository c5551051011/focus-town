-- Towny: 서버가 푸시 알림을 보내려면 pg_net 확장이 필요하다
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다)
--
--  * 초대 푸시(0006)와 넛지(0004)는 net.http_post 로 Expo 푸시 서비스를 부른다. pg_net 이 꺼져 있으면 net 스키마가 없어서
--    전송이 조용히 실패한다(함수가 오류를 삼키도록 되어 있음). 그래서 푸시가 한 번도 가지 않았다.
--  * 켠 뒤에는 전송 결과를 select created, status_code, content from net._http_response order by created desc limit 5; 로 볼 수 있다.

create extension if not exists pg_net with schema extensions;

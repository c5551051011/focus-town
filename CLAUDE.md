# Towny 작업 규칙 (모든 대화 공통)

- **빌드·제출·push 는 사용자가 시킬 때만 한다.** EAS 무료 빌드 횟수가 한정되어 있다. `eas build`, `eas submit`, `git push` 를 먼저 실행하지 않는다. 변경은 모아서, 사용자 승인 후 한 번에 빌드한다.
- JS/UI 만 바뀐 수정은 빌드 없이 EAS Update 로 배포할 수 있다(`cd app && npx eas-cli update --channel production`). 네이티브(Swift/Kotlin, `app.json` 플러그인, 패키지)가 바뀌면 빌드가 필요하다.
- 답변은 한국어, 단계별로 안내한다. Apple 로그인(비밀번호/2단계)은 사용자가 직접 입력한다.
- 현재 상태와 이어서 할 일은 `PROJECT_STATUS.md` 의 "다음 대화로 이어가기".
- Mac 에 Xcode 가 없어 Swift 는 EAS 빌드로만 컴파일 확인된다. Swift 를 고칠 때는 특히 조심한다.
- 다른 대화가 같은 `main` 에 커밋한다. 작업 전 `git status`, 커밋은 자기 파일만, push 전 `git pull --rebase`.
- Android 에뮬레이터는 `Pixel_3a_API_34`(포트 5558)만 쓴다. 5554/5556 은 사용자가 쓴다.

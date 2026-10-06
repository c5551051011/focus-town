// Family Controls(스크린 타임) 권한을 앱에 넣는 설정 플러그인.
// Apple 이 이 권한을 승인하기 전에 넣으면 iOS 빌드의 인증서 발급이 실패하므로,
// 환경 변수 ENABLE_SCREEN_TIME=1 일 때만 넣는다 (app/eas.json 의 env 에서 켠다).
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withScreenTime(config) {
  return withEntitlementsPlist(config, (c) => {
    if (process.env.ENABLE_SCREEN_TIME === '1') {
      c.modResults['com.apple.developer.family-controls'] = true;
    }
    return c;
  });
};

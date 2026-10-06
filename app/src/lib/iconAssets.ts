// 자동 생성 파일 — tools/gen_sprites.py 를 실행하면 다시 만들어진다. 직접 수정하지 마세요.

export const ICON_IMAGES = {
  target: require('../../assets/pixel/icon_target.png'),
  user: require('../../assets/pixel/icon_user.png'),
  plus: require('../../assets/pixel/icon_plus.png'),
  gear: require('../../assets/pixel/icon_gear.png'),
  shield: require('../../assets/pixel/icon_shield.png'),
  bell: require('../../assets/pixel/icon_bell.png'),
  share: require('../../assets/pixel/icon_share.png'),
  help: require('../../assets/pixel/icon_help.png'),
  search: require('../../assets/pixel/icon_search.png'),
} as const;
export type IconName = keyof typeof ICON_IMAGES;

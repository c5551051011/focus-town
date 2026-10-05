// 자동 생성 파일 — tools/gen_sprites.py 를 실행하면 다시 만들어진다. 직접 수정하지 마세요.

export const SPECIES = ['bear', 'cat', 'rabbit', 'fox'] as const;
export const COLOR_IDS = ['brown', 'cream', 'gray', 'orange', 'pink', 'white', 'blue', 'purple', 'mint'] as const;
export const COLOR_HEX = {'brown': '#a8704c', 'cream': '#f5e6c8', 'gray': '#b4b4cc', 'orange': '#ffb86c', 'pink': '#ffa6c9', 'white': '#fbfbf5', 'blue': '#8be9fd', 'purple': '#bd93f9', 'mint': '#7ee787'} as const;
export const HAT_IDS = ['none', 'hardhat', 'crown', 'bow', 'cap'] as const;

export const BODY_IMAGES: Record<string, number> = {
  'bear_brown': require('../../assets/pixel/char_bear_brown.png'),
  'bear_cream': require('../../assets/pixel/char_bear_cream.png'),
  'bear_gray': require('../../assets/pixel/char_bear_gray.png'),
  'bear_orange': require('../../assets/pixel/char_bear_orange.png'),
  'bear_pink': require('../../assets/pixel/char_bear_pink.png'),
  'bear_white': require('../../assets/pixel/char_bear_white.png'),
  'bear_blue': require('../../assets/pixel/char_bear_blue.png'),
  'bear_purple': require('../../assets/pixel/char_bear_purple.png'),
  'bear_mint': require('../../assets/pixel/char_bear_mint.png'),
  'cat_brown': require('../../assets/pixel/char_cat_brown.png'),
  'cat_cream': require('../../assets/pixel/char_cat_cream.png'),
  'cat_gray': require('../../assets/pixel/char_cat_gray.png'),
  'cat_orange': require('../../assets/pixel/char_cat_orange.png'),
  'cat_pink': require('../../assets/pixel/char_cat_pink.png'),
  'cat_white': require('../../assets/pixel/char_cat_white.png'),
  'cat_blue': require('../../assets/pixel/char_cat_blue.png'),
  'cat_purple': require('../../assets/pixel/char_cat_purple.png'),
  'cat_mint': require('../../assets/pixel/char_cat_mint.png'),
  'rabbit_brown': require('../../assets/pixel/char_rabbit_brown.png'),
  'rabbit_cream': require('../../assets/pixel/char_rabbit_cream.png'),
  'rabbit_gray': require('../../assets/pixel/char_rabbit_gray.png'),
  'rabbit_orange': require('../../assets/pixel/char_rabbit_orange.png'),
  'rabbit_pink': require('../../assets/pixel/char_rabbit_pink.png'),
  'rabbit_white': require('../../assets/pixel/char_rabbit_white.png'),
  'rabbit_blue': require('../../assets/pixel/char_rabbit_blue.png'),
  'rabbit_purple': require('../../assets/pixel/char_rabbit_purple.png'),
  'rabbit_mint': require('../../assets/pixel/char_rabbit_mint.png'),
  'fox_brown': require('../../assets/pixel/char_fox_brown.png'),
  'fox_cream': require('../../assets/pixel/char_fox_cream.png'),
  'fox_gray': require('../../assets/pixel/char_fox_gray.png'),
  'fox_orange': require('../../assets/pixel/char_fox_orange.png'),
  'fox_pink': require('../../assets/pixel/char_fox_pink.png'),
  'fox_white': require('../../assets/pixel/char_fox_white.png'),
  'fox_blue': require('../../assets/pixel/char_fox_blue.png'),
  'fox_purple': require('../../assets/pixel/char_fox_purple.png'),
  'fox_mint': require('../../assets/pixel/char_fox_mint.png'),
};

export const HAT_IMAGES: Record<string, number> = {
  hardhat: require('../../assets/pixel/hat_hardhat.png'),
  crown: require('../../assets/pixel/hat_crown.png'),
  bow: require('../../assets/pixel/hat_bow.png'),
  cap: require('../../assets/pixel/hat_cap.png'),
};

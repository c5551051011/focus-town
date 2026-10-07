export type Session = {
  id: string;
  startedAt: number;
  minutes: number;
  success: boolean;
  tag?: string; // 집중 모드 (예전 기록에는 없을 수 있음)
  group?: boolean; // 그룹 세션 여부
  building?: string; // 그룹에서 내구성에 따라 정해진 건물 (없으면 시간으로 정함)
  members?: number; // 그룹 인원
  durability?: number; // 그룹 건물의 마지막 내구성(%). 마을 지도에서도 같은 모양으로 보여준다
};

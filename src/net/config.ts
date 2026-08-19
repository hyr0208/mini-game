/** 각 기기가 서버에 접속할 WebSocket 주소 */
export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `ws://${typeof location !== 'undefined' ? location.hostname : 'localhost'}:8787`;

/** 호스트가 라운드 시작 시각을 서버 기준 시각으로 예약할 때, 얼마나 여유를 두고 예약할지 (ms) */
export const START_LEAD_MS = 3000;

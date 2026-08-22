/**
 * 아두이노 LED 제어
 *
 * Electron 의 preload 가 노출한 window.kiosk 를 통해 시리얼로 번호를 보낸다.
 * 브라우저에서 그냥 띄웠을 때(window.kiosk 없음)는 조용히 무시한다.
 */
export function setLed(value) {
  window.kiosk?.setLed?.(value);
}

/** 전체 끄기 */
export function clearLed() {
  setLed(0);
}

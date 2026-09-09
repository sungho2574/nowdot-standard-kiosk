// 렌더러(React)에서 시리얼을 직접 다룰 수 없으므로 필요한 것만 노출한다
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiosk', {
  /** LED 번호를 아두이노로 보낸다. 0 이면 전체 기본색 */
  setLed: (value) => ipcRenderer.invoke('led:set', value),

  /** LED 전체 점등 여부를 켜고 끈다 */
  setLedPower: (enabled) => ipcRenderer.invoke('led:power', enabled),

  /** 눌렸을 때의 LED 색을 바꾼다 (RRGGBB 16진수 문자열) */
  setLedColor: (hex) => ipcRenderer.invoke('led:color', hex),

  /** 평소(기본) LED 색을 바꾼다 (RRGGBB 16진수 문자열) */
  setLedIdleColor: (hex) => ipcRenderer.invoke('led:idle', hex),

  /**
   * 아두이노가 부팅을 마쳤을 때 호출된다. 해제 함수를 돌려준다.
   * 아두이노는 연결될 때마다 리셋되어 기본값으로 돌아가므로,
   * 이 시점에 현재 설정을 다시 보내야 한다.
   */
  onLedReady: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('led:ready', handler);
    return () => ipcRenderer.off('led:ready', handler);
  },
});

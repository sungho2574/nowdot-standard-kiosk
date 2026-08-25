// 렌더러(React)에서 시리얼을 직접 다룰 수 없으므로 필요한 것만 노출한다
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiosk', {
  /** LED 번호를 아두이노로 보낸다. 0 이면 전체 기본색 */
  setLed: (value) => ipcRenderer.invoke('led:set', value),

  /** LED 전체 점등 여부를 켜고 끈다 */
  setLedPower: (enabled) => ipcRenderer.invoke('led:power', enabled),
});

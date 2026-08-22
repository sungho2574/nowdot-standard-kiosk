// 렌더러(React)에서 시리얼을 직접 다룰 수 없으므로 필요한 것만 노출한다
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiosk', {
  /** LED 번호를 아두이노로 보낸다. 0 이면 전체 끄기 */
  setLed: (value) => ipcRenderer.invoke('led:set', value),
});

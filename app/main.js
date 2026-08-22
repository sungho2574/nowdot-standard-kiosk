import { BrowserWindow, app, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SerialPort } from 'serialport';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 사용자 조작 없이도 영상이 자동 재생되도록 허용
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

/* ------------------------------------------------------------------ */
/* 시리얼 (아두이노 LED 제어)                                          */
/* ------------------------------------------------------------------ */

const BAUD_RATE = 9600;
const RECONNECT_DELAY = 3000;

// 포트를 고정하려면 여기에 적으세요. (예: 'COM3')
// 비워두면 연결된 아두이노를 자동으로 찾습니다.
const SERIAL_PORT_PATH = '';

// 아두이노 계열에서 흔히 쓰이는 USB-시리얼 칩의 vendorId
const ARDUINO_VENDOR_IDS = ['2341', '2a03', '1a86', '0403', '10c4'];

let serial = null;
let reconnectTimer = null;

async function resolvePortPath() {
  if (SERIAL_PORT_PATH) return SERIAL_PORT_PATH;

  const ports = await SerialPort.list();
  const matched = ports.find((port) => ARDUINO_VENDOR_IDS.includes((port.vendorId || '').toLowerCase()));
  return matched?.path ?? null;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSerial();
  }, RECONNECT_DELAY);
}

async function connectSerial() {
  try {
    const path = await resolvePortPath();
    if (!path) {
      console.warn('[serial] 아두이노를 찾지 못했습니다. 재시도합니다.');
      scheduleReconnect();
      return;
    }

    const port = new SerialPort({ path, baudRate: BAUD_RATE });

    port.on('open', () => {
      serial = port;
      console.log(`[serial] 연결됨: ${path}`);
    });

    // 아두이노가 보내는 응답("READY", "OK n")을 로그로만 남긴다
    port.on('data', (chunk) => console.log(`[serial] ${chunk.toString().trim()}`));

    port.on('error', (error) => console.error('[serial]', error.message));

    port.on('close', () => {
      serial = null;
      console.warn('[serial] 연결이 끊어졌습니다. 재연결을 시도합니다.');
      scheduleReconnect();
    });
  } catch (error) {
    console.error('[serial]', error.message);
    scheduleReconnect();
  }
}

/** LED 번호 전송. 시리얼이 없어도 앱은 정상 동작해야 하므로 조용히 무시한다 */
function setLed(value) {
  const led = Number(value);
  if (!Number.isInteger(led) || led < 0) return false;

  if (!serial?.isOpen) {
    console.warn(`[serial] 미연결 상태 — LED ${led} 전송 생략`);
    return false;
  }

  serial.write(`${led}\n`, (error) => {
    if (error) console.error('[serial] 전송 실패:', error.message);
  });
  return true;
}

/* ------------------------------------------------------------------ */
/* 앱 창                                                               */
/* ------------------------------------------------------------------ */

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
    },
  });
  win.loadURL('http://localhost:5173/');   // load react app url
  // win.webContents.openDevTools({ mode: 'detach' }) //open dev tools
}

app.whenReady().then(() => {
  ipcMain.handle('led:set', (_event, value) => setLed(value));

  connectSerial();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 종료 전에 LED 를 꺼둔다
app.on('before-quit', () => {
  setLed(0);
  serial?.close();
});

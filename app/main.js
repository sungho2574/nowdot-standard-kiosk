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
let ledPowerOn = true; // 재연결 시 다시 보내려고 마지막 설정을 기억한다
let activeLed = 0;     // 같은 이유로 마지막 LED 번호도 기억한다
let ledColor = null;     // 마지막으로 지정한 눌렸을 때의 색 (RRGGBB)
let ledIdleColor = null; // 마지막으로 지정한 평소 색 (RRGGBB)
let lastSent = null;   // 같은 값을 연달아 보내지 않기 위한 직전 전송값
let mainWindow = null; // READY 를 렌더러에 알리기 위해 창을 들고 있는다
let readyTimer = null; // READY 를 못 받는 경우를 대비한 예비 반영 타이머
let sendQueue = [];    // 아직 내보내지 않은 명령 줄
let sendTimer = null;  // 다음 줄을 내보낼 때까지 기다리는 타이머

// 포트를 열면 아두이노가 리셋되고 부트로더가 이 정도 돈다. 그 사이 보낸 건 버려진다.
const BOOTLOADER_WAIT = 2500;

/**
 * 명령 사이에 두는 간격(ms).
 *
 * 아두이노는 명령을 받으면 LED 를 다시 그리는데, 이때 핀 6개를 합쳐 수십 ms 동안
 * 타이밍을 붙잡고 있어서 그 사이에 도착한 바이트를 놓친다.
 * 실제로 "idle ff0000" 이 앞부분째 잘려 다른 명령으로 해석되는 일이 있었다.
 * 한 줄씩 띄워 보내면 아두이노가 그리기를 끝낸 뒤에 다음 줄을 받는다.
 */
const SEND_GAP = 100;

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

    let received = ''; // 청크가 줄 중간에서 잘리므로 모아서 줄 단위로 처리한다

    port.on('open', () => {
      serial = port;
      console.log(`[serial] 연결됨: ${path}`);

      // 여기서 보낸 건 부트로더 구간이라 버려질 수 있다. 실제 반영은 announceReady() 가 맡는다.
      restoreState();

      // 아두이노가 READY 를 보내지 않는 경우(포트를 열어도 리셋되지 않는 보드 등)를 대비한 예비책
      clearTimeout(readyTimer);
      readyTimer = setTimeout(() => {
        console.log('[serial] 부트로더 대기 시간 경과 — 설정을 다시 반영합니다.');
        announceReady();
      }, BOOTLOADER_WAIT);
    });

    port.on('data', (chunk) => {
      received += chunk.toString();

      const lines = received.split('\n');
      received = lines.pop(); // 마지막 조각은 다음 청크와 이어붙인다

      for (const line of lines.map((item) => item.trim()).filter(Boolean)) {
        console.log(`[serial] < ${line}`);

        // 아두이노가 부팅을 마쳤다는 신호 — 이제부터 명령이 제대로 전달된다
        if (line === 'READY') {
          console.log('[serial] 아두이노 준비 완료 — 마지막 상태를 다시 보냅니다.');
          clearTimeout(readyTimer);
          announceReady();
        }
      }
    });

    port.on('error', (error) => console.error('[serial]', error.message));

    port.on('close', () => {
      serial = null;
      lastSent = null;
      clearQueue();
      console.warn('[serial] 연결이 끊어졌습니다. 재연결을 시도합니다.');
      scheduleReconnect();
    });
  } catch (error) {
    console.error('[serial]', error.message);
    scheduleReconnect();
  }
}

/**
 * 아두이노가 명령을 받을 수 있는 상태가 됐을 때 호출한다.
 * 메인이 아는 값을 보내고, 렌더러에게도 알려 현재 설정을 다시 밀어넣게 한다.
 * (렌더러가 뜨기 전에 READY 가 지나가면 메인은 색을 모르기 때문)
 */
function announceReady() {
  restoreState();
  mainWindow?.webContents.send('led:ready');
}

/** 앱이 들고 있는 마지막 상태를 아두이노에 처음부터 다시 반영한다 */
function restoreState() {
  // 아직 안 나간 예전 명령은 버린다. 지금 상태를 처음부터 다시 쌓을 것이므로.
  clearQueue();
  lastSent = null;
  if (ledIdleColor) setLedIdleColor(ledIdleColor);
  if (ledColor) setLedColor(ledColor);
  setLedPower(ledPowerOn);
  setLed(activeLed);
}

/** 아두이노로 한 줄 전송. 시리얼이 없어도 앱은 정상 동작해야 하므로 조용히 무시한다 */
function send(line) {
  if (!serial?.isOpen) {
    console.warn(`[serial] > ${line} (미연결 상태라 전송 생략)`);
    return false;
  }

  // 같은 값을 연달아 보내봐야 결과가 같으므로 건너뛴다
  if (line === lastSent) {
    console.log(`[serial] > ${line} (직전과 같아 생략)`);
    return true;
  }
  lastSent = line;

  sendQueue.push(line);
  flushQueue();
  return true;
}

/** 큐에 쌓인 명령을 SEND_GAP 간격으로 한 줄씩 내보낸다 */
function flushQueue() {
  if (sendTimer || sendQueue.length === 0) return;

  if (!serial?.isOpen) {
    sendQueue = [];
    return;
  }

  const line = sendQueue.shift();

  console.log(`[serial] > ${line}`);
  serial.write(`${line}\n`, (error) => {
    if (error) console.error('[serial] 전송 실패:', error.message);
  });

  // 방금 보낸 줄을 아두이노가 다 소화할 때까지는 다음 줄을 내보내지 않는다.
  // (큐가 비어 있어도 타이머는 걸어둔다. 바로 뒤에 들어온 명령까지 간격을 지키도록)
  sendTimer = setTimeout(() => {
    sendTimer = null;
    flushQueue();
  }, SEND_GAP);
}

/** 아직 못 내보낸 명령을 버린다 (연결이 끊겼거나 처음부터 다시 보낼 때) */
function clearQueue() {
  // 타이머는 그대로 둔다. 지워버리면 방금 보낸 줄과 간격 없이 붙어 나갈 수 있다.
  sendQueue = [];
}

/** LED 전체 점등 여부 */
function setLedPower(enabled) {
  ledPowerOn = Boolean(enabled);
  return send(ledPowerOn ? 'on' : 'off');
}

/** 눌렸을 때의 LED 색 (RRGGBB 16진수) */
function setLedColor(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]{6}$/.test(hex)) return false;

  ledColor = hex.toLowerCase();
  return send(`color ${ledColor}`);
}

/** 평소(기본) LED 색 (RRGGBB 16진수) */
function setLedIdleColor(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]{6}$/.test(hex)) return false;

  ledIdleColor = hex.toLowerCase();
  return send(`idle ${ledIdleColor}`);
}

/** LED 번호 전송 */
function setLed(value) {
  const led = Number(value);
  if (!Number.isInteger(led) || led < 0) return false;

  activeLed = led;
  return send(String(led));
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
  mainWindow = win;

  // 렌더러(React)의 console 출력을 터미널에서도 볼 수 있게 넘긴다
  win.webContents.on('console-message', (...args) => {
    // Electron 버전에 따라 (event, level, message, ...) 또는 (details) 형태로 온다
    const message = typeof args[2] === 'string' ? args[2] : args[0]?.message;
    if (message) console.log(`[renderer] ${message}`);
  });

  win.loadURL('http://localhost:5173/');   // load react app url
  // win.webContents.openDevTools({ mode: 'detach' }) //open dev tools
}

app.whenReady().then(() => {
  ipcMain.handle('led:set', (_event, value) => setLed(value));
  ipcMain.handle('led:power', (_event, enabled) => setLedPower(enabled));
  ipcMain.handle('led:color', (_event, hex) => setLedColor(hex));
  ipcMain.handle('led:idle', (_event, hex) => setLedIdleColor(hex));

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
  // 큐를 거치면 타이머를 기다리다 못 나가므로 여기서는 곧바로 써넣는다
  clearQueue();

  if (serial?.isOpen) {
    activeLed = 0;
    serial.write('0\n', () => serial?.close());
  }
});

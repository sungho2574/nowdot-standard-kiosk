/**
 * 키오스크 LED 제어 (WS2811)
 *
 * PC(Electron 앱)에서 시리얼로 숫자를 보내면 해당 LED 를 활성 색상으로 바꿉니다.
 *
 *   "1\n" ~ "5\n"  : 해당 번호만 활성 색, 나머지 1~5번은 기본 색
 *   "0\n"          : 1~5번 전부 기본 색 (기본 상태)
 *   "off\n"        : LED 전체 소등 (앱의 설정에서 끈 상태)
 *   "on\n"         : 소등 해제 — 위 규칙대로 다시 켬
 *   "color 8000ff\n" : 활성 색상(영상 재생 중)을 바꿈 (RRGGBB 16진수)
 *   "idle ffffff\n"  : 기본 색상을 바꿈 (RRGGBB 16진수)
 *
 * 6번 LED 는 시리얼 입력과 무관하게 항상 기본 색입니다.
 *
 * ── 배선 ──────────────────────────────────────────────
 *   1~6번 LED 를 각각 디지털 2~7번 핀에 하나씩 연결합니다.
 *   한 핀에 모듈을 여러 개 이어 붙일 수 있고(DOUT > DIN),
 *   그 핀에 달린 모듈은 전부 같은 색으로 켜집니다.
 *
 *   전원 : 외부 어댑터에서 직접 공급 (아두이노 5V 핀 사용 금지)
 *   GND  : 어댑터 GND 와 아두이노 GND 를 반드시 공통으로 연결
 *
 *   0, 1번 핀은 시리얼 통신에 쓰이므로 2번부터 사용합니다.
 *
 * ── 메모리 ────────────────────────────────────────────
 *   픽셀 배열을 두지 않고 showColor() 로 색 하나를 반복 전송합니다.
 *   그래서 모듈을 아무리 많이 달아도 RAM 사용량이 늘지 않습니다.
 *   (구역마다 단색으로 켜는 지금 방식에서만 쓸 수 있는 방법입니다)
 *
 * ── 명령을 놓치지 않기 위한 장치 ──────────────────────
 *   showColor() 는 핀 6개를 합쳐 수십 ms 동안 타이밍을 붙잡습니다.
 *   그 사이에 들어온 시리얼 바이트는 통째로 버려지기 때문에,
 *   명령을 받자마자 LED 를 갱신하면 바로 뒤따라 온 명령이 깨집니다.
 *   ("idle ff0000" 의 앞부분이 잘려 나가는 식)
 *
 *   그래서 명령을 처리할 때는 dirty 표시만 해두고, 시리얼이 조용해진
 *   뒤에 loop() 에서 한 번만 갱신합니다. 연달아 온 명령도 전부 반영됩니다.
 *
 * ── 준비 ──────────────────────────────────────────────
 *   아두이노 IDE > 라이브러리 매니저에서 "FastLED" 설치
 */

// 출력 중에도 시리얼 수신 인터럽트가 돌 수 있게 한다. 타이밍이 어긋난 픽셀은
// FastLED 가 다시 보내므로, 만에 하나 명령이 겹쳐 들어와도 잃지 않는다.
// (반드시 FastLED.h 보다 먼저 정의해야 한다)
#define FASTLED_ALLOW_INTERRUPTS 1
#define FASTLED_INTERRUPT_RETRY_COUNT 1

#include <ctype.h>
#include <FastLED.h>

// 모듈 색 순서. RED 가 다른 색으로 나오면 GRB / RGB 등으로 바꿔보세요.
#define COLOR_ORDER BRG

/** LED 개수 (1~5번 + 항상 켜져 있는 6번) */
const int LED_NUM = 6;

/** 각 LED 가 연결된 핀 — 안내 출력용 (실제 등록은 setup 에서 상수로) */
const int PIN[LED_NUM] = {2, 3, 4, 5, 6, 7};

/**
 * 각 핀으로 내보낼 픽셀 수.
 *
 * 실제 달린 모듈 수보다 많이 보내도 됩니다. 남는 데이터는 체인 끝에서 그냥 버려지므로
 * 개수를 세서 맞출 필요가 없습니다. 넉넉히 잡아두면 모듈을 더 달아도 코드를 안 고쳐도 됩니다.
 *
 * 대신 전송 시간이 개수에 비례합니다. (픽셀당 약 30us, 핀 6개 기준)
 *   200  > 핀당 6ms,  전체 36ms
 *   1000 > 핀당 30ms, 전체 180ms
 *
 * 화면을 누른 순간에만 한 번 전송하므로 180ms 도 문제는 없지만,
 * 반응이 굼뜨게 느껴지면 값을 줄이세요.
 */
const int PIXEL_COUNT = 200;

/** 밝기 (0~255) */
const uint8_t BRIGHTNESS = 200;

/** 활성 색상. 앱에서 "color RRGGBB" 로 바꿀 수 있다 */
CRGB activeColor = CRGB(128, 0, 255); // 기본값 보라색

/** 기본 색상. 앱에서 "idle RRGGBB" 로 바꿀 수 있다 */
CRGB idleColor = CRGB(255, 255, 255); // 기본값 하얀색

// showColor() 는 이 배열을 읽지 않습니다. 등록에 필요해서 자리만 잡아둡니다.
CRGB dummy[1];
CLEDController *ctrl[LED_NUM];

int activeLed = 0;      // 0 = 활성 LED 없음 (전부 기본 색)
bool ledEnabled = true; // false 면 번호와 무관하게 전체 소등

char buf[24];           // String 대신 고정 버퍼를 쓴다 (RAM 절약)
uint8_t bufLen = 0;     // 지금까지 모은 글자 수
bool bufTooLong = false; // 버퍼를 넘긴 줄은 통째로 버린다
bool dirty = false;     // 반영해야 할 변경이 남아 있는가

// 아두이노 IDE 가 자동으로 만들어 주긴 하지만, 참조 인자가 섞이면 놓치는 경우가 있어 직접 적어둔다
void readSerial();
void handleCommand(const char *line);
void ignoreCommand(const char *line);
void replyColor(const __FlashStringHelper *label, const char *hex, const CRGB &color);
bool isNumber(const char *text);
bool parseHex(const char *hex, CRGB &out);
void updateLeds();

void setup() {
  Serial.begin(9600);

  // FastLED 는 핀 번호가 컴파일 타임 상수여야 해서 한 줄씩 등록합니다.
  ctrl[0] = &FastLED.addLeds<WS2811, 2, COLOR_ORDER>(dummy, 1);
  ctrl[1] = &FastLED.addLeds<WS2811, 3, COLOR_ORDER>(dummy, 1);
  ctrl[2] = &FastLED.addLeds<WS2811, 4, COLOR_ORDER>(dummy, 1);
  ctrl[3] = &FastLED.addLeds<WS2811, 5, COLOR_ORDER>(dummy, 1);
  ctrl[4] = &FastLED.addLeds<WS2811, 6, COLOR_ORDER>(dummy, 1);
  ctrl[5] = &FastLED.addLeds<WS2811, 7, COLOR_ORDER>(dummy, 1);

  updateLeds();

  Serial.println(F("READY"));
}

void loop() {
  readSerial();

  // 갱신은 받아 둔 명령을 다 처리한 뒤에 한 번만 한다.
  // (showColor() 가 도는 동안 들어온 명령은 깨질 수 있으므로)
  if (dirty && !Serial.available()) {
    dirty = false;
    updateLeds();
  }
}

/**
 * 시리얼을 줄 단위로 모은다.
 *
 * readBytesUntil() 은 줄이 다 올 때까지 최대 1초를 기다리며 멈춰 있는데,
 * 그 사이에 들어온 다음 명령까지 한 줄로 붙어버리는 일이 있었다.
 * 여기서는 있는 만큼만 읽고 바로 빠져나온다.
 */
void readSerial() {
  while (Serial.available()) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (bufTooLong) {
        Serial.println(F("IGNORED (너무 긴 명령)"));
      } else if (bufLen > 0) {
        buf[bufLen] = '\0';
        handleCommand(buf);
      }

      bufLen = 0;
      bufTooLong = false;
      continue;
    }

    if (bufLen < sizeof(buf) - 1) {
      buf[bufLen++] = c;
    } else {
      bufTooLong = true; // 줄바꿈이 올 때까지 버린다
    }
  }
}

void handleCommand(const char *line) {
  // 전체 소등 / 해제는 숫자보다 먼저 확인한다. ("off" 를 atoi 하면 0 이 되므로)
  if (strcasecmp(line, "on") == 0 || strcasecmp(line, "off") == 0) {
    ledEnabled = (strcasecmp(line, "on") == 0);
    dirty = true;

    Serial.print(F("OK "));
    Serial.println(ledEnabled ? F("ON") : F("OFF"));
    return;
  }

  // 활성 색상: "color RRGGBB"
  if (strncasecmp(line, "color ", 6) == 0) {
    CRGB parsed;
    if (!parseHex(line + 6, parsed)) {
      ignoreCommand(line);
      return;
    }

    activeColor = parsed;
    dirty = true;
    replyColor(F("OK COLOR "), line + 6, parsed);
    return;
  }

  // 기본 색상: "idle RRGGBB"
  if (strncasecmp(line, "idle ", 5) == 0) {
    CRGB parsed;
    if (!parseHex(line + 5, parsed)) {
      ignoreCommand(line);
      return;
    }

    idleColor = parsed;
    dirty = true;
    replyColor(F("OK IDLE "), line + 5, parsed);
    return;
  }

  // 숫자 명령. atoi 는 "dle ff0000" 같은 깨진 문자열도 0 으로 만들어 버리므로,
  // (실제로 이것 때문에 기본 색상 명령이 소등 명령처럼 처리되는 일이 있었다)
  // 숫자로만 이루어져 있는지 먼저 확인한다.
  if (!isNumber(line)) {
    ignoreCommand(line);
    return;
  }

  int value = atoi(line);

  // 6번은 항상 기본 색이므로 앱에서 보내는 번호는 0~5 입니다.
  if (value > LED_NUM - 1) {
    ignoreCommand(line);
    return;
  }

  activeLed = value;
  dirty = true;

  // PC 쪽에서 반영 여부를 확인할 수 있도록 되돌려 준다
  Serial.print(F("OK "));
  Serial.println(activeLed);
}

/** 알아듣지 못한 명령 — 무시했다는 사실을 PC 로그에 남긴다 */
void ignoreCommand(const char *line) {
  Serial.print(F("IGNORED "));
  Serial.println(line);
}

/** 색을 어떻게 해석했는지까지 되돌려 준다 (색 순서 문제를 눈으로 확인하려고) */
void replyColor(const __FlashStringHelper *label, const char *hex, const CRGB &color) {
  Serial.print(label);
  Serial.print(hex);
  Serial.print(F(" -> ("));
  Serial.print(color.r);
  Serial.print(',');
  Serial.print(color.g);
  Serial.print(',');
  Serial.print(color.b);
  Serial.println(')');
}

/** 숫자로만 이루어진 문자열인가 */
bool isNumber(const char *text) {
  if (*text == '\0') return false;

  for (const char *p = text; *p != '\0'; p++) {
    if (!isdigit((unsigned char)*p)) return false;
  }
  return true;
}

/** "8000ff" 같은 6자리 16진수 문자열을 색으로 바꾼다. 형식이 어긋나면 false */
bool parseHex(const char *hex, CRGB &out) {
  for (uint8_t i = 0; i < 6; i++) {
    // 길이가 모자라면 '\0' 에서 걸린다 (버퍼 밖을 읽지 않는다)
    if (!isxdigit((unsigned char)hex[i])) return false;
  }
  if (hex[6] != '\0') return false;

  long rgb = strtol(hex, NULL, 16);
  out = CRGB((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
  return true;
}

void updateLeds() {
  for (int i = 0; i < LED_NUM; i++) {
    CRGB color;

    if (!ledEnabled) {
      // 설정에서 꺼둔 상태면 번호와 무관하게 전부 소등
      color = CRGB::Black;
    } else {
      // 마지막 6번은 시리얼 입력과 무관하게 언제나 기본 색
      bool isLast = (i == LED_NUM - 1);
      bool active = !isLast && (i == activeLed - 1);
      color = active ? activeColor : idleColor;
    }

    // 픽셀 배열 없이 색 하나를 PIXEL_COUNT 만큼 반복 전송한다
    ctrl[i]->showColor(color, PIXEL_COUNT, BRIGHTNESS);
  }
}

/**
 * 키오스크 LED 제어 (WS2811)
 *
 * PC(Electron 앱)에서 시리얼로 숫자를 보내면 해당 LED 를 보라색으로 바꿉니다.
 *
 *   "1\n" ~ "5\n"  : 해당 번호만 보라색, 나머지 1~5번은 하얀색
 *   "0\n"          : 1~5번 전부 하얀색 (기본 상태)
 *   "off\n"        : LED 전체 소등 (앱의 설정에서 끈 상태)
 *   "on\n"         : 소등 해제 — 위 규칙대로 다시 켬
 *
 * 6번 LED 는 시리얼 입력과 무관하게 항상 하얀색입니다.
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
 * ── 준비 ──────────────────────────────────────────────
 *   아두이노 IDE > 라이브러리 매니저에서 "FastLED" 설치
 */

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

/** 눌렸을 때의 색 */
const CRGB ACTIVE_COLOR = CRGB(128, 0, 255); // 보라색

/** 기본 색 */
const CRGB IDLE_COLOR = CRGB(255, 255, 255); // 하얀색

// showColor() 는 이 배열을 읽지 않습니다. 등록에 필요해서 자리만 잡아둡니다.
CRGB dummy[1];
CLEDController *ctrl[LED_NUM];

int activeLed = 0;      // 0 = 보라색인 LED 없음 (전부 기본 색)
bool ledEnabled = true; // false 면 번호와 무관하게 전체 소등

char buf[16]; // String 대신 고정 버퍼를 쓴다 (RAM 절약)

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
  serialHandler();
}

void serialHandler() {
  if (!Serial.available()) return;

  int length = Serial.readBytesUntil('\n', buf, sizeof(buf) - 1);
  buf[length] = '\0';
  if (length == 0) return;

  // 캐리지 리턴 등 꼬리 문자를 잘라낸다
  while (length > 0 && buf[length - 1] <= ' ') {
    buf[--length] = '\0';
  }
  if (length == 0) return;

  // 전체 소등 / 해제는 숫자보다 먼저 확인한다. ("off" 를 atoi 하면 0 이 되므로)
  if (strcasecmp(buf, "on") == 0 || strcasecmp(buf, "off") == 0) {
    ledEnabled = (strcasecmp(buf, "on") == 0);
    updateLeds();

    Serial.print(F("OK "));
    Serial.println(ledEnabled ? F("ON") : F("OFF"));
    return;
  }

  int value = atoi(buf);

  // 6번은 항상 하얀색이므로 앱에서 보내는 번호는 0~5 입니다.
  if (value < 0 || value > LED_NUM - 1) {
    Serial.print(F("IGNORED "));
    Serial.println(buf);
    return;
  }

  activeLed = value;
  updateLeds();

  // PC 쪽에서 반영 여부를 확인할 수 있도록 되돌려 준다
  Serial.print(F("OK "));
  Serial.println(activeLed);
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
      color = active ? ACTIVE_COLOR : IDLE_COLOR;
    }

    // 픽셀 배열 없이 색 하나를 PIXEL_COUNT 만큼 반복 전송한다
    ctrl[i]->showColor(color, PIXEL_COUNT, BRIGHTNESS);
  }
}

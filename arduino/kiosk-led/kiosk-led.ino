/**
 * 키오스크 LED 제어 (WS2811)
 *
 * PC(Electron 앱)에서 시리얼로 숫자를 보내면 해당 LED 를 보라색으로 바꿉니다.
 *
 *   "1\n" ~ "5\n"  : 해당 번호만 보라색, 나머지 1~5번은 하얀색
 *   "0\n"          : 1~5번 전부 하얀색 (기본 상태)
 *
 * 6번 LED 는 시리얼 입력과 무관하게 항상 하얀색입니다.
 *
 * ── 배선 ──────────────────────────────────────────────
 *   WS2811 은 데이터선 한 가닥에 모든 LED 를 줄줄이(데이지체인) 연결합니다.
 *   핀을 LED 개수만큼 쓰는 방식이 아닙니다.
 *
 *   아두이노 DATA_PIN ──> 1번 모듈 DIN
 *                         1번 모듈 DOUT ──> 2번 모듈 DIN ──> ...
 *
 *   전원 : 외부 어댑터에서 직접 공급 (아두이노 5V 핀 사용 금지)
 *   GND  : 어댑터 GND 와 아두이노 GND 를 반드시 공통으로 연결
 *
 *   데이터선에 330Ω 직렬 저항, 전원단에 1000uF 커패시터를 넣으면 더 안정적입니다.
 *
 * ── 준비 ──────────────────────────────────────────────
 *   아두이노 IDE > 라이브러리 매니저에서 "FastLED" 설치
 *   배선이나 픽셀 수가 헷갈리면 arduino/led-test 를 먼저 올려서 확인하세요.
 */

#include <FastLED.h>

/** 데이터선을 연결한 핀. 0, 1번은 시리얼이 쓰므로 2번부터 사용합니다. */
#define DATA_PIN 2

// 이 모듈은 BRG 순서입니다. (led-test 의 c 로 확인 — RED 가 실제로 빨갛게 나오면 맞음)
#define COLOR_ORDER BRG

/** 제어할 LED 개수 (1~5번 + 항상 켜져 있는 6번) */
const int LED_NUM = 6;

/**
 * LED 하나가 차지하는 픽셀 수.
 * 3구 모듈의 3개가 각각 따로 제어되면 1, 3개가 한 덩이로 움직이면 3 입니다.
 * led-test 의 s(순차 점등) 로 확인할 수 있습니다.
 */
const int PIXELS_PER_LED = 1;

const int PIXEL_NUM = LED_NUM * PIXELS_PER_LED;

/** 밝기 (0~255) */
const uint8_t BRIGHTNESS = 200;

/** 눌렸을 때의 색 */
const CRGB ACTIVE_COLOR = CRGB(128, 0, 255); // 보라색

/** 기본 색 */
const CRGB IDLE_COLOR = CRGB(255, 255, 255); // 하얀색

CRGB leds[PIXEL_NUM];

int activeLed = 0; // 0 = 보라색인 LED 없음 (전부 기본 색)

void setup() {
  Serial.begin(9600);

  FastLED.addLeds<WS2811, DATA_PIN, COLOR_ORDER>(leds, PIXEL_NUM);
  FastLED.setBrightness(BRIGHTNESS);
  updateLeds();

  Serial.println("READY");
}

void loop() {
  serialHandler();
}

void serialHandler() {
  if (!Serial.available()) return;

  // 개행까지 한 줄을 읽는다
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  int value = line.toInt();

  // 6번은 항상 하얀색이므로 앱에서 보내는 번호는 0~5 입니다.
  if (value < 0 || value > LED_NUM - 1) {
    Serial.print("IGNORED ");
    Serial.println(line);
    return;
  }

  activeLed = value;
  updateLeds();

  // PC 쪽에서 반영 여부를 확인할 수 있도록 되돌려 준다
  Serial.print("OK ");
  Serial.println(activeLed);
}

void updateLeds() {
  for (int i = 0; i < LED_NUM; i++) {
    // 마지막 6번은 시리얼 입력과 무관하게 언제나 기본 색
    bool isLast = (i == LED_NUM - 1);
    bool active = !isLast && (i == activeLed - 1);

    fill_solid(&leds[i * PIXELS_PER_LED], PIXELS_PER_LED, active ? ACTIVE_COLOR : IDLE_COLOR);
  }

  FastLED.show();
}

/**
 * 키오스크 LED 제어 (WS2811)
 *
 * PC(Electron 앱)에서 시리얼로 숫자를 보내면 해당 구역의 LED 를 보라색으로
 * 켭니다.
 *
 *   "1\n" ~ "5\n"  : 해당 번호 구역만 켜고 나머지는 끔
 *   "0\n"          : 전체 끔
 *
 * 영상이 재생되면 그 번호를, 영상이 끝나거나 홈으로 돌아오면 0 을 받습니다.
 * 한 번에 한 구역만 켜지므로 이전 구역을 따로 꺼줄 필요가 없습니다.
 *
 * ── 배선 ──────────────────────────────────────────────
 *   LED 전원  : 외부 어댑터에서 직접 공급 (아두이노 5V 핀 사용 금지)
 *   LED 데이터: 아두이노 DATA_PIN → 스트립 DIN
 *   GND       : 어댑터 GND 와 아두이노 GND 를 반드시 공통으로 연결
 *
 * ── 준비 ──────────────────────────────────────────────
 *   아두이노 IDE > 라이브러리 매니저에서 "FastLED" 설치
 */

#include <FastLED.h>

#define DATA_PIN 6
#define LED_TYPE WS2811

// WS2811 은 보통 RGB 순서입니다. 색이 다르게 나오면 GRB / BRG 로 바꿔보세요.
#define COLOR_ORDER RGB

/** 스트립에 연결된 전체 픽셀 수 */
const int PIXEL_NUM = 15;

/** 밝기 (0~255) */
const uint8_t BRIGHTNESS = 200;

/** 켜질 색 — 보라색 */
const CRGB ON_COLOR = CRGB(128, 0, 255);

/**
 * 구역별 픽셀 범위. 1번 구역부터 순서대로 { 시작 픽셀, 개수 } 입니다.
 * 실제 배선에 맞게 수정하세요.
 */
const int ZONE_NUM = 5;
const int ZONE_START[ZONE_NUM] = {0, 3, 6, 9, 12};
const int ZONE_COUNT[ZONE_NUM] = {3, 3, 3, 3, 3};

CRGB leds[PIXEL_NUM];

int currentZone = 0;  // 0 = 전부 꺼짐

void setup() {
  Serial.begin(9600);

  FastLED.addLeds<LED_TYPE, DATA_PIN, COLOR_ORDER>(leds, PIXEL_NUM);
  FastLED.setBrightness(BRIGHTNESS);
  updateLeds();

  Serial.println("READY");
}

void loop() { serialHandler(); }

void serialHandler() {
  if (!Serial.available()) return;

  // 개행까지 한 줄을 읽는다
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  int value = line.toInt();
  if (value < 0 || value > ZONE_NUM) {
    Serial.print("IGNORED ");
    Serial.println(line);
    return;
  }

  currentZone = value;
  updateLeds();

  // PC 쪽에서 반영 여부를 확인할 수 있도록 되돌려 준다
  Serial.print("OK ");
  Serial.println(currentZone);
}

void updateLeds() {
  fill_solid(leds, PIXEL_NUM, CRGB::Black);

  if (currentZone >= 1 && currentZone <= ZONE_NUM) {
    int start = ZONE_START[currentZone - 1];
    int count = ZONE_COUNT[currentZone - 1];

    for (int i = start; i < start + count && i < PIXEL_NUM; i++) {
      leds[i] = ON_COLOR;
    }
  }

  FastLED.show();
}

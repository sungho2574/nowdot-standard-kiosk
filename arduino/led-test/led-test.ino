/**
 * LED 배선 확인용 테스트 (WS2811)
 *
 * 시리얼 모니터에서 번호를 입력하면 해당 LED 만 켜집니다.
 * 픽셀이 몇 개인지, 어떤 순서로 이어져 있는지 확인할 때 사용하세요.
 *
 * ── 사용법 ────────────────────────────────────────────
 *   아두이노 IDE > 툴 > 시리얼 모니터 (속도 9600, 줄 끝 "새 줄")
 *
 *   1 ~ 12 : 해당 픽셀만 보라색으로 켜고 나머지는 끔
 *   0      : 전부 끔
 *   w      : 전부 하얀색으로 켬
 *   s      : 1번 픽셀부터 하나씩 순서대로 훑는다
 *            > 실제 픽셀이 몇 개인지, 어느 쪽이 1번인지 눈으로 확인할 수 있음
 *   c      : 켜져 있는 색을 빨강 > 초록 > 파랑 순으로 바꿈
 *            > RED 를 눌렀는데 다른 색이 나오면 COLOR_ORDER 를 고쳐야 함
 *
 * ── 배선 ──────────────────────────────────────────────
 *   아두이노 DATA_PIN ──> 1번 모듈 DIN
 *                         1번 모듈 DOUT ──> 2번 모듈 DIN ──> ...
 *
 *   전원은 외부 어댑터에서 직접 공급하고,
 *   어댑터 GND 와 아두이노 GND 는 반드시 공통으로 연결하세요.
 */

#include <FastLED.h>

#define DATA_PIN 2

// 이 모듈은 BRG 순서입니다. (c 명령으로 확인 — RED 가 실제로 빨갛게 나오면 맞음)
#define COLOR_ORDER BRG

/** 실제보다 넉넉하게 잡아두면 몇 개까지 켜지는지 확인할 수 있습니다. */
const int PIXEL_NUM = 12;

const uint8_t BRIGHTNESS = 200;
const int SWEEP_DELAY = 400; // s 명령의 픽셀당 점등 시간 (ms)

CRGB leds[PIXEL_NUM];

int selected = 0;      // 0 = 꺼짐, 1~PIXEL_NUM = 해당 픽셀
bool allWhite = false; // w 명령으로 전체 점등한 상태인지

// c 명령으로 순환시킬 색
const CRGB CHECK_COLORS[] = {CRGB(255, 0, 0), CRGB(0, 255, 0), CRGB(0, 0, 255)};
const char *CHECK_NAMES[] = {"RED", "GREEN", "BLUE"};
int checkIndex = -1; // -1 이면 기본 보라색

void setup() {
  Serial.begin(9600);

  FastLED.addLeds<WS2811, DATA_PIN, COLOR_ORDER>(leds, PIXEL_NUM);
  FastLED.setBrightness(BRIGHTNESS);
  updateLeds();

  printHelp();
}

void loop() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  char command = line.charAt(0);

  if (command == 'w' || command == 'W') {
    allWhite = true;
    selected = 0;
    Serial.println("전체 하얀색");
  } else if (command == 's' || command == 'S') {
    sweep();
    return;
  } else if (command == 'c' || command == 'C') {
    checkIndex = (checkIndex + 1) % 3;
    Serial.print("색 확인: ");
    Serial.println(CHECK_NAMES[checkIndex]);
  } else if (command >= '0' && command <= '9') {
    int value = line.toInt();
    if (value < 0 || value > PIXEL_NUM) {
      Serial.print("0 ~ ");
      Serial.print(PIXEL_NUM);
      Serial.println(" 사이의 번호를 입력하세요.");
      return;
    }
    selected = value;
    allWhite = false;
    if (selected == 0) {
      Serial.println("전부 끔");
    } else {
      Serial.print("픽셀 ");
      Serial.print(selected);
      Serial.println("번 켬");
    }
  } else {
    printHelp();
    return;
  }

  updateLeds();
}

/** 1번 픽셀부터 하나씩 훑어서 실제 픽셀 수와 순서를 확인한다 */
void sweep() {
  Serial.println("순차 점등 시작 — 켜지는 순서와 개수를 확인하세요.");

  for (int i = 0; i < PIXEL_NUM; i++) {
    fill_solid(leds, PIXEL_NUM, CRGB::Black);
    leds[i] = CRGB(128, 0, 255);
    FastLED.show();

    Serial.print("  픽셀 ");
    Serial.println(i + 1);
    delay(SWEEP_DELAY);
  }

  Serial.println("순차 점등 끝");
  updateLeds();
}

void updateLeds() {
  CRGB onColor = (checkIndex >= 0) ? CHECK_COLORS[checkIndex] : CRGB(128, 0, 255);

  fill_solid(leds, PIXEL_NUM, CRGB::Black);

  if (allWhite) {
    fill_solid(leds, PIXEL_NUM, CRGB(255, 255, 255));
  } else if (selected >= 1 && selected <= PIXEL_NUM) {
    leds[selected - 1] = onColor;
  }

  FastLED.show();
}

void printHelp() {
  Serial.println();
  Serial.println("=== LED 테스트 ===");
  Serial.print("  1 ~ ");
  Serial.print(PIXEL_NUM);
  Serial.println(" : 해당 픽셀만 켜기");
  Serial.println("  0      : 전부 끄기");
  Serial.println("  w      : 전부 하얀색");
  Serial.println("  s      : 순차 점등 (픽셀 수와 순서 확인)");
  Serial.println("  c      : 색 확인 (RED > GREEN > BLUE)");
}

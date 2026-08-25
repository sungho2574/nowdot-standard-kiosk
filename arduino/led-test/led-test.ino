/**
 * LED 배선 확인용 테스트 (WS2811) — 핀 6개 방식
 *
 * 1~6번 LED 를 각각 디지털 2~7번 핀에 연결해두고,
 * 시리얼 모니터에서 번호를 입력해 해당 LED 만 켜봅니다.
 *
 *   LED 1 > 2번 핀      LED 4 > 5번 핀
 *   LED 2 > 3번 핀      LED 5 > 6번 핀
 *   LED 3 > 4번 핀      LED 6 > 7번 핀
 *
 * ── 사용법 ────────────────────────────────────────────
 *   아두이노 IDE > 툴 > 시리얼 모니터 (속도 9600, 줄 끝 "새 줄")
 *
 *   1 ~ 6  : 해당 LED 만 보라색으로 켜고 나머지는 끔
 *   0      : 전부 끔
 *   w      : 전부 하얀색으로 켬
 *   s      : 1번부터 하나씩 순서대로 훑는다
 *            > 어느 핀이 어느 LED 에 연결됐는지 눈으로 확인
 *   c      : 켜져 있는 색을 빨강 > 초록 > 파랑 순으로 바꿈
 *            > RED 가 실제로 빨갛게 나오면 COLOR_ORDER 가 맞는 것
 *
 * ── 배선 ──────────────────────────────────────────────
 *   실제 키오스크 스케치(kiosk-led)와 동일합니다.
 *   전원은 외부 어댑터에서 직접 공급하고,
 *   어댑터 GND 와 아두이노 GND 는 반드시 공통으로 연결하세요.
 *
 * ── 메모리 ────────────────────────────────────────────
 *   픽셀 배열 없이 showColor() 로 색 하나를 반복 전송하므로,
 *   모듈을 아무리 많이 달아도 RAM 사용량이 늘지 않습니다.
 */

#include <FastLED.h>

// 모듈 색 순서. RED 가 다른 색으로 나오면 GRB / RGB 등으로 바꿔보세요.
#define COLOR_ORDER BRG

const int LED_NUM = 6;

/** 각 LED 가 연결된 핀 — 안내 출력용 */
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

const uint8_t BRIGHTNESS = 200;
const int SWEEP_DELAY = 500; // s 명령의 LED 당 점등 시간 (ms)

const CRGB PURPLE = CRGB(128, 0, 255);
const CRGB WHITE = CRGB(255, 255, 255);

// showColor() 는 이 배열을 읽지 않습니다. 등록에 필요해서 자리만 잡아둡니다.
CRGB dummy[1];
CLEDController *ctrl[LED_NUM];

int selected = 0;      // 0 = 꺼짐, 1~6 = 해당 LED
bool allWhite = false; // w 명령으로 전체 점등한 상태인지

// c 명령으로 순환시킬 색
const CRGB CHECK_COLORS[] = {CRGB(255, 0, 0), CRGB(0, 255, 0), CRGB(0, 0, 255)};
int checkIndex = -1; // -1 이면 기본 보라색

char buf[16];

void setup() {
  Serial.begin(9600);

  ctrl[0] = &FastLED.addLeds<WS2811, 2, COLOR_ORDER>(dummy, 1);
  ctrl[1] = &FastLED.addLeds<WS2811, 3, COLOR_ORDER>(dummy, 1);
  ctrl[2] = &FastLED.addLeds<WS2811, 4, COLOR_ORDER>(dummy, 1);
  ctrl[3] = &FastLED.addLeds<WS2811, 5, COLOR_ORDER>(dummy, 1);
  ctrl[4] = &FastLED.addLeds<WS2811, 6, COLOR_ORDER>(dummy, 1);
  ctrl[5] = &FastLED.addLeds<WS2811, 7, COLOR_ORDER>(dummy, 1);

  updateLeds();
  printHelp();
}

void loop() {
  if (!Serial.available()) return;

  int length = Serial.readBytesUntil('\n', buf, sizeof(buf) - 1);
  buf[length] = '\0';
  while (length > 0 && buf[length - 1] <= ' ') {
    buf[--length] = '\0';
  }
  if (length == 0) return;

  char command = buf[0];

  if (command == 'w' || command == 'W') {
    allWhite = true;
    selected = 0;
    Serial.println(F("전체 하얀색"));
  } else if (command == 's' || command == 'S') {
    sweep();
    return;
  } else if (command == 'c' || command == 'C') {
    checkIndex = (checkIndex + 1) % 3;
    Serial.print(F("색 확인: "));
    Serial.println(checkIndex == 0 ? F("RED") : (checkIndex == 1 ? F("GREEN") : F("BLUE")));
  } else if (command >= '0' && command <= '9') {
    int value = atoi(buf);
    if (value < 0 || value > LED_NUM) {
      Serial.print(F("0 ~ "));
      Serial.print(LED_NUM);
      Serial.println(F(" 사이의 번호를 입력하세요."));
      return;
    }
    selected = value;
    allWhite = false;
    if (selected == 0) {
      Serial.println(F("전부 끔"));
    } else {
      Serial.print(F("LED "));
      Serial.print(selected);
      Serial.print(F(" 켬 (디지털 "));
      Serial.print(PIN[selected - 1]);
      Serial.println(F("번 핀)"));
    }
  } else {
    printHelp();
    return;
  }

  updateLeds();
}

/** 1번부터 하나씩 훑어서 핀과 LED 의 대응을 확인한다 */
void sweep() {
  Serial.println(F("순차 점등 시작 — 켜지는 순서를 확인하세요."));

  for (int i = 0; i < LED_NUM; i++) {
    for (int j = 0; j < LED_NUM; j++) {
      ctrl[j]->showColor((i == j) ? PURPLE : CRGB::Black, PIXEL_COUNT, BRIGHTNESS);
    }

    Serial.print(F("  LED "));
    Serial.print(i + 1);
    Serial.print(F(" (디지털 "));
    Serial.print(PIN[i]);
    Serial.println(F("번 핀)"));
    delay(SWEEP_DELAY);
  }

  Serial.println(F("순차 점등 끝"));
  updateLeds();
}

void updateLeds() {
  CRGB onColor = (checkIndex >= 0) ? CHECK_COLORS[checkIndex] : PURPLE;

  for (int i = 0; i < LED_NUM; i++) {
    CRGB color = CRGB::Black;
    if (allWhite) {
      color = WHITE;
    } else if (i == selected - 1) {
      color = onColor;
    }
    ctrl[i]->showColor(color, PIXEL_COUNT, BRIGHTNESS);
  }
}

void printHelp() {
  Serial.println();
  Serial.println(F("=== LED 테스트 (핀 6개) ==="));
  Serial.println(F("  1 ~ 6 : 해당 LED 만 켜기 (디지털 2 ~ 7번 핀)"));
  Serial.println(F("  0     : 전부 끄기"));
  Serial.println(F("  w     : 전부 하얀색"));
  Serial.println(F("  s     : 순차 점등 (핀-LED 대응 확인)"));
  Serial.println(F("  c     : 색 확인 (RED > GREEN > BLUE)"));
}

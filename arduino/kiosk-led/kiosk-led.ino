/**
 * 키오스크 LED 제어
 *
 * PC(Electron 앱)에서 시리얼로 숫자를 보내면 해당 LED 를 켜고 끕니다.
 *
 *   "1\n" ~ "5\n"  : 해당 번호의 LED 만 켜고 나머지는 끔
 *   "0\n"          : 전체 끔
 *
 * 영상이 재생되면 그 번호를, 영상이 끝나거나 홈으로 돌아오면 0 을 받습니다.
 * 한 번에 하나만 켜지므로 이전 LED 를 따로 꺼줄 필요가 없습니다.
 */

const int LED_NUM = 5;

// LED(릴레이) 출력 핀 — 1번 LED 부터 순서대로
const int RELAY_PIN[LED_NUM] = {13, 12, 11, 10, 9};

// 릴레이 모듈이 LOW 에서 켜지는 타입이면 true 로 바꾸세요
const bool ACTIVE_LOW = false;

int currentLed = 0; // 0 = 전부 꺼짐

void setup() {
  Serial.begin(9600);

  for (int i = 0; i < LED_NUM; i++) {
    pinMode(RELAY_PIN[i], OUTPUT);
  }
  updateRelay();

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
  if (value < 0 || value > LED_NUM) {
    Serial.print("IGNORED ");
    Serial.println(line);
    return;
  }

  currentLed = value;
  updateRelay();

  // PC 쪽에서 반영 여부를 확인할 수 있도록 되돌려 준다
  Serial.print("OK ");
  Serial.println(currentLed);
}

void updateRelay() {
  for (int i = 0; i < LED_NUM; i++) {
    bool on = (currentLed == i + 1);
    digitalWrite(RELAY_PIN[i], (on != ACTIVE_LOW) ? HIGH : LOW);
  }
}

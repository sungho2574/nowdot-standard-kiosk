import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";

import Button from "src/components/Button";
import { setLedPower, setLedColor } from "src/lib/led";

const COLOR_KEY = "ledColor";
const DEFAULT_COLOR = "8000ff"; // 보라색

export default function Settings() {
  const [open, setOpen] = useState(false);
  // 앱을 켤 때는 항상 켜진 상태로 시작한다 (아두이노도 리셋되면 켜진 상태이므로 서로 어긋나지 않는다)
  const [ledOn, setLedOn] = useState(true);
  const [color, setColor] = useState(() => localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR);

  // 상태가 바뀔 때마다 아두이노에 반영한다 (첫 렌더에서도 실행되어 초기 상태를 맞춘다)
  useEffect(() => {
    setLedPower(ledOn);
  }, [ledOn]);

  // 색상 피커는 고르는 동안 값이 계속 바뀌므로, 잠시 멈췄을 때만 전송한다
  useEffect(() => {
    const timer = setTimeout(() => {
      setLedColor(color);
      localStorage.setItem(COLOR_KEY, color);
    }, 150);

    return () => clearTimeout(timer);
  }, [color]);

  const handleToggle = () => setLedOn((prev) => !prev);

  return (
    <div className="fixed right-2 bottom-2 flex flex-col items-end gap-3 p-3" onClick={(event) => event.stopPropagation()}>
      {open && (
        <div className="flex w-[20vw] flex-col gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-black shadow-lg">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[1vw] font-medium whitespace-nowrap">LED 전체</span>

            <button
              type="button"
              role="switch"
              aria-checked={ledOn}
              aria-label="LED 전체 켜기/끄기"
              onClick={handleToggle}
              className={`relative h-[1.7vw] w-[3.2vw] shrink-0 rounded-full transition-colors ${ledOn ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-1/2 h-[1.3vw] w-[1.3vw] -translate-y-1/2 rounded-full bg-white shadow transition-all ${
                  ledOn ? "left-[1.7vw]" : "left-[0.2vw]"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-6 border-t border-gray-200 pt-3">
            <span className="text-[1vw] font-medium whitespace-nowrap">색상</span>

            <div className="flex items-center gap-3">
              <span className="w-[4.5vw] text-right text-[0.9vw] whitespace-nowrap text-gray-500 tabular-nums">#{color}</span>

              <input
                type="color"
                aria-label="LED 색상 선택"
                value={`#${color}`}
                onChange={(event) => setColor(event.target.value.slice(1))}
                className="h-[2vw] w-[3.2vw] cursor-pointer rounded-lg border border-gray-300 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-[0.2vw] [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
              />
            </div>
          </div>
        </div>
      )}

      <Button onClick={() => setOpen((prev) => !prev)}>
        <SettingsIcon size={20} />
      </Button>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";

import Button from "src/components/Button";
import { setLedPower, setLedColor, setLedIdleColor } from "src/lib/led";

const COLOR_KEY = "ledColor";
const IDLE_COLOR_KEY = "ledIdleColor";

const DEFAULT_COLOR = "8000ff"; // 활성 색상 — 보라색
const DEFAULT_IDLE_COLOR = "ffffff"; // 기본 색상 — 하얀색

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-[1vw] font-medium whitespace-nowrap">{label}</span>

      <div className="flex items-center gap-3">
        <span className="w-[4.5vw] text-right text-[0.9vw] whitespace-nowrap text-gray-500 tabular-nums">#{value}</span>

        <input
          type="color"
          aria-label={`${label} 선택`}
          value={`#${value}`}
          onChange={(event) => onChange(event.target.value.slice(1))}
          className="h-[2vw] w-[3.2vw] cursor-pointer rounded-lg border border-gray-300 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-[0.2vw] [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
        />
      </div>
    </div>
  );
}

export default function Settings() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  // 앱을 켤 때는 항상 켜진 상태로 시작한다 (아두이노도 리셋되면 켜진 상태이므로 서로 어긋나지 않는다)
  const [ledOn, setLedOn] = useState(true);
  const [color, setColor] = useState(() => localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR);
  const [idleColor, setIdleColor] = useState(() => localStorage.getItem(IDLE_COLOR_KEY) || DEFAULT_IDLE_COLOR);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setLedIdleColor(idleColor);
      localStorage.setItem(IDLE_COLOR_KEY, idleColor);
    }, 150);

    return () => clearTimeout(timer);
  }, [idleColor]);

  // 설정 밖을 누르면 닫는다. 톱니바퀴 버튼도 이 안에 있으므로 여닫기는 그대로 동작한다.
  useEffect(() => {
    if (!open) return;

    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    // 터치와 마우스를 함께 받기 위해 pointerdown 을 쓴다
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  const handleToggle = () => setLedOn((prev) => !prev);

  return (
    <div ref={rootRef} className="fixed right-2 bottom-2 flex flex-col items-end gap-3 p-3" onClick={(event) => event.stopPropagation()}>
      {open && (
        <div className="flex w-[20vw] flex-col gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-black shadow-lg">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[1vw] font-medium whitespace-nowrap">전체 ON/OFF</span>

            <button
              type="button"
              role="switch"
              aria-checked={ledOn}
              aria-label="전체 ON/OFF"
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

          <div className="flex flex-col gap-3 border-t border-gray-200 pt-3">
            <ColorRow label="기본 색상" value={idleColor} onChange={setIdleColor} />
            <ColorRow label="활성 색상" value={color} onChange={setColor} />
          </div>
        </div>
      )}

      <Button onClick={() => setOpen((prev) => !prev)}>
        <SettingsIcon size={20} />
      </Button>
    </div>
  );
}

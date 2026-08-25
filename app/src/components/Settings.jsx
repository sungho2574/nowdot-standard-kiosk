import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";

import Button from "src/components/Button";
import { setLedPower } from "src/lib/led";

export default function Settings() {
  const [open, setOpen] = useState(false);
  // 앱을 켤 때는 항상 켜진 상태로 시작한다 (아두이노도 리셋되면 켜진 상태이므로 서로 어긋나지 않는다)
  const [ledOn, setLedOn] = useState(true);

  // 상태가 바뀔 때마다 아두이노에 반영한다 (첫 렌더에서도 실행되어 초기 상태를 맞춘다)
  useEffect(() => {
    setLedPower(ledOn);
  }, [ledOn]);

  const handleToggle = () => setLedOn((prev) => !prev);

  return (
    <div className="fixed right-2 bottom-2 flex flex-col items-end gap-3 p-3" onClick={(event) => event.stopPropagation()}>
      {open && (
        <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 py-4 text-black shadow-lg">
          <span className="text-[1vw] font-medium">LED 전체</span>

          <button
            type="button"
            role="switch"
            aria-checked={ledOn}
            aria-label="LED 전체 켜기/끄기"
            onClick={handleToggle}
            className={`relative h-[1.7vw] w-[3.2vw] shrink-0 rounded-full transition-colors ${ledOn ? "bg-purple-500" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-1/2 h-[1.3vw] w-[1.3vw] -translate-y-1/2 rounded-full bg-white shadow transition-all ${
                ledOn ? "left-[1.7vw]" : "left-[0.2vw]"
              }`}
            />
          </button>
        </div>
      )}

      <Button onClick={() => setOpen((prev) => !prev)}>
        <SettingsIcon size={20} />
      </Button>
    </div>
  );
}

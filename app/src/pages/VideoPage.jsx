import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef } from "react";
import { Home } from "lucide-react";

import Button from "src/components/Button";
import { TOUCH_AREAS } from "src/config/touchAreas";
import { setLed, clearLed } from "src/lib/led";

export default function VideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const area = TOUCH_AREAS.find((item) => String(item.id) === id);

  const goHome = useCallback(() => navigate("/", { replace: true }), [navigate]);

  useEffect(() => {
    // 잘못된 id 로 들어온 경우 홈으로
    if (!area) {
      goHome();
      return;
    }

    // 영상이 켜지면 해당 LED 도 켠다
    setLed(area.id);

    // 자동재생이 막힌 경우에도 키오스크가 멈추지 않도록 처리
    videoRef.current?.play().catch(() => {});

    // 영상 종료 / 홈 버튼 / 그 외 어떤 이유로 벗어나든 LED 를 끈다
    return () => clearLed();
  }, [area, goHome]);

  if (!area) return null;

  return (
    <div className="h-screen w-screen bg-black">
      <video
        ref={videoRef}
        src={area.video}
        autoPlay
        playsInline
        className="h-screen w-screen object-contain"
        onEnded={goHome}
        onError={goHome}
      />
      <div className="fixed right-2 bottom-2 p-3">
        <Button onClick={goHome}>
          <Home size={20} />
        </Button>
      </div>
    </div>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Home } from "lucide-react";

import Button from "src/components/Button";
import { TOUCH_AREAS } from "src/config/touchAreas";

export default function VideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);

  const area = TOUCH_AREAS.find((item) => String(item.id) === id);

  const goHome = useCallback(() => navigate("/", { replace: true }), [navigate]);

  // LED 는 경로를 보고 App 의 LedSync 가 처리한다
  useEffect(() => {
    // 잘못된 id 로 들어온 경우 홈으로
    if (!area) {
      goHome();
      return;
    }

    // 자동재생이 막힌 경우에도 키오스크가 멈추지 않도록 처리
    videoRef.current?.play().catch(() => {});
  }, [area, goHome]);

  if (!area) return null;

  return (
    <div className="h-screen w-screen bg-black">
      {/*
        영상 파일이 없으면 홈으로 튕기지 않고 이 화면에 머문다.
        LED 점등을 확인할 수 있도록 한 것이며, 홈 버튼으로 빠져나온다.
      */}
      <video
        ref={videoRef}
        src={area.video}
        autoPlay
        playsInline
        className="h-screen w-screen object-contain"
        onEnded={goHome}
        onError={() => setFailed(true)}
      />

      {failed && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-2 text-white">
          <p className="text-[1.6vw] font-medium">영상을 불러올 수 없습니다</p>
          <p className="text-[1.1vw] text-white/60">{area.video}</p>
        </div>
      )}

      <div className="fixed right-2 bottom-2 p-3">
        <Button onClick={goHome}>
          <Home size={20} />
        </Button>
      </div>
    </div>
  );
}

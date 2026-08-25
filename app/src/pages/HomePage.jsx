import { useNavigate } from "react-router-dom";
import { useState } from "react";

import TouchArea from "src/components/TouchArea";
import Settings from "src/components/Settings";
import { TOUCH_AREAS, SHOW_GUIDE } from "src/config/touchAreas";
import bgImage from "src/assets/images/bg.jpeg";

export default function HomePage() {
  const navigate = useNavigate();
  const [guidePoint, setGuidePoint] = useState(null);

  // SHOW_GUIDE 가 true 일 때만 동작 — 클릭 지점의 좌표(%)를 알려준다
  const handleGuideClick = (event) => {
    if (!SHOW_GUIDE) return;
    const x = ((event.clientX / window.innerWidth) * 100).toFixed(1);
    const y = ((event.clientY / window.innerHeight) * 100).toFixed(1);
    setGuidePoint({ x, y });
    console.log(`x: ${x}, y: ${y}`);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }} onClick={handleGuideClick}>
      {/* 펄스 점들이 올라갈 옅은 회색선 — 점보다 먼저 그려서 아래에 깔린다 */}

      {TOUCH_AREAS.map((area) => (
        <TouchArea key={area.id} area={area} onClick={() => navigate(`/video/${area.id}`)} />
      ))}

      <Settings />

      {SHOW_GUIDE && guidePoint && (
        <div className="fixed top-2 left-2 rounded bg-black/80 px-3 py-2 font-mono text-sm text-white">
          x: {guidePoint.x}, y: {guidePoint.y}
        </div>
      )}
    </div>
  );
}

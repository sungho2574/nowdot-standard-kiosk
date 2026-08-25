import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

import HomePage from "src/pages/HomePage";
import VideoPage from "src/pages/VideoPage";
import { setLed } from "src/lib/led";

/**
 * 현재 경로에 맞는 LED 번호를 아두이노에 알린다.
 *
 * 각 페이지의 effect cleanup 에서 끄는 방식은 리마운트마다 불필요한 0 이 나가서
 * (개발 모드 StrictMode 에서는 켜자마자 꺼진다) 경로 하나만 보고 판단하도록 했다.
 * 같은 값이 두 번 나가도 결과가 같으므로 깜빡임이 생기지 않는다.
 */
function LedSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const matched = pathname.match(/^\/video\/(\d+)$/);
    setLed(matched ? Number(matched[1]) : 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <LedSync />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/video/:id" element={<VideoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

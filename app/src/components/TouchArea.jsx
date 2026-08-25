import { MARKER_SIZE, PULSE_SIZE, PULSE_MAX_SIZE, SHOW_GUIDE } from "src/config/touchAreas";

export default function TouchArea({ area, onClick }) {
  const markerSize = `${MARKER_SIZE}vw`;
  const pulseSize = `${PULSE_SIZE}vw`;
  // animate-ping 은 2배 확대로 고정이라, 최대 크기를 지정하려고 배율을 직접 넘긴다
  const pulseScale = PULSE_MAX_SIZE / PULSE_SIZE;

  return (
    <button
      type="button"
      aria-label={area.label}
      onClick={onClick}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full ${
        SHOW_GUIDE ? "border-2 border-dashed border-red-500 bg-red-500/20" : ""
      }`}
      style={{
        left: `${area.x}%`,
        top: `${area.y}%`,
        width: `${area.size}vw`,
        height: `${area.size}vw`,
      }}
    >
      {/* 터치 표시 — 반투명 헤일로가 항상 떠 있고, 그 위로 같은 크기의 펄스가 커지며 사라진다 */}
      <span
        className="pointer-events-none relative flex items-center justify-center"
        style={{ width: pulseSize, height: pulseSize }}
      >
        <span className="absolute inset-0 rounded-full bg-white/30" />
        <span
          className="absolute inset-0 rounded-full bg-white/30 animate-[touch-pulse_2.5s_ease-out_infinite]"
          style={{ "--pulse-scale": pulseScale }}
        />
        <span
          className="relative rounded-full bg-white shadow-[0_0_0.8vw_rgba(255,255,255,0.9)]"
          style={{ width: markerSize, height: markerSize }}
        />
      </span>

      {/* 펄스 아래 라벨 — 펄스의 중심 위치가 밀리지 않도록 absolute 로 배치 */}
      {area.label && (
        <span
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[1.1vw] font-medium text-white [text-shadow:0_0_0.4vw_rgba(0,0,0,0.7)]"
          style={{ top: `calc(50% + ${PULSE_SIZE * 0.6}vw)` }}
        >
          {area.label}
        </span>
      )}
    </button>
  );
}

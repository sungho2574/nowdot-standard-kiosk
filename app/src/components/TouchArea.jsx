import { MARKER_SIZE, SHOW_GUIDE } from "src/config/touchAreas";

export default function TouchArea({ area, onClick }) {
  const markerSize = `${MARKER_SIZE}vw`;
  const callout = area.callout;

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
      {/* 공장 요소를 가리키는 지시선 — 점에서 오른쪽으로, 다시 위로 꺾인 뒤 동그라미 */}
      {callout && (
        <span className="pointer-events-none absolute inset-0">
          <span
            className="absolute top-1/2 left-1/2 h-[2px] -translate-y-1/2 bg-neutral-300/60"
            style={{ width: `${callout.right}vw` }}
          />
          <span
            className="absolute bottom-1/2 w-[2px] -translate-x-1/2 bg-neutral-300/60"
            style={{ left: `calc(50% + ${callout.right}vw)`, height: `${callout.up}vw` }}
          />
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{
              left: `calc(50% + ${callout.right}vw)`,
              top: `calc(50% - ${callout.up}vw)`,
              width: `${callout.circle}vw`,
              height: `${callout.circle}vw`,
            }}
          />
        </span>
      )}

      {/* 커지면서 연해지는 하얀색 펄스 표시 */}
      <span className="pointer-events-none relative block" style={{ width: markerSize, height: markerSize }}>
        <span className="absolute inset-0 animate-ping rounded-full bg-white [animation-duration:2.5s]" />
        <span className="absolute inset-0 animate-ping rounded-full bg-white [animation-delay:1.25s] [animation-duration:2.5s]" />
        <span className="absolute inset-0 rounded-full bg-white shadow-[0_0_0.8vw_rgba(255,255,255,0.9)]" />
      </span>

      {/* 펄스 아래 라벨 — 펄스의 중심 위치가 밀리지 않도록 absolute 로 배치 */}
      {area.label && (
        <span
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[1.1vw] font-medium text-white [text-shadow:0_0_0.4vw_rgba(0,0,0,0.7)]"
          style={{ top: `calc(50% + ${MARKER_SIZE}vw)` }}
        >
          {area.label}
        </span>
      )}
    </button>
  );
}

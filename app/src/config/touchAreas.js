/**
 * 터치 영역 설정
 *
 * x, y  : 화면 기준 터치 영역의 "중심" 좌표 (%). 좌상단이 0,0 / 우하단이 100,100
 * size  : 터치 영역(원)의 지름 (vw 단위 = 화면 너비 기준 %)
 * video : 재생할 영상 경로 (app/public 폴더 기준)
 * label : 펄스 표시 아래에 하얀 글씨로 표시되는 텍스트 (빈 문자열이면 표시 안 함)
 *
 * callout : (선택) 공장 요소 하나를 가리키는 지시선. 없으면 그리지 않습니다.
 *           점에서 오른쪽으로 뻗었다가 위로 꺾이고, 그 끝에 하얀 동그라미를 그립니다.
 *           선 색·두께는 기다란 회색선과 동일합니다.
 *   right  : 오른쪽으로 뻗는 길이 (vw)
 *   up     : 거기서 위로 뻗는 길이 (vw)
 *   circle : 선 끝 하얀 동그라미의 지름 (vw)
 */
export const TOUCH_AREAS = [
  {
    id: 1, label: "분리막 부착", x: 15, y: 37, size: 9, video: "/videos/1.mp4"
  },
  { id: 2, label: "Dry Cell 조립", x: 27, y: 45, size: 9, video: "/videos/2.mp4" },
  {
    id: 3, label: "액체전극 주액", x: 50, y: 61, size: 9, video: "/videos/3.mp4"
  },
  {
    id: 4, label: "Cell Sealing", x: 60, y: 68, size: 9, video: "/videos/4.mp4",
    callout: { right: 3, up: 5, circle: 0.5 }
  },
  {
    id: 5, label: "Cell 배출", x: 80, y: 82, size: 9, video: "/videos/5.mp4"
  },
];

/** 펄스 터치 표시(하얀 점)의 지름 (vw 단위). 터치 영역보다 작게 유지 */
export const MARKER_SIZE = 0.8;

/**
 * 펄스 점들이 올라갈 옅은 회색선.
 * 꼭짓점을 순서대로 나열합니다. (2개면 직선, 3개 이상이면 그만큼 꺾인 선)
 * 좌표 기준은 터치 영역과 동일합니다. 빈 배열이면 선을 그리지 않습니다.
 */
export const LINE_POINTS = [
  { x: 15, y: 37 },
  { x: 80, y: 82 },
];

/**
 * 좌표를 맞출 때 true 로 바꾸면
 * - 터치 영역이 빨간 점선으로 표시되고
 * - 배경을 클릭하면 그 지점의 x, y (%) 값이 화면 좌상단과 콘솔에 출력됩니다.
 * 좌표를 다 맞춘 뒤에는 반드시 false 로 되돌려 주세요.
 */
export const SHOW_GUIDE = false;

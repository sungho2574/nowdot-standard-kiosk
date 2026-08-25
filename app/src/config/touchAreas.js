/**
 * 터치 영역 설정
 *
 * x, y  : 화면 기준 터치 영역의 "중심" 좌표 (%). 좌상단이 0,0 / 우하단이 100,100
 * size  : 터치 영역(원)의 지름 (vw 단위 = 화면 너비 기준 %)
 * video : 재생할 영상 경로 (app/public 폴더 기준)
 * label : 펄스 표시 아래에 하얀 글씨로 표시되는 텍스트 (빈 문자열이면 표시 안 함)
 */
export const TOUCH_AREAS = [
  {
    id: 1, label: "", x: 6.7, y: 55.85, size: 9, video: "/videos/1.mp4"
  },
  { id: 2, label: "", x: 22.7, y: 58.9, size: 9, video: "/videos/2.mp4" },
  {
    id: 3, label: "", x: 54.6, y: 64.6, size: 9, video: "/videos/3.mp4"
  },
  {
    id: 4, label: "", x: 65.2, y: 66.6, size: 9, video: "/videos/4.mp4"
  },
  {
    id: 5, label: "", x: 91.05, y: 71.3, size: 9, video: "/videos/5.mp4"
  },
];

/** 가운데 하얀 점의 지름 (vw 단위) */
export const MARKER_SIZE = 0.7;

/**
 * 펄스의 기본 지름 (vw 단위).
 * 아무 일도 없을 때 반투명하게 이 크기로 떠 있습니다.
 */
export const PULSE_SIZE = 1.2;

/**
 * 펄스가 최대로 커지는 지름 (vw 단위).
 * PULSE_SIZE 에서 시작해 이 크기까지 커지면서 사라집니다.
 */
export const PULSE_MAX_SIZE = 2;

/**
 * 좌표를 맞출 때 true 로 바꾸면
 * - 터치 영역이 빨간 점선으로 표시되고
 * - 배경을 클릭하면 그 지점의 x, y (%) 값이 화면 좌상단과 콘솔에 출력됩니다.
 * 좌표를 다 맞춘 뒤에는 반드시 false 로 되돌려 주세요.
 */
export const SHOW_GUIDE = false;

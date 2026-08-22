# standard energy kiosk

- 배경 이미지 위의 터치 영역을 누르면 해당 영상이 재생되는 키오스크용 데스크탑 애플리케이션입니다.
- Vite 기반의 React 앱을 Electron으로 감싸 데스크탑 애플리케이션으로 배포할 수 있도록 구성됩니다.

## 기술 스택

- `React`
- `tailwindcss`
- `Electron`

## 동작 방식

1. 홈 화면에 `bg.png` 가 전체 화면으로 표시됩니다.
2. 배경 위 5개의 터치 영역에는 하얀색 펄스 표시가 나타납니다. (실제 터치 영역은 이 표시보다 넓습니다)
3. 터치 영역을 누르면 해당 영상이 전체 화면으로 재생되고, 시리얼로 번호를 보내 해당 LED 를 보라색으로 켭니다.
4. 영상이 끝나면 자동으로 홈 화면으로 돌아오고 LED 도 꺼집니다.
5. 재생 중에는 우측 하단의 작은 홈 버튼으로 언제든 홈 화면으로 돌아올 수 있습니다.

## 프로젝트 구조

```
nowdot-standard-kiosk/
├── app/                      # 데스크탑 앱
│   ├── public/
│   │   └── videos/              # 재생할 영상 파일 (1.mp4 ~ 5.mp4)
│   ├── src/                     # React 소스코드
│   │   ├── assets/                  # 정적 파일 (배경 이미지, 폰트 등)
│   │   ├── components/              # 공통 컴포넌트
│   │   ├── config/                  # 터치 영역 좌표 설정
│   │   ├── pages/                   # 페이지 컴포넌트
│   │   └── main.jsx                 # React 앱 진입점
│   ├── main.js                  # Electron 메인 프로세스 진입점
│   └── preload.cjs              # 렌더러에 시리얼 기능을 노출
├── arduino/                  # LED 제어
│   └── kiosk-led/               # WS2811 스케치 (배선·설정은 파일 상단 주석 참고)
└── startup/                  # 부팅 설정
```

## 실행 방법

1. React 개발 서버 실행
   ```powershell
   npm run dev
   ```
2. Electron 환경 실행
   ```powershell
   npm run electron
   ```

두 개를 한 번에 실행하려면 `npm run service` 를 사용합니다.

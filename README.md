# 🏔️ 아트밸리 보물찾기 (Art Valley Treasure Hunt)

**포천아트밸리**의 인터랙티브 보물찾기 게임 프로젝트입니다. 아트밸리 곳곳에 숨겨진 QR 마커를 찾아 스캔하고, 보물을 모두 모아 특별한 인증서를 획득하는 모바일 웹 어플리케이션입니다.

---

## ✨ 핵심 기능 (Features)

- **QR 스캔 시스템**: 별도의 앱 설치 없이 웹 브라우저만으로 보물 마커(QR)를 즉시 스캔합니다.
- **수집 도감**: 발견한 보물을 실시간으로 확인하고, 수집 현황을 프로그레스 바로 추적합니다.
- **인증서 발급**: 5개의 보물을 모두 찾으면 보물상자가 열리며, 본인의 이름을 넣은 맞춤형 인증서를 이미지로 저장할 수 있습니다.
- **데이터 영속성**: 브라우저의 `localStorage`를 사용하여 게임 진행 도중 창을 닫아도 데이터가 유지됩니다.
- **관리자 도구**: `admin.html`을 통해 10개의 QR 마커를 일괄 생성하고 인쇄용 레이아웃을 제공하며, 현장에서 게임 데이터를 초기화할 수 있습니다.

---

## 📂 폴더 구조 (Project Structure)

```text
.
├── index.html              # 메인 게임 어플리케이션
├── admin.html              # 관리자용 QR 생성 및 설정 페이지
├── app.js                  # 게임 로직 및 스캔 처리 (Vanilla JS)
├── style.css               # 프로젝트 스타일시트 (Responsive Mobile UI)
├── assets/                 # 마스코트 이미지 및 사운드 리소스
└── 보물찾기_planing         # 프로젝트 기획 및 청사진 문서
```

---

## 🛠️ 기술 사양 (Tech Stack)

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Libraries**:
  - [html5-qrcode](https://github.com/mebjas/html5-qrcode): 고성능 카메라 기반 QR 스캔
  - [canvas-confetti](https://github.com/catdad/canvas-confetti): 축하 파티클 효과
  - [html2canvas](https://github.com/niklasvh/html2canvas): 인증서 이미지 저장 기능
- **Hosting**: GitHub Pages (정적 호스팅)

---

## 🚀 시작하기 (How to Run)

1. 이 저장소를 클론하거나 다운로드합니다.
2. `index.html`을 모바일 브라우저(Safari, Chrome 권장)에서 엽니다.
3. 최초 스캔 시 카메라 권한을 허용합니다.
4. 아트밸리 곳곳에 배치된 10개의 마커 중 5개를 찾아 스캔하여 보물을 수집하세요!

---

## 📝 관리자 가이드

1. `admin.html`에 접속하면 게임 운영에 필요한 **보물 마커(QR)**를 생성할 수 있습니다.
2. 생성된 마커는 A4 용지에 최적화된 레이아웃으로 출력하여 현장에 배치하세요.
3. 운영 중 데이터 리셋이 필요할 경우, `index.html` 하단의 '데이터 초기화' 버튼을 사용하세요.

---

> 본 프로젝트는 포천아트밸리 마스코트(캐티, 래비, 도기)의 공식 이미지를 활용하여 제작되었습니다.

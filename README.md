# 🍉 수박 합치기 (Suika Merge) PWA

귀여운 과일을 떨어뜨려 같은 과일끼리 합치고, 점점 커지는 과일들 속에서 최종 수박을 만드는 물리 기반 퍼즐 게임입니다.

- 10단계 과일 진화: 블루베리 → 수박
- 난이도 상승: 초반에는 작은 과일이 많이 나오고, 점수가 올라갈수록 더 큰 과일이 등장합니다.
- PWA: 핸드폰 홈 화면에 설치해서 풀스크린으로 플레이할 수 있습니다.
- Web Push: 새 기록이나 이벤트를 푸시 알림으로 받을 수 있습니다.
- Neon + Vercel: 서버리스 데이터베이스와 호스팅으로 손쉽게 배포합니다.

## 🎮 게임 방법

1. 화면 상단을 터치/드래그해서 과일을 좌우로 이동합니다.
2. 터치를 떼면 과일이 떨어집니다.
3. 같은 종류의 과일이 부딪히면 더 큰 과일로 합쳐집니다.
4. 과일이 빨간 위험선을 넘지 않도록 조심하세요!

## 🚀 배포 가이드 (Vercel + Neon)

### 1. 데이터베이스 (Neon)

1. [Neon](https://neon.tech)에서 새 프로젝트를 만듭니다.
2. PostgreSQL 연결 문자열(DATABASE_URL)을 복사합니다.

### 2. 푸시 알림 키 생성

```bash
npx web-push generate-vapid-keys
```

생성된 **Public Key**와 **Private Key**를 환경 변수에 저장합니다.  
`VAPID_SUBJECT`는 본인의 이메일(`mailto:your@email.com`)로 설정합니다.

### 3. Vercel 배포

1. 이 저장소를 GitHub에 업로드합니다.
2. [Vercel](https://vercel.com)에서 GitHub 저장소를 임포트합니다.
3. 아래 환경 변수를 설정합니다.

```env
DATABASE_URL=postgresql://...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your@email.com
PUSH_SECRET=아무_강력한_문자열
```

4. `npx drizzle-kit push`를 한 번 실행해서 테이블을 생성합니다.

### 4. PWA 설치

- **Android/Chrome**: 주소창의 "홈 화면에 추가"를 선택합니다.
- **iOS/Safari**: 공유 버튼 → "홈 화면에 추가"를 선택합니다.

## 📦 소스 코드 다운로드

앱 내 "소스 코드 다운로드" 버튼을 누륾면 GitHub에 직접 업로드할 수 있는 ZIP 파일을 받을 수 있습니다.

## 🛠 로컬 개발

```bash
npm install
# .env 파일에 DATABASE_URL 등을 설정
npx drizzle-kit push
npm run dev
```

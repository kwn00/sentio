# Sentio

브라우저 음성 인식으로 한국어 발언을 받아 JEV로 표현된 반응을 추정하는 모바일 우선 웹앱입니다.

## 실행

Node.js 20.9 이상을 사용하세요.

```sh
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`의 `TYPESAFE_API_KEY`에 TypeSafe에서 발급한 키를 설정하세요. 브라우저에 키를 노출하지 않는 Next.js Route Handler(`/api/analyze`)가 JEV를 호출합니다. 키가 없으면 자막과 체험 모드는 동작하며, 실제 분석에는 준비 중 안내가 표시됩니다.

## 구성

- Next.js App Router, React, TypeScript
- CSS 반응형 디자인, Lucide 아이콘
- 브라우저 `SpeechRecognition` / `webkitSpeechRecognition`
- 서버리스 Route Handler 한 개, TypeSafe REST API
- DB, 계정, 외부 STT, 상태 관리 라이브러리 없음

정적 export는 API 함수를 실행할 수 없으므로 사용하지 않습니다. Vercel 등 Next.js 서버리스 런타임에서 배포하고 서버 환경변수에 `TYPESAFE_API_KEY`, 선택적으로 `TYPESAFE_MODEL`을 설정하세요. 로컬에서는 localhost, 다른 기기에서는 HTTPS가 필요합니다.

공개 서비스로 확장할 때 배포 플랫폼의 WAF/rate limit 및 지출 한도를 설정하세요. API는 같은 출처 검사·본문 크기 제한·입력 검증·시간 제한을 적용하지만, 사용자 인증이나 분산 요청 제한은 포함하지 않습니다. 동일 출처 검사만으로 직접 HTTP 호출을 막을 수는 없습니다. 개인 검증 단계에서는 배포 플랫폼의 접근 제한 사용을 권장합니다.

## 동작과 제한

- 한국어 인식, 중간 자막, 확정 발언별 분석(최근 8개 발언).
- 짧은 중단은 최대 3회 재시도. 권한/네트워크 오류는 명시적으로 표시.
- 화면을 벗어나면 음성 인식을 중단. 사용자 동작으로 재개.
- 모든 브라우저/OS에서 내장 STT의 실제 동작을 보장하지 않습니다. iOS Chrome 및 Safari/Siri 설정 조합은 실제 기기에서 검증해야 합니다.
- 음성 인식이 없는 환경에서는 수동 텍스트 입력 가능.
- 체험 모드는 미리 작성한 데이터이며 실제 분석과 구분해 표시.
- 대화는 메모리에만 유지하고 새로고침 시 사라집니다. 음성은 브라우저 제공업체, 텍스트는 JEV로 전송될 수 있습니다. 서버는 대화/응답을 로깅하거나 DB에 저장하지 않습니다. 제공업체의 자체 데이터 처리 정책은 별도로 적용됩니다.
- 화자 식별, 억양 분석, 원격 회의 앱 오디오 수집은 포함하지 않습니다.
- JEV의 모델 확신도는 실제 기분을 맞힐 확률이 아닙니다. 확신도가 낮으면 판단을 보류합니다.
- Google Fonts에서 DM Sans 및 Noto Sans KR을 불러오며 네트워크가 없으면 시스템 글꼴을 사용합니다.

## 검증

```sh
npm run typecheck
npm run build
npm test
```

자동 테스트는 API 입력 제한, 키 미설정 상태와 서버 렌더링을 검증합니다. 체험 모드, 수동 입력, 반응형 레이아웃은 브라우저에서 확인합니다. 이 검증은 실제 마이크/브라우저 제공업체의 STT 테스트를 대체하지 않습니다.

실기기 체크: Android Chrome, iPhone Safari/Chrome, macOS Chrome/Safari, Windows Chrome에서 권한 허용·거절, 한국어 30분 수음, 장시간 무음, 전화 수신, 화면 잠금, 네트워크 복구를 확인하세요. JEV 키 등록 후 한국어 회의 샘플의 정확도와 실제 지연을 따로 측정해야 합니다.

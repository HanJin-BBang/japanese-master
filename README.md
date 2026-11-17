# 일본어 마스터 PWA

갤럭시탭 S9 울트라 S펜을 위한 히라가나 학습 웹앱.

## 기능
- 기본 히라가나 46자 읽기/쓰기
- Pointer Events 기반 S펜 필기 (압력 반영)
- Web Speech API 일본어 발음
- 4지선다 퀴즈, 진도 저장, JSON 백업/복원
- 서비스 워커 오프라인 캐시

## 배포
GitHub 저장소 Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save.
배포 주소: https://hanjin-bbang.github.io/japanese-master/

## 주의
필기 자동 판정은 지원하지 않습니다. 발음은 기기의 일본어 TTS 음성 지원에 의존합니다. 학습 진도는 해당 기기의 브라우저 저장소에 저장됩니다.

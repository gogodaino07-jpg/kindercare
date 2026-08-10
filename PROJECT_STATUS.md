# 🚀 Kindercare 프로젝트 작업 현황 (인수인계 노트)

이 파일은 다음 작업 시 AI 어시스턴트가 이전 맥락을 즉시 파악하기 위해 작성되었습니다.

## 📌 현재 앱 상태
- **버전**: `v1.0.6` (VersionCode: `5`)
- **개인정보 처리방침**: [https://gogodaino07-jpg.github.io/kindercare/privacy.html](https://gogodaino07-jpg.github.io/kindercare/privacy.html)
- **최근 UI 수정**: 
    - 홈 화면 '준비물 챙기기' 및 '다가오는 일정' 섹션 상시 노출로 변경.
    - 오후 10시 안내 배너 삭제.
    - 하단 쿠팡 배너와의 겹침 방지를 위해 카드 높이 축소 완료.

## 🔐 보안 및 마켓 빌드 설정
- **출시용 키스토어**: `android/app/my-release-key.keystore`
    - **별칭(Alias)**: `my-key-alias`
    - **비밀번호**: `kindercare123`
- **보안 설정**: R8(코드 난독화) 활성화됨, 불필요한 권한(마이크, 연락처) 제거됨.
- **빌드 명령어**: `cd android && ./gradlew bundleRelease`

## ⚠️ 해결 중이던 이슈 (로그인 문제)
- **현상**: 내부 테스트 버전에서 구글 로그인이 작동하지 않음.
- **원인**: 구글 플레이 앱 서명 키의 SHA-1 지문이 Firebase에 등록되지 않음.
- **다음 할 일**: 
    1. 구글 플레이 콘솔 -> [설정] -> [앱 무결성] -> [앱 서명] 탭에서 **SHA-1 지문** 복사.
    2. Firebase 콘솔 -> [프로젝트 설정] -> [지문 추가]에 해당 값 등록.
    3. 약 5~10분 후 로그인 재확인.

---
💡 **다음에 저를 부르실 때**: 
"루트 폴더의 **PROJECT_STATUS.md** 읽고 마켓 빌드 작업 이어서 하자"라고 말씀해 주세요!

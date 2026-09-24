// 앱 프로세스가 살아있는 동안 홈 광고 팝업은 한 번만 시도한다. 컴포넌트 스코프
// ref로 관리하면 AI 스캔 후 홈으로 돌아오면서 화면이 다시 마운트될 때마다
// 광고가 또 뜨는 문제가 있어, 모듈 스코프(진짜 콜드 스타트에서만 리셋)로 관리.
// 단, 회원탈퇴/계정 전환으로 온보딩부터 다시 시작하는 경우엔 앱을 끄지 않아도
// 새 가입자로 보고 다시 띄울 수 있게 resetHomeAdPopupSession()으로 풀어준다.
let attempted = false;

export function hasAttemptedHomeAdPopup(): boolean {
  return attempted;
}

export function markHomeAdPopupAttempted(): void {
  attempted = true;
}

export function resetHomeAdPopupSession(): void {
  attempted = false;
}

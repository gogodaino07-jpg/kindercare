# TrafficWatch (로컬 VpnService 트래픽 관측)

Android `VpnService`로 로컬 VPN 터널을 만들고, 터널을 지나가는 패킷에서
**목적지 호스트(도메인)만** 뽑아 로그와 화면에 실시간으로 보여주는 최소 실행 가능 앱.

## 구성

| 파일 | 역할 |
| --- | --- |
| `MainActivity.kt` | Compose 메인 화면. `VpnService.prepare()` 동의 화면 요청, 시작/중지 버튼, `LazyColumn` 호스트 목록 |
| `LocalVpnService.kt` | `VpnService` 상속. tun 인터페이스 생성 + 패킷 읽기 루프 + 포그라운드 알림 |
| `PacketParser.kt` | raw IP 패킷에서 호스트 이름 추출 (DNS QNAME / TLS SNI / HTTP Host) |
| `HostLog.kt` | 관측된 호스트를 담는 메모리 저장소(`StateFlow`) |

## 호스트를 뽑아내는 지점

페이로드 복호화는 하지 않고, 평문으로 노출되는 세 군데만 파싱한다.

- **DNS** — UDP 53으로 나가는 질의의 QNAME
- **SNI** — TCP 443 TLS `ClientHello`의 `server_name` 확장
- **HTTP** — TCP 80 평문 요청의 `Host:` 헤더

## 중요한 제약

읽은 패킷을 바깥으로 **중계(forwarding)하지 않는다.** VPN이 켜져 있는 동안은
실제 통신이 되지 않고, "어떤 호스트로 나가려 했는지"만 관측된다.
(앱들이 재시도하면서 DNS/ClientHello를 계속 내보내므로 호스트 목록은 정상적으로 채워진다.)

실제 통신까지 살리려면 tun ↔ 소켓 릴레이(`protect()`로 보호한 소켓으로 패킷 중계)를
별도로 구현해야 한다.

또한 IPv6 확장 헤더는 처리하지 않으며, 라우팅은 IPv4(`0.0.0.0/0`)만 잡는다.

## 빌드

Android Studio로 `vpn-capture/` 폴더를 열거나, CLI에서:

```bash
cd vpn-capture
./gradlew assembleRelease      # 산출물: app/build/outputs/apk/release/app-release.apk
```

release 빌드는 별도 키스토어 설정 없이 바로 설치해볼 수 있도록 디버그 키로 서명한다.

설치 후 실행:

1. **VPN 시작** 버튼 → 시스템 VPN 연결 요청 동의
2. 다른 앱에서 통신 발생 → 화면 목록과 `adb logcat -s TrafficWatch`에 호스트가 찍힌다
3. **VPN 중지** 버튼으로 터널 해제

> 참고: 이 폴더는 kindercare(Expo) 앱과 무관한 독립 Gradle 프로젝트다.

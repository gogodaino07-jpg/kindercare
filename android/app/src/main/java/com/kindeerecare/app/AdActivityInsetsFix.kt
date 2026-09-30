package com.kindeerecare.app

import android.app.Activity
import android.app.Application
import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * AdMob 전면광고 화면(AdActivity) 하단이 내비게이션 바에 가려지는 문제 보정.
 *
 * targetSdk 36부터는 모든 화면이 강제로 edge-to-edge(시스템 바 뒤까지 그림)라서, AdMob SDK가
 * 위쪽 상태바 여백은 챙기지만 아래 3버튼 내비게이션 바 여백은 챙기지 않아 광고 하단의
 * 앱 이름/설치 버튼 줄이 바 뒤로 들어갔다. AdActivity는 SDK 소유라 직접 못 고치므로,
 * 화면이 뜰 때 콘텐츠 루트에 내비게이션 바 높이만큼 하단(좌우) 패딩을 넣는다.
 */
object AdActivityInsetsFix : Application.ActivityLifecycleCallbacks {
  private const val AD_ACTIVITY = "com.google.android.gms.ads.AdActivity"

  fun register(app: Application) {
    app.registerActivityLifecycleCallbacks(this)
  }

  // onCreate 시점엔 SDK가 아직 창 기능을 설정 중일 수 있어서(decor를 먼저 만들면
  // requestFeature 크래시 위험) 콘텐츠가 붙은 뒤인 onStart에서 적용한다.
  override fun onActivityStarted(activity: Activity) {
    if (activity.javaClass.name != AD_ACTIVITY) return
    val content = activity.findViewById<View>(android.R.id.content) ?: return
    // 반투명 테마라 패딩 영역에 뒤쪽 앱 화면이 비치지 않도록 광고 배경과 같은 검정으로 채운다.
    content.setBackgroundColor(Color.BLACK)
    ViewCompat.setOnApplyWindowInsetsListener(content) { v, insets ->
      val nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
      v.setPadding(nav.left, 0, nav.right, nav.bottom)
      insets
    }
    ViewCompat.requestApplyInsets(content)
  }

  override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
  override fun onActivityResumed(activity: Activity) {}
  override fun onActivityPaused(activity: Activity) {}
  override fun onActivityStopped(activity: Activity) {}
  override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
  override fun onActivityDestroyed(activity: Activity) {}
}

package com.kindeerecare.app

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.view.ViewTreeObserver
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.util.WeakHashMap

/**
 * AdMob 전면광고 화면(AdActivity) 하단이 내비게이션 바에 가려지는 문제 보정.
 *
 * targetSdk 36부터는 모든 화면이 강제로 edge-to-edge(시스템 바 뒤까지 그림)라서 광고 하단의
 * 닫기/설치 버튼 줄이 3버튼 내비게이션 바 뒤로 들어갔다. 처음엔 콘텐츠에 바 높이만큼 하단
 * 패딩을 줬지만, 광고 웹페이지가 뷰 크기와 상관없이 전체 화면 높이 기준으로 그려져서 줄어든
 * 만큼 하단이 그대로 잘렸다(실기기 uiautomator로 확인). 그래서 AdActivity가 떠 있는 동안
 * 내비게이션 바를 숨겨 광고가 화면 전체를 쓰게 한다. 바는 스와이프하면 잠깐 나타난다.
 */
object AdActivityInsetsFix : Application.ActivityLifecycleCallbacks {
  private const val AD_ACTIVITY = "com.google.android.gms.ads.AdActivity"
  // 화면 전환 직후 바로 hide()하면 시스템이 반영 안 하는 경우가 있어(홈 내비바 show와 같은
  // 타이밍 경합) 조금 뒤에 한 번 더 건다.
  private const val RETRY_DELAY_MS = 400L
  private val hooked = WeakHashMap<Activity, Boolean>()

  fun register(app: Application) {
    app.registerActivityLifecycleCallbacks(this)
  }

  private fun hideNavBar(activity: Activity) {
    val window = activity.window ?: return
    WindowCompat.getInsetsController(window, window.decorView).apply {
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      hide(WindowInsetsCompat.Type.navigationBars())
    }
  }

  // onCreate 시점엔 SDK가 아직 창 기능을 설정 중일 수 있어서(decor를 먼저 만들면
  // requestFeature 크래시 위험) 콘텐츠가 붙은 뒤인 onStart에서 적용한다.
  override fun onActivityStarted(activity: Activity) {
    if (activity.javaClass.name != AD_ACTIVITY) return
    // onStart는 광고 클릭 후 돌아올 때마다 다시 불리므로 리스너는 한 번만 단다.
    if (hooked.put(activity, true) != null) return
    val decor = activity.window?.decorView ?: return
    // 광고 클릭으로 브라우저/스토어에 다녀오는 등 포커스를 되찾을 때 바가 다시 보이므로 그때마다 숨긴다.
    decor.viewTreeObserver.addOnWindowFocusChangeListener(object : ViewTreeObserver.OnWindowFocusChangeListener {
      override fun onWindowFocusChanged(hasFocus: Boolean) {
        if (activity.isDestroyed) {
          if (decor.viewTreeObserver.isAlive) decor.viewTreeObserver.removeOnWindowFocusChangeListener(this)
          return
        }
        if (hasFocus) hideNavBar(activity)
      }
    })
  }

  override fun onActivityResumed(activity: Activity) {
    if (activity.javaClass.name != AD_ACTIVITY) return
    hideNavBar(activity)
    activity.window?.decorView?.postDelayed({
      if (!activity.isDestroyed) hideNavBar(activity)
    }, RETRY_DELAY_MS)
  }

  override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
  override fun onActivityPaused(activity: Activity) {}
  override fun onActivityStopped(activity: Activity) {}
  override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
  override fun onActivityDestroyed(activity: Activity) {}
}

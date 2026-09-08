package com.kindeerecare.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** JS(utils/homeWidget.ts)가 오늘 준비물 진행률 + 오늘/내일 일정 제목을 JSON 문자열로
 *  넘겨주면 SharedPreferences에 저장하고, 현재 홈 화면에 추가된 위젯이 있으면 바로 갱신한다. */
class HomeWidgetModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "HomeWidgetModule"

  @ReactMethod
  fun updateWidgetData(json: String) {
    val context = reactApplicationContext
    val prefs = context.getSharedPreferences(TodaySummaryWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().putString(TodaySummaryWidgetProvider.KEY_SUMMARY_JSON, json).apply()

    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, TodaySummaryWidgetProvider::class.java))
    if (ids.isNotEmpty()) {
      TodaySummaryWidgetProvider.updateWidgets(context, manager, ids)
    }
  }
}

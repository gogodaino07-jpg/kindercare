package com.kindeerecare.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.kindeerecare.app.MainActivity
import com.kindeerecare.app.R
import org.json.JSONArray
import org.json.JSONObject

/** 홈 화면 위젯 — JS 쪽(utils/homeWidget.ts)이 HomeWidgetModule을 통해 써준
 *  SharedPreferences의 요약 데이터를 읽어 오늘 일정 제목 + 준비물 현황을 보여준다. */
class TodaySummaryWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  companion object {
    const val PREFS_NAME = "widget_data"
    const val KEY_SUMMARY_JSON = "summary_json"

    private fun joinTitles(arr: JSONArray?): String {
      if (arr == null || arr.length() == 0) return ""
      return (0 until arr.length()).joinToString(", ") { arr.optString(it) }
    }

    fun updateWidgets(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val jsonString = prefs.getString(KEY_SUMMARY_JSON, null)

      for (widgetId in appWidgetIds) {
        val views = RemoteViews(context.packageName, R.layout.widget_today_summary)

        var handled = false
        if (jsonString != null) {
          try {
            val json = JSONObject(jsonString)
            val total = json.optInt("totalItems", 0)
            val checked = json.optInt("checkedItems", 0)
            val itemNames = json.optJSONArray("todayItemNames")
            val remaining = itemNames?.length() ?: 0

            val todayTitles = joinTitles(json.optJSONArray("todayTitles"))
            views.setTextViewText(
              R.id.widget_today_line,
              if (todayTitles.isNotEmpty()) "오늘: $todayTitles" else "오늘 등록된 일정이 없어요"
            )

            views.setTextViewText(
              R.id.widget_prep_summary,
              if (total > 0) "준비물 ${checked}/${total}개 완료" else "오늘 챙길 준비물 없어요"
            )

            // 남은 준비물은 최대 2줄까지만 — 1번째 줄엔 항목 이름, 남은 게 3개 이상이면
            // 2번째 줄은 실제 항목 대신 "+N개 더"로 요약해서 위젯 높이가 늘어나지 않게 한다.
            if (remaining == 0) {
              views.setViewVisibility(R.id.widget_item_1, View.GONE)
              views.setViewVisibility(R.id.widget_item_2, View.GONE)
            } else {
              views.setViewVisibility(R.id.widget_item_1, View.VISIBLE)
              views.setTextViewText(R.id.widget_item_1, "• ${itemNames!!.optString(0)}")
              when {
                remaining == 1 -> views.setViewVisibility(R.id.widget_item_2, View.GONE)
                remaining == 2 -> {
                  views.setViewVisibility(R.id.widget_item_2, View.VISIBLE)
                  views.setTextViewText(R.id.widget_item_2, "• ${itemNames.optString(1)}")
                }
                else -> {
                  views.setViewVisibility(R.id.widget_item_2, View.VISIBLE)
                  views.setTextViewText(R.id.widget_item_2, "+ ${remaining - 1}개 더")
                }
              }
            }

            handled = true
          } catch (e: Exception) {
            handled = false
          }
        }

        if (!handled) {
          views.setTextViewText(R.id.widget_today_line, "킨더케어를 열어 확인해주세요")
          views.setTextViewText(R.id.widget_prep_summary, "")
          views.setViewVisibility(R.id.widget_item_1, View.GONE)
          views.setViewVisibility(R.id.widget_item_2, View.GONE)
        }

        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
          context,
          0,
          intent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        appWidgetManager.updateAppWidget(widgetId, views)
      }
    }
  }
}

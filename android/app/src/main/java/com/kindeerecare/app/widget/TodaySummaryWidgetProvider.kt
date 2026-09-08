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
 *  SharedPreferences의 요약 데이터를 읽어 오늘 일정별로 제목 + 그 일정의 준비물을 보여준다. */
class TodaySummaryWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  companion object {
    const val PREFS_NAME = "widget_data"
    const val KEY_SUMMARY_JSON = "summary_json"

    private val TITLE_IDS = intArrayOf(R.id.widget_event_1_title, R.id.widget_event_2_title)
    private val ITEMS_IDS = intArrayOf(R.id.widget_event_1_items, R.id.widget_event_2_items)

    /** 한 일정의 남은 준비물 목록 — 1개면 그대로, 2개 이상이면 "첫 항목 외 N건"으로 요약. */
    private fun buildItemsLine(itemNames: JSONArray?): String? {
      if (itemNames == null || itemNames.length() == 0) return null
      val first = itemNames.optString(0)
      return if (itemNames.length() == 1) "• $first" else "• $first 외 ${itemNames.length() - 1}건"
    }

    private fun clearSlot(views: RemoteViews, index: Int) {
      views.setViewVisibility(TITLE_IDS[index], View.GONE)
      views.setViewVisibility(ITEMS_IDS[index], View.GONE)
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
            val events = json.optJSONArray("todayEvents")

            if (events == null || events.length() == 0) {
              views.setViewVisibility(TITLE_IDS[0], View.VISIBLE)
              views.setTextViewText(TITLE_IDS[0], "오늘 등록된 일정이 없어요")
              views.setViewVisibility(ITEMS_IDS[0], View.GONE)
              clearSlot(views, 1)
            } else {
              // 위젯 높이가 늘어나지 않도록 최대 2개 일정까지만 보여준다. 2번째
              // 자리에 못 담은 일정이 더 있으면 2번째 일정 제목 뒤에 "(+N건 더)"를
              // 붙여서 슬롯을 추가로 늘리지 않고도 더 있다는 것만 알려준다.
              val shownCount = minOf(events.length(), TITLE_IDS.size)
              for (i in 0 until shownCount) {
                val event = events.optJSONObject(i)
                var title = event?.optString("title") ?: ""
                if (i == shownCount - 1 && events.length() > shownCount) {
                  title = "$title (+${events.length() - shownCount}건 더)"
                }
                views.setViewVisibility(TITLE_IDS[i], View.VISIBLE)
                views.setTextViewText(TITLE_IDS[i], title)

                val itemsLine = buildItemsLine(event?.optJSONArray("itemNames"))
                views.setViewVisibility(ITEMS_IDS[i], if (itemsLine == null) View.GONE else View.VISIBLE)
                if (itemsLine != null) views.setTextViewText(ITEMS_IDS[i], itemsLine)
              }
              for (i in shownCount until TITLE_IDS.size) clearSlot(views, i)
            }

            handled = true
          } catch (e: Exception) {
            handled = false
          }
        }

        if (!handled) {
          views.setViewVisibility(TITLE_IDS[0], View.VISIBLE)
          views.setTextViewText(TITLE_IDS[0], "킨더케어를 열어 확인해주세요")
          views.setViewVisibility(ITEMS_IDS[0], View.GONE)
          clearSlot(views, 1)
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

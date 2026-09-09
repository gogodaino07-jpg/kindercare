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
 *  SharedPreferences의 요약 데이터를 읽어 오늘 일정(최대 3건)마다 "제목 (준비물 N개)"
 *  한 줄씩 + 내일 미리보기를 보여준다. */
class TodaySummaryWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  companion object {
    const val PREFS_NAME = "widget_data"
    const val KEY_SUMMARY_JSON = "summary_json"

    private val EVENT_LINE_IDS = intArrayOf(
      R.id.widget_event_line_1,
      R.id.widget_event_line_2,
      R.id.widget_event_line_3
    )

    /** 일정 최대 3건까지 "제목 (준비물 N개)" 한 줄씩 채우고, 넘치는 만큼은
     *  마지막 줄에 "(+N건 더)"로 요약한다(준비물 개수 대신). */
    private fun renderEventLines(views: RemoteViews, events: JSONArray?) {
      val count = events?.length() ?: 0
      for (i in EVENT_LINE_IDS.indices) {
        if (i >= count) {
          views.setViewVisibility(EVENT_LINE_IDS[i], View.GONE)
          continue
        }
        views.setViewVisibility(EVENT_LINE_IDS[i], View.VISIBLE)
        val event = events!!.optJSONObject(i)
        val title = event?.optString("title") ?: ""
        val isLastVisibleSlot = i == EVENT_LINE_IDS.size - 1

        val line = if (isLastVisibleSlot && count > EVENT_LINE_IDS.size) {
          "$title (+${count - EVENT_LINE_IDS.size}건 더)"
        } else {
          val itemCount = event?.optJSONArray("itemNames")?.length() ?: 0
          if (itemCount > 0) "$title (준비물 ${itemCount}개)" else title
        }
        views.setTextViewText(EVENT_LINE_IDS[i], line)
      }
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
            views.setTextViewText(R.id.widget_date, json.optString("dateLabel"))

            val events = json.optJSONArray("todayEvents")
            val eventCount = events?.length() ?: 0

            if (eventCount == 0) {
              views.setViewVisibility(R.id.widget_badge, View.GONE)
              views.setViewVisibility(R.id.widget_event_line_1, View.VISIBLE)
              views.setTextViewText(R.id.widget_event_line_1, "오늘 등록된 일정이 없어요")
              views.setViewVisibility(R.id.widget_event_line_2, View.GONE)
              views.setViewVisibility(R.id.widget_event_line_3, View.GONE)
            } else {
              views.setViewVisibility(R.id.widget_badge, View.VISIBLE)
              renderEventLines(views, events)
            }

            val tomorrow = json.optJSONObject("tomorrow")
            if (tomorrow == null) {
              views.setViewVisibility(R.id.widget_tomorrow_row, View.GONE)
            } else {
              val itemCount = tomorrow.optInt("itemCount", 0)
              val suffix = if (itemCount > 0) " (준비물 ${itemCount}개)" else ""
              views.setViewVisibility(R.id.widget_tomorrow_row, View.VISIBLE)
              views.setTextViewText(
                R.id.widget_tomorrow_text,
                "내일 ${tomorrow.optString("dateLabel")} · ${tomorrow.optString("title")}$suffix"
              )
            }

            handled = true
          } catch (e: Exception) {
            handled = false
          }
        }

        if (!handled) {
          views.setTextViewText(R.id.widget_date, "")
          views.setViewVisibility(R.id.widget_badge, View.GONE)
          views.setViewVisibility(R.id.widget_event_line_1, View.VISIBLE)
          views.setTextViewText(R.id.widget_event_line_1, "킨더케어를 열어 확인해주세요")
          views.setViewVisibility(R.id.widget_event_line_2, View.GONE)
          views.setViewVisibility(R.id.widget_event_line_3, View.GONE)
          views.setViewVisibility(R.id.widget_tomorrow_row, View.GONE)
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

package com.kindeerecare.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.kindeerecare.app.MainActivity
import com.kindeerecare.app.R
import org.json.JSONObject

/** 홈 화면 위젯 — JS 쪽(utils/homeWidget.ts)이 HomeWidgetModule을 통해 써준
 *  SharedPreferences의 요약 데이터를 읽어 오늘 일정 목록(스크롤 가능,
 *  TodayEventsRemoteViewsService가 채움) + 내일 미리보기를 보여준다. */
class TodaySummaryWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  companion object {
    const val PREFS_NAME = "widget_data"
    const val KEY_SUMMARY_JSON = "summary_json"

    fun updateWidgets(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val jsonString = prefs.getString(KEY_SUMMARY_JSON, null)

      for (widgetId in appWidgetIds) {
        val views = RemoteViews(context.packageName, R.layout.widget_today_summary)

        val adapterIntent = Intent(context, TodayEventsRemoteViewsService::class.java).apply {
          data = Uri.parse("widget://kindercare/today-events/$widgetId")
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        views.setRemoteAdapter(R.id.widget_event_list, adapterIntent)

        // requestCode를 아래 위젯 전체 클릭용(0)과 다르게 줘야 한다 — 둘 다
        // MainActivity로 가는 같은 Intent라 requestCode까지 같으면 시스템이
        // 같은 PendingIntent로 취급해서, FLAG_IMMUTABLE/FLAG_MUTABLE이 서로
        // 달라 "Flag mismatch" 크래시가 난다.
        val itemClickIntent = Intent(context, MainActivity::class.java)
        val itemClickPendingIntent = PendingIntent.getActivity(
          context,
          1,
          itemClickIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setPendingIntentTemplate(R.id.widget_event_list, itemClickPendingIntent)

        var handled = false
        if (jsonString != null) {
          try {
            val json = JSONObject(jsonString)
            views.setTextViewText(R.id.widget_date, json.optString("dateLabel"))

            val eventCount = json.optJSONArray("todayEvents")?.length() ?: 0
            if (eventCount == 0) {
              views.setViewVisibility(R.id.widget_badge, View.GONE)
              views.setViewVisibility(R.id.widget_event_list, View.GONE)
              views.setViewVisibility(R.id.widget_empty_message, View.VISIBLE)
              views.setTextViewText(R.id.widget_empty_message, "오늘 등록된 일정이 없어요")
            } else {
              views.setViewVisibility(R.id.widget_badge, View.VISIBLE)
              views.setViewVisibility(R.id.widget_event_list, View.VISIBLE)
              views.setViewVisibility(R.id.widget_empty_message, View.GONE)
            }

            val tomorrow = json.optJSONObject("tomorrow")
            if (tomorrow == null) {
              views.setViewVisibility(R.id.widget_tomorrow_row, View.GONE)
            } else {
              val itemCount = tomorrow.optInt("itemCount", 0)
              views.setViewVisibility(R.id.widget_tomorrow_row, View.VISIBLE)
              views.setTextViewText(
                R.id.widget_tomorrow_text,
                WidgetFormatting.buildEventLine("내일 ${tomorrow.optString("dateLabel")} · ${tomorrow.optString("title")}", "(준비물 ${itemCount}개)")
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
          views.setViewVisibility(R.id.widget_event_list, View.GONE)
          views.setViewVisibility(R.id.widget_empty_message, View.VISIBLE)
          views.setTextViewText(R.id.widget_empty_message, "킨더케어를 열어 확인해주세요")
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

      appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_event_list)
    }
  }
}

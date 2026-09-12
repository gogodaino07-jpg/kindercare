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

  // 위젯을 홈 화면에서 치우면 그 위젯에 배정해뒀던 "어느 아이 기준" 설정도 같이 지운다 —
  // 안 지우면 SharedPreferences에 계속 쌓이고, 나중에 같은 appWidgetId가 재사용될 때
  // 엉뚱한 아이 배정이 남아있을 수 있다.
  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    for (widgetId in appWidgetIds) {
      WidgetChildPrefs.remove(context, widgetId)
    }
  }

  companion object {
    const val PREFS_NAME = "widget_data"
    const val KEY_SUMMARY_JSON = "summary_json"

    fun updateWidgets(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val jsonString = prefs.getString(KEY_SUMMARY_JSON, null)
      val root = try {
        if (jsonString != null) JSONObject(jsonString) else null
      } catch (e: Exception) {
        null
      }

      for (widgetId in appWidgetIds) {
        val views = RemoteViews(context.packageName, R.layout.widget_today_summary)

        val adapterIntent = Intent(context, TodayEventsRemoteViewsService::class.java).apply {
          data = Uri.parse("widget://kindercare/today-events/$widgetId")
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        views.setRemoteAdapter(R.id.widget_event_list, adapterIntent)

        val json = WidgetDataResolver.resolveChildSummary(context, widgetId, root)

        var handled = false
        var todayISO: String? = null
        var tomorrowISO: String? = null
        if (json != null) {
          try {
            views.setTextViewText(R.id.widget_date, json.optString("dateLabel"))
            todayISO = json.optString("dateISO").takeIf { it.isNotBlank() }

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
              tomorrowISO = tomorrow.optString("dateISO").takeIf { it.isNotBlank() }
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

        // 위젯을 탭하면 앱만 그냥 켜지던 걸, 일정 탭했을 때와 똑같이 그 날짜의 캘린더로
        // 바로 들어가게 한다. kindercare:// 딥링크는 expo-router가 이미 처리하고 있어서
        // (AndroidManifest의 VIEW 인텐트 필터) 그 스킴으로 이동시키면 된다.
        // requestCode를 서로 다르게 줘야 한다 — 같은 Intent에 flag만 다르면 시스템이
        // 같은 PendingIntent로 취급해서 "Flag mismatch" 크래시가 난다.
        views.setOnClickPendingIntent(R.id.widget_root, buildCalendarPendingIntent(context, todayISO, requestCode = 0, mutable = false))
        views.setPendingIntentTemplate(
          R.id.widget_event_list,
          buildCalendarPendingIntent(context, todayISO, requestCode = 1, mutable = true)
        )
        if (tomorrowISO != null) {
          views.setOnClickPendingIntent(
            R.id.widget_tomorrow_row,
            buildCalendarPendingIntent(context, tomorrowISO, requestCode = 2, mutable = false)
          )
        }

        appWidgetManager.updateAppWidget(widgetId, views)
      }

      appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_event_list)
    }

    /** dateISO가 있으면 앱 안에서 일정을 탭했을 때와 동일하게 kindercare://calendar
     *  딥링크로 그 날짜의 캘린더 화면으로 바로 이동시키고, 없으면(데이터 없음/파싱 실패)
     *  예전처럼 그냥 앱만 여는 Intent로 대체한다. 목록(ListView) 아이템 템플릿용
     *  PendingIntent는 FLAG_MUTABLE이 필수라 mutable 인자로 구분한다. */
    private fun buildCalendarPendingIntent(
      context: Context,
      dateISO: String?,
      requestCode: Int,
      mutable: Boolean
    ): PendingIntent {
      val intent = if (dateISO != null) {
        Intent(Intent.ACTION_VIEW, Uri.parse("kindercare://calendar?date=$dateISO"), context, MainActivity::class.java)
      } else {
        Intent(context, MainActivity::class.java)
      }
      val flags = PendingIntent.FLAG_UPDATE_CURRENT or
        if (mutable) PendingIntent.FLAG_MUTABLE else PendingIntent.FLAG_IMMUTABLE
      return PendingIntent.getActivity(context, requestCode, intent, flags)
    }
  }
}

package com.kindeerecare.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.View
import android.widget.RemoteViews
import com.kindeerecare.app.MainActivity
import com.kindeerecare.app.R
import org.json.JSONArray
import org.json.JSONObject

/** 홈 화면 위젯 — JS 쪽(utils/homeWidget.ts)이 HomeWidgetModule을 통해 써준
 *  SharedPreferences의 요약 데이터를 읽어 오늘 대표 일정 + 그 준비물 + 내일 미리보기를 보여준다.
 *  위젯 높이 제한(2행) 때문에 오늘 일정은 1건만 카드에 담고, 더 있으면 제목 뒤에 "(+N건 더)"를 붙인다. */
class TodaySummaryWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  companion object {
    const val PREFS_NAME = "widget_data"
    const val KEY_SUMMARY_JSON = "summary_json"

    private const val CHECK_COLOR = "#F97362"
    private val CHIP_IDS = intArrayOf(R.id.widget_event_1_chip_1, R.id.widget_event_1_chip_2)

    /** "✓ 저금통장"처럼 체크 표시만 코랄색으로, 이름은 기본색으로 칠한 칩 문구를 만든다. */
    private fun checkedChipText(label: String): SpannableString {
      val text = "✓ $label"
      return SpannableString(text).apply {
        setSpan(ForegroundColorSpan(Color.parseColor(CHECK_COLOR)), 0, 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      }
    }

    private fun renderChips(views: RemoteViews, itemNames: JSONArray?) {
      val count = itemNames?.length() ?: 0
      if (count == 0) {
        views.setViewVisibility(R.id.widget_event_1_chips, View.GONE)
        return
      }
      views.setViewVisibility(R.id.widget_event_1_chips, View.VISIBLE)
      for (i in CHIP_IDS.indices) {
        if (i >= count) {
          views.setViewVisibility(CHIP_IDS[i], View.GONE)
          continue
        }
        views.setViewVisibility(CHIP_IDS[i], View.VISIBLE)
        val isLastVisibleSlot = i == CHIP_IDS.size - 1
        val label = if (isLastVisibleSlot && count > CHIP_IDS.size) {
          "${itemNames!!.optString(i)} 외 ${count - CHIP_IDS.size}건"
        } else {
          itemNames!!.optString(i)
        }
        views.setTextViewText(CHIP_IDS[i], checkedChipText(label))
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
              views.setTextViewText(R.id.widget_event_1_title, "오늘 등록된 일정이 없어요")
              views.setViewVisibility(R.id.widget_event_1_chips, View.GONE)
            } else {
              views.setViewVisibility(R.id.widget_badge, View.VISIBLE)
              val first = events!!.optJSONObject(0)
              var title = first?.optString("title") ?: ""
              if (eventCount > 1) title = "$title (+${eventCount - 1}건 더)"
              views.setTextViewText(R.id.widget_event_1_title, title)
              renderChips(views, first?.optJSONArray("itemNames"))
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
          views.setTextViewText(R.id.widget_event_1_title, "킨더케어를 열어 확인해주세요")
          views.setViewVisibility(R.id.widget_event_1_chips, View.GONE)
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

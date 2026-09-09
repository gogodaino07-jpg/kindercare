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
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import android.graphics.Typeface
import android.view.View
import android.widget.RemoteViews
import com.kindeerecare.app.MainActivity
import com.kindeerecare.app.R
import org.json.JSONArray
import org.json.JSONObject

/** 홈 화면 위젯 — JS 쪽(utils/homeWidget.ts)이 HomeWidgetModule을 통해 써준
 *  SharedPreferences의 요약 데이터를 읽어 오늘 일정(최대 6건)마다 "제목" 줄 +
 *  준비물 이름을 나열한 줄 + 내일 미리보기를 보여준다. */
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
      R.id.widget_event_line_3,
      R.id.widget_event_line_4,
      R.id.widget_event_line_5,
      R.id.widget_event_line_6
    )
    private val EVENT_ITEMS_IDS = intArrayOf(
      R.id.widget_event_items_1,
      R.id.widget_event_items_2,
      R.id.widget_event_items_3,
      R.id.widget_event_items_4,
      R.id.widget_event_items_5,
      R.id.widget_event_items_6
    )

    private const val SUFFIX_COLOR = "#475569"

    /** "제목" 뒤에 붙는 부분만 제목보다 연하고 작은 글씨+일반 굵기로 표시해서,
     *  제목과 부가정보가 시각적으로 구분되게 한다(내일 미리보기 줄에서 사용). */
    private fun buildEventLine(title: String, suffix: String): CharSequence {
      val full = "$title $suffix"
      val span = SpannableString(full)
      val suffixStart = title.length + 1
      span.setSpan(ForegroundColorSpan(Color.parseColor(SUFFIX_COLOR)), suffixStart, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      span.setSpan(StyleSpan(Typeface.NORMAL), suffixStart, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      span.setSpan(RelativeSizeSpan(0.88f), suffixStart, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      return span
    }

    /** 준비물 이름마다 체크마크(✓)를 붙여서 나열한다 — 배경 있는 칩(chip) 뷰는
     *  wrap_content 너비 + 배경 + 동적 텍스트 조합이 실기기(One UI)에서 크기가
     *  0으로 찌그러지며 렌더링 실패하는 문제가 있어서 쓸 수 없다(실기기 확인됨).
     *  대신 체크마크만 붙여 비슷한 느낌을 낸다. */
    private fun itemNamesText(event: JSONObject?): String {
      val arr = event?.optJSONArray("itemNames") ?: return ""
      val names = mutableListOf<String>()
      for (j in 0 until arr.length()) {
        val name = arr.optString(j)
        if (name.isNotBlank()) names.add("✓ $name")
      }
      return names.joinToString("  ")
    }

    /** 일정마다 "제목" 줄 + 준비물 이름을 나열한 줄을 채운다. 최대 6건까지
     *  슬롯이 있고, 그보다 많으면 마지막 슬롯 제목에 "(+N건 더)"만 붙이고
     *  그 슬롯의 준비물 줄은 숨긴다. */
    private fun renderEventLines(views: RemoteViews, events: JSONArray?) {
      val count = events?.length() ?: 0
      for (i in EVENT_LINE_IDS.indices) {
        if (i >= count) {
          views.setViewVisibility(EVENT_LINE_IDS[i], View.GONE)
          views.setViewVisibility(EVENT_ITEMS_IDS[i], View.GONE)
          continue
        }
        views.setViewVisibility(EVENT_LINE_IDS[i], View.VISIBLE)
        val event = events!!.optJSONObject(i)
        val title = event?.optString("title") ?: ""
        val isLastVisibleSlot = i == EVENT_LINE_IDS.size - 1

        if (isLastVisibleSlot && count > EVENT_LINE_IDS.size) {
          views.setTextViewText(EVENT_LINE_IDS[i], "$title (+${count - EVENT_LINE_IDS.size}건 더)")
          views.setViewVisibility(EVENT_ITEMS_IDS[i], View.GONE)
        } else {
          views.setTextViewText(EVENT_LINE_IDS[i], title)
          val itemsText = itemNamesText(event)
          if (itemsText.isEmpty()) {
            views.setViewVisibility(EVENT_ITEMS_IDS[i], View.GONE)
          } else {
            views.setViewVisibility(EVENT_ITEMS_IDS[i], View.VISIBLE)
            views.setTextViewText(EVENT_ITEMS_IDS[i], "준비물: $itemsText")
          }
        }
      }
    }

    /** 일정 슬롯 1개만 안내 문구로 채우고 나머지 슬롯(준비물 줄 포함)은 모두
     *  숨긴다 — "오늘 일정 없음"/"오류" 같은 단일 메시지 상태에서 사용. */
    private fun showSingleMessage(views: RemoteViews, message: String) {
      views.setTextViewText(EVENT_LINE_IDS[0], message)
      views.setViewVisibility(EVENT_LINE_IDS[0], View.VISIBLE)
      views.setViewVisibility(EVENT_ITEMS_IDS[0], View.GONE)
      for (i in 1 until EVENT_LINE_IDS.size) {
        views.setViewVisibility(EVENT_LINE_IDS[i], View.GONE)
        views.setViewVisibility(EVENT_ITEMS_IDS[i], View.GONE)
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
              showSingleMessage(views, "오늘 등록된 일정이 없어요")
            } else {
              views.setViewVisibility(R.id.widget_badge, View.VISIBLE)
              renderEventLines(views, events)
            }

            val tomorrow = json.optJSONObject("tomorrow")
            if (tomorrow == null) {
              views.setViewVisibility(R.id.widget_tomorrow_row, View.GONE)
            } else {
              val itemCount = tomorrow.optInt("itemCount", 0)
              views.setViewVisibility(R.id.widget_tomorrow_row, View.VISIBLE)
              views.setTextViewText(
                R.id.widget_tomorrow_text,
                buildEventLine("내일 ${tomorrow.optString("dateLabel")} · ${tomorrow.optString("title")}", "(준비물 ${itemCount}개)")
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
          showSingleMessage(views, "킨더케어를 열어 확인해주세요")
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

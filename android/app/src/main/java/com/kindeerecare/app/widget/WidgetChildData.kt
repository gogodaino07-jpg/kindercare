package com.kindeerecare.app.widget

import android.content.Context
import org.json.JSONObject

/** 위젯 인스턴스(appWidgetId)마다 "어느 아이 기준으로 보여줄지" 배정을 저장/조회한다.
 *  위젯을 홈 화면에 추가할 때 WidgetChildPickerActivity가 저장하고, 위젯을 치우면
 *  TodaySummaryWidgetProvider.onDeleted가 지운다. */
object WidgetChildPrefs {
  private fun key(widgetId: Int) = "widget_child_$widgetId"

  fun get(context: Context, widgetId: Int): String? {
    val prefs = context.getSharedPreferences(TodaySummaryWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
    return prefs.getString(key(widgetId), null)
  }

  fun set(context: Context, widgetId: Int, childId: String) {
    val prefs = context.getSharedPreferences(TodaySummaryWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().putString(key(widgetId), childId).apply()
  }

  fun remove(context: Context, widgetId: Int) {
    val prefs = context.getSharedPreferences(TodaySummaryWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().remove(key(widgetId)).apply()
  }
}

/** JS(utils/homeWidget.ts)가 써준 { children: [...], summaries: { [childId]: {...} } }
 *  전체 JSON에서, 특정 위젯 인스턴스가 보여줘야 할 아이 한 명 몫의 요약만 골라낸다. */
object WidgetDataResolver {
  /** 배정된 아이가 없거나(설정 실패 등) 배정된 아이가 그 사이 삭제됐으면, 완전히 빈
   *  화면을 보여주는 대신 등록된 아이 중 첫 번째로 대체한다. */
  fun resolveChildSummary(context: Context, widgetId: Int, root: JSONObject?): JSONObject? {
    if (root == null) return null
    val summaries = root.optJSONObject("summaries") ?: return null

    val assignedChildId = WidgetChildPrefs.get(context, widgetId)
    if (assignedChildId != null) {
      summaries.optJSONObject(assignedChildId)?.let { return it }
    }

    val fallbackChildId = firstChildId(root) ?: return null
    return summaries.optJSONObject(fallbackChildId)
  }

  private fun firstChildId(root: JSONObject): String? {
    val arr = root.optJSONArray("children") ?: return null
    if (arr.length() == 0) return null
    return arr.optJSONObject(0)?.optString("id")?.takeIf { it.isNotBlank() }
  }
}

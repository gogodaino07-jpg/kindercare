package com.kindeerecare.app.widget

import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.kindeerecare.app.R
import org.json.JSONArray
import org.json.JSONObject

/** widget_today_summary.xml의 widget_event_list(ListView)에 오늘 일정을
 *  채워주는 RemoteViewsFactory. 위젯 크기보다 일정이 많으면 목록이 스크롤된다 —
 *  진짜 스크롤이 되려면 목록 영역이 고정 크기여야 해서, widget_card 자체도
 *  wrap_content가 아니라 위젯에 배정된 높이를 그대로 채우도록 바뀌었다. */
class TodayEventsRemoteViewsService : RemoteViewsService() {
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
    return TodayEventsRemoteViewsFactory(applicationContext)
  }
}

private class TodayEventsRemoteViewsFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {
  private var events: JSONArray = JSONArray()

  override fun onCreate() {
    loadEvents()
  }

  override fun onDataSetChanged() {
    loadEvents()
  }

  private fun loadEvents() {
    val prefs = context.getSharedPreferences(TodaySummaryWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
    val jsonString = prefs.getString(TodaySummaryWidgetProvider.KEY_SUMMARY_JSON, null)
    events = try {
      if (jsonString != null) JSONObject(jsonString).optJSONArray("todayEvents") ?: JSONArray() else JSONArray()
    } catch (e: Exception) {
      JSONArray()
    }
  }

  override fun onDestroy() {
    events = JSONArray()
  }

  override fun getCount(): Int = events.length()

  override fun getViewAt(position: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_event_item)
    val event = events.optJSONObject(position)
    val title = event?.optString("title") ?: ""

    if (event?.optBoolean("allItemsDone", false) == true) {
      views.setTextViewText(R.id.widget_item_title, WidgetFormatting.buildEventLine(title, "(준비물 완료)"))
      views.setViewVisibility(R.id.widget_item_prep, View.GONE)
    } else {
      views.setTextViewText(R.id.widget_item_title, title)
      val itemsText = WidgetFormatting.itemNamesText(event)
      if (itemsText.isEmpty()) {
        views.setViewVisibility(R.id.widget_item_prep, View.GONE)
      } else {
        views.setViewVisibility(R.id.widget_item_prep, View.VISIBLE)
        views.setTextViewText(R.id.widget_item_prep, "준비물: $itemsText")
      }
    }
    views.setOnClickFillInIntent(R.id.widget_item_row, Intent())
    return views
  }

  override fun getLoadingView(): RemoteViews? = null
  override fun getViewTypeCount(): Int = 1
  override fun getItemId(position: Int): Long = position.toLong()
  override fun hasStableIds(): Boolean = true
}

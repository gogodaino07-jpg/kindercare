package com.kindeerecare.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.kindeerecare.app.R
import org.json.JSONArray
import org.json.JSONObject

/**
 * 위젯을 홈 화면에 새로 추가할 때 뜨는 "어느 아이 기준으로 보여줄지" 선택 화면.
 * AndroidManifest의 android:configure로 today_summary_widget_info.xml에 연결돼 있어서,
 * 위젯을 추가하는 순간 시스템이 이 액티비티를 자동으로 띄워준다.
 *
 * 아이가 1명뿐이면(또는 등록 전이면) 이 화면 자체를 보여주지 않고 바로 그 아이로
 * 배정한 뒤 끝낸다 — 화면을 그리기 전에 onCreate에서 바로 finish()하므로 사실상
 * 아무 화면도 보이지 않는다.
 */
class WidgetChildPickerActivity : Activity() {
  private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // 위젯 설정 화면의 표준 규약: 사용자가 끝까지 고르지 않고 나가면(뒤로가기 등)
    // 위젯 자체가 홈 화면에 추가되지 않아야 하므로, 기본값을 CANCELED로 깔아둔다.
    setResult(RESULT_CANCELED)

    appWidgetId = intent?.getIntExtra(
      AppWidgetManager.EXTRA_APPWIDGET_ID,
      AppWidgetManager.INVALID_APPWIDGET_ID
    ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

    if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    val children = loadChildren()
    if (children.length() <= 1) {
      val onlyChildId = if (children.length() == 1) {
        children.optJSONObject(0)?.optString("id")?.takeIf { it.isNotBlank() }
      } else {
        null
      }
      if (onlyChildId != null) {
        WidgetChildPrefs.set(this, appWidgetId, onlyChildId)
      }
      finishWithSelection()
      return
    }

    setContentView(R.layout.activity_widget_child_picker)
    val list = findViewById<LinearLayout>(R.id.picker_list)
    val inflater = LayoutInflater.from(this)

    for (i in 0 until children.length()) {
      val child = children.optJSONObject(i) ?: continue
      val childId = child.optString("id").takeIf { it.isNotBlank() } ?: continue

      val row = inflater.inflate(R.layout.widget_child_picker_row, list, false)
      val avatar = row.findViewById<ImageView>(R.id.row_avatar)
      val avatarEmoji = row.findViewById<TextView>(R.id.row_avatar_emoji)
      val nameView = row.findViewById<TextView>(R.id.row_name)

      nameView.text = child.optString("name").ifBlank { "아이" }

      val photoUri = child.optString("photoUri").takeIf { it.isNotBlank() }
      if (photoUri != null) {
        avatar.setImageURI(Uri.parse(photoUri))
        avatar.visibility = View.VISIBLE
        avatarEmoji.visibility = View.GONE
      } else {
        avatarEmoji.text = child.optString("avatarEmoji").ifBlank { "🧒" }
        avatarEmoji.visibility = View.VISIBLE
        avatar.visibility = View.GONE
      }

      row.setOnClickListener {
        // 누른 카드만 코랄로 강조하고 나머지는 원래(미선택) 스타일로 되돌린다.
        for (j in 0 until list.childCount) {
          val other = list.getChildAt(j)
          setRowSelected(other, other === row)
        }

        // 코랄 강조가 잠깐 보인 뒤에 닫히도록 살짝 지연을 준다.
        Handler(Looper.getMainLooper()).postDelayed({
          WidgetChildPrefs.set(this, appWidgetId, childId)
          finishWithSelection()
        }, 150)
      }

      list.addView(row)
    }
  }

  private fun setRowSelected(row: View, selected: Boolean) {
    row.setBackgroundResource(
      if (selected) R.drawable.widget_child_row_bg_selected else R.drawable.widget_child_row_bg_unselected
    )
    row.findViewById<ImageView>(R.id.row_check).setImageResource(
      if (selected) R.drawable.widget_child_check_selected else R.drawable.widget_child_check_unselected
    )
  }

  private fun loadChildren(): JSONArray {
    val prefs = getSharedPreferences(TodaySummaryWidgetProvider.PREFS_NAME, MODE_PRIVATE)
    val jsonString = prefs.getString(TodaySummaryWidgetProvider.KEY_SUMMARY_JSON, null) ?: return JSONArray()
    return try {
      JSONObject(jsonString).optJSONArray("children") ?: JSONArray()
    } catch (e: Exception) {
      JSONArray()
    }
  }

  private fun finishWithSelection() {
    val appWidgetManager = AppWidgetManager.getInstance(this)
    TodaySummaryWidgetProvider.updateWidgets(this, appWidgetManager, intArrayOf(appWidgetId))

    val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
    setResult(RESULT_OK, resultValue)
    finish()
  }
}

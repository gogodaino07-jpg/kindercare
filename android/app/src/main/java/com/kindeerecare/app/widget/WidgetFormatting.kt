package com.kindeerecare.app.widget

import android.graphics.Color
import android.graphics.Typeface
import android.text.SpannableString
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import org.json.JSONObject

/** TodaySummaryWidgetProvider(오늘/내일 요약)와 TodayEventsRemoteViewsFactory
 *  (오늘 일정 스크롤 목록)가 함께 쓰는 텍스트 포맷팅 helper. */
object WidgetFormatting {
  private const val SUFFIX_COLOR = "#475569"
  private const val CHECK_COLOR = "#639922"
  private const val ITEM_NAME_COLOR = "#3D5A73"

  /** "제목" 뒤에 붙는 부분만 제목보다 연하고 작은 글씨+일반 굵기로 표시해서,
   *  제목과 부가정보가 시각적으로 구분되게 한다(내일 미리보기 줄에서 사용). */
  fun buildEventLine(title: String, suffix: String): CharSequence {
    val full = "$title $suffix"
    val span = SpannableString(full)
    val suffixStart = title.length + 1
    span.setSpan(ForegroundColorSpan(Color.parseColor(SUFFIX_COLOR)), suffixStart, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    span.setSpan(StyleSpan(Typeface.NORMAL), suffixStart, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    span.setSpan(RelativeSizeSpan(0.88f), suffixStart, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    return span
  }

  /** 준비물 이름마다 체크마크(✓, 초록색)를 붙여서 나열한다 — 배경 있는 칩(chip) 뷰는
   *  wrap_content 너비 + 배경 + 동적 텍스트 조합이 실기기(One UI)에서 크기가
   *  0으로 찌그러지며 렌더링 실패하는 문제가 있어서 쓸 수 없다(실기기 확인됨).
   *  대신 체크마크와 항목명에 색만 넣어 태그와 비슷한 느낌을 낸다. 항목이 없으면 null. */
  fun itemNamesText(event: JSONObject?): CharSequence? {
    val arr = event?.optJSONArray("itemNames") ?: return null
    val names = mutableListOf<String>()
    for (j in 0 until arr.length()) {
      val name = arr.optString(j)
      if (name.isNotBlank()) names.add(name)
    }
    if (names.isEmpty()) return null

    val builder = SpannableStringBuilder()
    names.forEachIndexed { index, name ->
      if (index > 0) builder.append("  ")

      val checkStart = builder.length
      builder.append("✓ ")
      builder.setSpan(
        ForegroundColorSpan(Color.parseColor(CHECK_COLOR)),
        checkStart,
        builder.length,
        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
      )

      val nameStart = builder.length
      builder.append(name)
      builder.setSpan(
        ForegroundColorSpan(Color.parseColor(ITEM_NAME_COLOR)),
        nameStart,
        builder.length,
        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
      )
    }
    return builder
  }
}

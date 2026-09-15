package com.example.trafficwatch

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * 최근에 관측된 목적지 호스트 목록을 들고 있는 메모리 저장소.
 * VpnService(백그라운드 스레드)가 쓰고, 화면(Compose)이 읽는다.
 */
object HostLog {

    private const val MAX_ENTRIES = 300

    data class Entry(
        val host: String,
        /** 호스트를 어디서 뽑았는지: DNS / SNI / HTTP */
        val source: String,
        val firstSeenAt: Long,
        val lastSeenAt: Long,
        val count: Int,
    )

    private val _entries = MutableStateFlow<List<Entry>>(emptyList())
    val entries: StateFlow<List<Entry>> = _entries.asStateFlow()

    private val _running = MutableStateFlow(false)
    val running: StateFlow<Boolean> = _running.asStateFlow()

    fun setRunning(value: Boolean) {
        _running.value = value
    }

    /** 같은 호스트가 또 보이면 카운트만 올리고 목록 맨 위로 끌어올린다. */
    fun add(host: String, source: String) {
        val now = System.currentTimeMillis()
        _entries.value = buildList {
            val existing = _entries.value.firstOrNull { it.host == host }
            if (existing == null) {
                add(Entry(host, source, now, now, 1))
            } else {
                add(existing.copy(source = source, lastSeenAt = now, count = existing.count + 1))
            }
            _entries.value.forEach { if (it.host != host) add(it) }
        }.take(MAX_ENTRIES)
    }

    fun clear() {
        _entries.value = emptyList()
    }
}

package com.example.trafficwatch

/**
 * 터널을 지나가는 raw IP 패킷에서 "목적지 호스트 이름"만 뽑아낸다.
 * 페이로드 복호화는 하지 않고, 평문으로 노출되는 세 군데만 본다.
 *  - DNS 질의(UDP 53)의 QNAME
 *  - TLS ClientHello(TCP 443)의 SNI 확장
 *  - 평문 HTTP(TCP 80)의 Host 헤더
 */
object PacketParser {

    data class Hit(val host: String, val source: String)

    private const val PROTO_TCP = 6
    private const val PROTO_UDP = 17

    fun parse(packet: ByteArray, length: Int): Hit? {
        if (length < 20) return null

        val version = (packet[0].toInt() shr 4) and 0x0F
        val protocol: Int
        val transportStart: Int
        when (version) {
            4 -> {
                val ihl = (packet[0].toInt() and 0x0F) * 4
                if (ihl < 20 || length < ihl) return null
                protocol = packet[9].toInt() and 0xFF
                transportStart = ihl
            }
            6 -> {
                if (length < 40) return null
                // 확장 헤더는 다루지 않는다(대부분의 TCP/UDP 트래픽은 next header가 바로 전송층).
                protocol = packet[6].toInt() and 0xFF
                transportStart = 40
            }
            else -> return null
        }

        return when (protocol) {
            PROTO_UDP -> parseUdp(packet, transportStart, length)
            PROTO_TCP -> parseTcp(packet, transportStart, length)
            else -> null
        }
    }

    private fun parseUdp(packet: ByteArray, start: Int, end: Int): Hit? {
        if (end - start < 8) return null
        val dstPort = u16(packet, start + 2)
        val payloadStart = start + 8
        if (payloadStart >= end) return null
        if (dstPort != 53) return null
        val name = parseDnsQuestion(packet, payloadStart, end) ?: return null
        return Hit(name, "DNS")
    }

    private fun parseTcp(packet: ByteArray, start: Int, end: Int): Hit? {
        if (end - start < 20) return null
        val dstPort = u16(packet, start + 2)
        val dataOffset = ((packet[start + 12].toInt() shr 4) and 0x0F) * 4
        if (dataOffset < 20) return null
        val payloadStart = start + dataOffset
        if (payloadStart >= end) return null

        return when (dstPort) {
            443 -> parseTlsSni(packet, payloadStart, end)?.let { Hit(it, "SNI") }
            80 -> parseHttpHost(packet, payloadStart, end)?.let { Hit(it, "HTTP") }
            else -> null
        }
    }

    /** DNS 질의의 첫 번째 question 섹션에서 도메인 이름을 읽는다. */
    private fun parseDnsQuestion(buf: ByteArray, start: Int, end: Int): String? {
        if (end - start < 13) return null
        val flags = u16(buf, start + 2)
        val isQuery = (flags and 0x8000) == 0
        if (!isQuery) return null
        if (u16(buf, start + 4) < 1) return null // qdcount

        var pos = start + 12
        val sb = StringBuilder()
        while (pos < end) {
            val len = buf[pos].toInt() and 0xFF
            if (len == 0) break
            if (len and 0xC0 != 0) return null // 질의에는 압축 포인터가 없어야 한다
            pos++
            if (pos + len > end) return null
            if (sb.isNotEmpty()) sb.append('.')
            for (i in 0 until len) {
                sb.append((buf[pos + i].toInt() and 0xFF).toChar())
            }
            pos += len
        }
        return sb.toString().takeIf { isPlausibleHost(it) }
    }

    /** TLS ClientHello 안의 server_name(SNI) 확장을 찾는다. */
    private fun parseTlsSni(buf: ByteArray, start: Int, end: Int): String? {
        var pos = start
        if (end - pos < 43) return null
        if ((buf[pos].toInt() and 0xFF) != 0x16) return null // handshake record
        if ((buf[pos + 5].toInt() and 0xFF) != 0x01) return null // ClientHello

        pos += 5 + 4          // record header(5) + handshake header(4)
        pos += 2 + 32         // client version + random
        if (pos >= end) return null

        val sessionIdLen = buf[pos].toInt() and 0xFF
        pos += 1 + sessionIdLen
        if (pos + 2 > end) return null

        val cipherSuitesLen = u16(buf, pos)
        pos += 2 + cipherSuitesLen
        if (pos >= end) return null

        val compressionLen = buf[pos].toInt() and 0xFF
        pos += 1 + compressionLen
        if (pos + 2 > end) return null

        val extensionsLen = u16(buf, pos)
        pos += 2
        val extensionsEnd = minOf(pos + extensionsLen, end)

        while (pos + 4 <= extensionsEnd) {
            val type = u16(buf, pos)
            val len = u16(buf, pos + 2)
            pos += 4
            if (pos + len > extensionsEnd) return null
            if (type == 0x0000) {
                // server_name_list: list length(2) + name type(1) + name length(2) + name
                var p = pos + 2
                if (p + 3 > extensionsEnd) return null
                val nameType = buf[p].toInt() and 0xFF
                val nameLen = u16(buf, p + 1)
                p += 3
                if (nameType != 0 || p + nameLen > extensionsEnd) return null
                val host = String(buf, p, nameLen, Charsets.US_ASCII)
                return host.takeIf { isPlausibleHost(it) }
            }
            pos += len
        }
        return null
    }

    /** 평문 HTTP 요청의 Host 헤더. */
    private fun parseHttpHost(buf: ByteArray, start: Int, end: Int): String? {
        val size = minOf(end - start, 2048)
        val text = String(buf, start, size, Charsets.ISO_8859_1)
        if (!text.startsWith("GET ") && !text.startsWith("POST ") && !text.startsWith("HEAD ") &&
            !text.startsWith("PUT ") && !text.startsWith("DELETE ") && !text.startsWith("OPTIONS ") &&
            !text.startsWith("PATCH ")
        ) {
            return null
        }
        val match = Regex("(?im)^host:\\s*([^\\r\\n:]+)").find(text) ?: return null
        return match.groupValues[1].trim().takeIf { isPlausibleHost(it) }
    }

    private fun isPlausibleHost(host: String): Boolean {
        if (host.length !in 3..253) return false
        if (!host.contains('.')) return false
        return host.all { it.isLetterOrDigit() || it == '.' || it == '-' || it == '_' }
    }

    private fun u16(buf: ByteArray, offset: Int): Int =
        ((buf[offset].toInt() and 0xFF) shl 8) or (buf[offset + 1].toInt() and 0xFF)
}

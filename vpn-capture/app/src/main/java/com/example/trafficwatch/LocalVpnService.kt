package com.example.trafficwatch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.IOException

/**
 * 로컬 VPN 터널을 만들고, 터널로 들어오는 패킷에서 목적지 호스트만 뽑아 로그로 남긴다.
 *
 * 주의: 읽은 패킷을 바깥으로 중계(forwarding)하지 않는다. 즉 VPN이 켜져 있는 동안
 * 실제 통신은 되지 않고, "어떤 호스트로 나가려고 했는지"만 관측된다.
 * (호스트 확인 용도의 최소 구현. 중계가 필요하면 tun <-> 소켓 릴레이를 따로 구현해야 한다.)
 */
class LocalVpnService : VpnService() {

    companion object {
        private const val TAG = "TrafficWatch"

        const val ACTION_START = "com.example.trafficwatch.START"
        const val ACTION_STOP = "com.example.trafficwatch.STOP"

        private const val CHANNEL_ID = "vpn_status"
        private const val NOTIFICATION_ID = 1

        private const val TUN_ADDRESS = "10.0.0.2"
        private const val TUN_PREFIX = 32
        private const val MTU = 1500

        fun start(context: Context) {
            val intent = Intent(context, LocalVpnService::class.java).setAction(ACTION_START)
            context.startService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, LocalVpnService::class.java).setAction(ACTION_STOP)
            context.startService(intent)
        }
    }

    private var tunnel: ParcelFileDescriptor? = null
    private var captureThread: Thread? = null

    @Volatile
    private var shouldRun = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return when (intent?.action) {
            ACTION_STOP -> {
                stopTunnel()
                START_NOT_STICKY
            }
            else -> {
                startTunnel()
                START_STICKY
            }
        }
    }

    private fun startTunnel() {
        if (tunnel != null) return

        val fd = try {
            Builder()
                .setSession(getString(R.string.app_name))
                .addAddress(TUN_ADDRESS, TUN_PREFIX)
                .addRoute("0.0.0.0", 0)          // 모든 IPv4 트래픽을 터널로
                .addDnsServer("8.8.8.8")
                .setMtu(MTU)
                .apply {
                    // 이 앱 자신의 트래픽은 캡처 대상에서 제외한다.
                    runCatching { addDisallowedApplication(packageName) }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) setMetered(false)
                }
                .establish()
        } catch (e: Exception) {
            Log.e(TAG, "VPN 터널 생성 실패", e)
            null
        }

        if (fd == null) {
            Log.e(TAG, "establish()가 null을 반환했다. VPN 권한이 없을 수 있다.")
            HostLog.setRunning(false)
            stopSelf()
            return
        }

        tunnel = fd
        shouldRun = true
        HostLog.setRunning(true)
        goForeground()

        captureThread = Thread({ captureLoop(fd) }, "vpn-capture").also { it.start() }
        Log.i(TAG, "VPN 터널 시작")
    }

    private fun captureLoop(fd: ParcelFileDescriptor) {
        val input = FileInputStream(fd.fileDescriptor)
        val buffer = ByteArray(32767)
        try {
            while (shouldRun) {
                val length = input.read(buffer)
                if (length <= 0) continue
                val hit = PacketParser.parse(buffer, length) ?: continue
                Log.i(TAG, "[${hit.source}] ${hit.host}")
                HostLog.add(hit.host, hit.source)
                // 읽은 패킷은 여기서 버린다(중계하지 않음).
            }
        } catch (e: IOException) {
            if (shouldRun) Log.e(TAG, "캡처 루프 종료", e)
        } finally {
            runCatching { input.close() }
            Log.i(TAG, "캡처 루프 끝")
        }
    }

    private fun stopTunnel() {
        shouldRun = false
        runCatching { tunnel?.close() }
        tunnel = null
        captureThread = null
        HostLog.setRunning(false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
        Log.i(TAG, "VPN 터널 중지")
    }

    override fun onRevoke() {
        Log.i(TAG, "다른 VPN이 권한을 회수했다")
        stopTunnel()
        super.onRevoke()
    }

    override fun onDestroy() {
        shouldRun = false
        runCatching { tunnel?.close() }
        tunnel = null
        HostLog.setRunning(false)
        super.onDestroy()
    }

    private fun goForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "VPN 상태",
                NotificationManager.IMPORTANCE_LOW,
            )
            manager.createNotificationChannel(channel)
        }

        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        val notification = builder
            .setContentTitle(getString(R.string.app_name))
            .setContentText("트래픽 목적지 호스트를 관측 중")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }
}

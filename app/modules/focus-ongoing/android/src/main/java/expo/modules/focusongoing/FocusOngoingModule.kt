package expo.modules.focusongoing

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 집중 중 알림 영역에 떠 있는 "진행 카드".
// 큰 카운트다운(Chronometer)을 시스템이 직접 그려 주므로, 앱이 백그라운드에 있어도 시간이 계속 줄어든다.
class FocusOngoingModule : Module() {
  private val channelId = "focus_ongoing_v2"
  private val notificationId = 4201

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  override fun definition() = ModuleDefinition {
    Name("FocusOngoing")

    // 카드를 띄우거나 갱신한다. endAtMs 까지 카운트다운하고, timeoutMs 뒤에는 시스템이 카드를 자동으로 지운다.
    // 알림 권한이 없으면 false.
    Function("show") { title: String, text: String, endAtMs: Double, timeoutMs: Double ->
      if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
        false
      } else {
        ensureChannel()
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pending = PendingIntent.getActivity(
          context, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val remaining = (endAtMs - System.currentTimeMillis()).toLong()
        val base = SystemClock.elapsedRealtime() + remaining
        // 접힌 카드(제목 + 카운트다운)와 펼친 카드(+ 설명)
        val card = RemoteViews(context.packageName, R.layout.focus_card)
        card.setTextViewText(R.id.focus_title, title)
        card.setTextViewText(R.id.focus_text, text)
        card.setChronometerCountDown(R.id.focus_timer, true)
        card.setChronometer(R.id.focus_timer, base, null, true)
        val cardBig = RemoteViews(context.packageName, R.layout.focus_card_big)
        cardBig.setTextViewText(R.id.focus_title, title)
        cardBig.setTextViewText(R.id.focus_text, text)
        cardBig.setChronometerCountDown(R.id.focus_timer, true)
        cardBig.setChronometer(R.id.focus_timer, base, null, true)

        val builder = NotificationCompat.Builder(context, channelId)
          .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
          .setContentTitle(title)
          .setContentText(text)
          .setStyle(NotificationCompat.DecoratedCustomViewStyle())
          .setCustomContentView(card)
          .setCustomBigContentView(cardBig)
          .setOngoing(true)
          .setOnlyAlertOnce(true)
          .setSilent(true)
          .setShowWhen(false)
          .setPriority(NotificationCompat.PRIORITY_DEFAULT)
          .setCategory(NotificationCompat.CATEGORY_PROGRESS)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
          .setContentIntent(pending)
        if (timeoutMs > 0) builder.setTimeoutAfter(timeoutMs.toLong())
        NotificationManagerCompat.from(context).notify(notificationId, builder.build())
        true
      }
    }

    Function("cancel") {
      NotificationManagerCompat.from(context).cancel(notificationId)
    }
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      // 예전 버전(중요도 낮음)에서 만든 채널은 알림 목록 맨 아래 "무음" 칸에 묻혀서 지운다
      if (manager.getNotificationChannel("focus_ongoing") != null) manager.deleteNotificationChannel("focus_ongoing")
      if (manager.getNotificationChannel(channelId) == null) {
        // 기본 중요도라 알림 목록 위쪽에 보이지만, 소리와 진동은 끈다
        val channel = NotificationChannel(channelId, "Focus session", NotificationManager.IMPORTANCE_DEFAULT)
        channel.description = "Shows how much focus time is left"
        channel.setShowBadge(false)
        channel.setSound(null, null)
        channel.enableVibration(false)
        manager.createNotificationChannel(channel)
      }
    }
  }
}

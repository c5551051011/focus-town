package expo.modules.focusongoing

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 집중 중 알림 영역에 떠 있는 "진행 카드".
// 시스템이 직접 카운트다운(크로노미터)을 그려 주므로, 앱이 백그라운드에 있어도 시간이 계속 줄어든다.
class FocusOngoingModule : Module() {
  private val channelId = "focus_ongoing"
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
        val builder = NotificationCompat.Builder(context, channelId)
          .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
          .setContentTitle(title)
          .setContentText(text)
          .setOngoing(true)
          .setOnlyAlertOnce(true)
          .setSilent(true)
          .setCategory(NotificationCompat.CATEGORY_PROGRESS)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
          .setContentIntent(pending)
          .setShowWhen(true)
          .setWhen(endAtMs.toLong())
          .setUsesChronometer(true)
          .setChronometerCountDown(true)
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
      if (manager.getNotificationChannel(channelId) == null) {
        val channel = NotificationChannel(channelId, "Focus session", NotificationManager.IMPORTANCE_LOW)
        channel.description = "Shows how much focus time is left"
        channel.setShowBadge(false)
        manager.createNotificationChannel(channel)
      }
    }
  }
}

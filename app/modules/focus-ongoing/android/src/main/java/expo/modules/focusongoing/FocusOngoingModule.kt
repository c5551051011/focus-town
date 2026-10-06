package expo.modules.focusongoing

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 집중 중 알림 영역에 떠 있는 "진행 카드".
// 큰 카운트다운(Chronometer)을 시스템이 직접 그려 주므로, 앱이 백그라운드에 있어도 시간이 계속 줄어든다.
class FocusOngoingModule : Module() {
  private val channelId = "focus_ongoing_v3"
  private val notificationId = 4201

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  // 화면이 꺼진 시각과 잠금을 푼 시각. 화면을 잠가 둔 것(배터리 절약)을 "앱을 떠난 것"과 구분하는 데 쓴다.
  // 앱의 자바스크립트가 멈춰 있는 동안에도 이 기록은 남는다.
  @Volatile private var screenOffAt = 0L
  @Volatile private var unlockAt = 0L
  private var screenReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("FocusOngoing")

    OnCreate {
      val ctx = appContext.reactContext
      if (ctx != null) {
        val receiver = object : BroadcastReceiver() {
          override fun onReceive(c: Context?, intent: Intent?) {
            when (intent?.action) {
              Intent.ACTION_SCREEN_OFF -> screenOffAt = System.currentTimeMillis()
              Intent.ACTION_USER_PRESENT -> unlockAt = System.currentTimeMillis()
            }
          }
        }
        val filter = IntentFilter().apply {
          addAction(Intent.ACTION_SCREEN_OFF)
          addAction(Intent.ACTION_USER_PRESENT)
        }
        ContextCompat.registerReceiver(ctx, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        screenReceiver = receiver
      }
    }

    OnDestroy {
      try {
        screenReceiver?.let { appContext.reactContext?.unregisterReceiver(it) }
      } catch (e: Exception) {
        // ignore
      }
      screenReceiver = null
    }

    // 화면이 지금 꺼져 있는지(locked), 마지막으로 꺼진 시각(lockedAt), 마지막으로 잠금을 푼 시각(unlockedAt)
    Function("lockInfo") {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      mapOf(
        "locked" to !power.isInteractive,
        "lockedAt" to screenOffAt.toDouble(),
        "unlockedAt" to unlockAt.toDouble()
      )
    }

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
      // 예전 버전에서 만든 채널은 설정을 바꿀 수 없어서 지우고 새로 만든다
      for (old in listOf("focus_ongoing", "focus_ongoing_v2")) {
        if (manager.getNotificationChannel(old) != null) manager.deleteNotificationChannel(old)
      }
      if (manager.getNotificationChannel(channelId) == null) {
        // 기본 중요도라 알림 목록 위쪽에 보이지만, 소리와 진동은 끈다
        val channel = NotificationChannel(channelId, "Focus session", NotificationManager.IMPORTANCE_DEFAULT)
        channel.description = "Shows how much focus time is left"
        channel.setShowBadge(false)
        channel.setSound(null, null)
        channel.enableVibration(false)
        // 잠금 화면에서도 내용 전체(카운트다운 포함)를 보여준다
        channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        manager.createNotificationChannel(channel)
      }
    }
  }
}

import ExpoModulesCore
import UIKit

// 휴대폰 화면이 잠겼는지 알려 주는 모듈.
// 집중 중에 배터리를 아끼려고 화면을 잠그는 것은 "앱을 떠난 것"이 아니므로, 앱은 이 값으로 둘을 구분한다.
// iOS 가 공개한 "보호된 데이터" 알림을 쓴다: 잠기면 protectedDataWillBecomeUnavailable, 풀리면 protectedDataDidBecomeAvailable.
// (기기에 암호가 설정되어 있을 때 동작한다. 암호가 없으면 신호가 없어 예전처럼 이탈로 처리된다.)
// 앱이 백그라운드에서 멈춰 있는 동안에도 시각이 기록되도록, 모듈이 만들어질 때부터 계속 듣는다.
public class LockStateModule: Module {
  private var observers: [NSObjectProtocol] = []
  private var locked = false
  private var lockedAt: Double = 0
  private var unlockedAt: Double = 0

  public func definition() -> ModuleDefinition {
    Name("LockState")

    OnCreate {
      self.startListening()
    }

    OnDestroy {
      for o in self.observers { NotificationCenter.default.removeObserver(o) }
      self.observers = []
      CFNotificationCenterRemoveEveryObserver(CFNotificationCenterGetDarwinNotifyCenter(), Unmanaged.passUnretained(self).toOpaque())
    }

    // 지금 잠겨 있는지(locked), 마지막으로 잠긴 시각(lockedAt), 마지막으로 풀린 시각(unlockedAt) (밀리초)
    Function("lockInfo") { () -> [String: Any] in
      self.reconcile()
      return [
        "locked": self.locked,
        "lockedAt": self.lockedAt,
        "unlockedAt": self.unlockedAt
      ]
    }
  }

  // "잠김" 알림을 놓쳤을 수 있으니 현재 상태를 직접 확인해 맞춘다. 잠겼는데 알림이 안 왔다면 지금을 잠긴 시각으로 본다.
  // 풀림은 여기서 판단하지 않는다: 잠겨 있어도 이 값이 true 로 남는 기기가 있어, 잠금 중에 "풀렸다"고 잘못 볼 수 있다.
  // 풀림은 iOS 의 protectedDataDidBecomeAvailable 알림으로만 안다.
  private func reconcile() {
    var available = true
    if Thread.isMainThread {
      available = UIApplication.shared.isProtectedDataAvailable
    } else {
      DispatchQueue.main.sync { available = UIApplication.shared.isProtectedDataAvailable }
    }
    if !available { markLocked() }
  }

  private func startListening() {
    let center = NotificationCenter.default
    // "곧 잠김" 알림은 화면을 잠근 뒤 10초쯤 지나서 온다. 이미 더 일찍 잠김을 알았다면 시각을 덮어쓰지 않는다.
    let willLock = center.addObserver(forName: UIApplication.protectedDataWillBecomeUnavailableNotification, object: nil, queue: .main) { [weak self] _ in
      self?.markLocked()
    }
    let didUnlock = center.addObserver(forName: UIApplication.protectedDataDidBecomeAvailableNotification, object: nil, queue: .main) { [weak self] _ in
      self?.locked = false
      self?.unlockedAt = Date().timeIntervalSince1970 * 1000
    }
    // 앱이 다시 열렸다면 화면은 풀려 있다. 풀림 신호를 못 받아 "잠김"이 남아 있다면 정리한다.
    let active = center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
      guard let self = self, self.locked else { return }
      self.locked = false
      self.unlockedAt = Date().timeIntervalSince1970 * 1000
    }
    observers = [willLock, didUnlock, active]

    // 화면을 잠그는 순간 SpringBoard 가 보내는 시스템 신호. 위의 공개 알림보다 훨씬 빨라서 잠근 직후에 바로 잠금으로 알 수 있다.
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      { (_, observer, _, _, _) in
        guard let observer = observer else { return }
        Unmanaged<LockStateModule>.fromOpaque(observer).takeUnretainedValue().markLocked()
      },
      "com.apple.springboard.lockcomplete" as CFString,
      nil,
      .deliverImmediately
    )

    // 잠금 상태가 바뀔 때마다 오는 신호. 잠글 때도 오지만 잠김 직후 짧은 시간 안에 오는 것은 같은 일로 보고 무시한다.
    // 그 뒤에 또 오면 풀린 것이다. (잠근 지 10초 안에 풀면 iOS 의 "풀림" 알림은 오지 않아서 이 신호가 필요하다)
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      { (_, observer, _, _, _) in
        guard let observer = observer else { return }
        Unmanaged<LockStateModule>.fromOpaque(observer).takeUnretainedValue().markMaybeUnlocked()
      },
      "com.apple.springboard.lockstate" as CFString,
      nil,
      .deliverImmediately
    )
  }

  fileprivate func markMaybeUnlocked() {
    let now = Date().timeIntervalSince1970 * 1000
    if locked && now - lockedAt > 1500 {
      locked = false
      unlockedAt = now
    }
  }

  fileprivate func markLocked() {
    if locked { return }
    locked = true
    lockedAt = Date().timeIntervalSince1970 * 1000
  }
}

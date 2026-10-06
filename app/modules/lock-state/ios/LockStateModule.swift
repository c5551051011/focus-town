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
    }

    // 지금 잠겨 있는지(locked), 마지막으로 잠긴 시각(lockedAt), 마지막으로 풀린 시각(unlockedAt) (밀리초)
    Function("lockInfo") { () -> [String: Any] in
      return [
        "locked": self.locked,
        "lockedAt": self.lockedAt,
        "unlockedAt": self.unlockedAt
      ]
    }
  }

  private func startListening() {
    let center = NotificationCenter.default
    let willLock = center.addObserver(forName: UIApplication.protectedDataWillBecomeUnavailableNotification, object: nil, queue: .main) { [weak self] _ in
      self?.locked = true
      self?.lockedAt = Date().timeIntervalSince1970 * 1000
    }
    let didUnlock = center.addObserver(forName: UIApplication.protectedDataDidBecomeAvailableNotification, object: nil, queue: .main) { [weak self] _ in
      self?.locked = false
      self?.unlockedAt = Date().timeIntervalSince1970 * 1000
    }
    observers = [willLock, didUnlock]
  }
}

import ExpoModulesCore
import Foundation

// 휴대폰 화면이 잠겼는지 알려 주는 모듈.
// 집중 중에 배터리를 아끼려고 화면을 잠그는 것은 "앱을 떠난 것"이 아니므로, 앱은 이 값으로 둘을 구분한다.
// 잠금/해제는 시스템이 보내는 "com.apple.springboard.lockstate" 알림(상태값 1 = 잠김, 0 = 풀림)으로 알아낸다.
// 앱이 백그라운드에서 멈춰 있는 동안에도 시각이 기록되도록, 모듈이 만들어질 때부터 계속 듣는다.
public class LockStateModule: Module {
  private var token: Int32 = 0
  private var locked = false
  private var lockedAt: Double = 0
  private var unlockedAt: Double = 0

  public func definition() -> ModuleDefinition {
    Name("LockState")

    OnCreate {
      self.startListening()
    }

    OnDestroy {
      if self.token != 0 {
        notify_cancel(self.token)
        self.token = 0
      }
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
    notify_register_dispatch("com.apple.springboard.lockstate", &token, DispatchQueue.main) { [weak self] t in
      guard let self = self else { return }
      var state: UInt64 = 0
      notify_get_state(t, &state)
      let now = Date().timeIntervalSince1970 * 1000
      if state == 1 {
        self.locked = true
        self.lockedAt = now
      } else {
        self.locked = false
        self.unlockedAt = now
      }
    }
  }
}

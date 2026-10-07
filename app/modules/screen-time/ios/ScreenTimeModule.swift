import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

// 집중 세션 동안 사용자가 허용한 앱만 빼고 나머지 모든 앱·웹사이트를 잠그는 모듈 (iOS Screen Time: FamilyControls + ManagedSettings).
//  - requestAuthorization: 시스템의 "스크린 타임 접근" 허용 창을 띄운다
//  - pickApps: 시스템 앱 선택 화면(FamilyActivityPicker)을 열고, 고른 앱(= 허용할 앱)을 저장한다. Towny 와 전화는 고르지 않아도 항상 허용
//  - block / unblock: 허용한 앱을 뺀 나머지를 잠그거나 푼다 (잠긴 앱을 열면 시스템 차단 화면이 뜬다)
// Apple 이 "Family Controls" 권한을 승인한 빌드에서만 동작한다. 그렇지 않으면 requestAuthorization 이 오류로 끝난다.

private let selectionKey = "focus_town.screen_time.selection"

private func loadSelection() -> FamilyActivitySelection {
  guard let data = UserDefaults.standard.data(forKey: selectionKey),
        let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) else {
    return FamilyActivitySelection()
  }
  return selection
}

private func saveSelection(_ selection: FamilyActivitySelection) {
  if let data = try? PropertyListEncoder().encode(selection) {
    UserDefaults.standard.set(data, forKey: selectionKey)
  }
}

// 항상 허용하는 앱: Towny 자신(잠기면 풀 수 없다)과 전화. 번들 ID 로 시스템 토큰을 만든다.
private let alwaysAllowedBundleIds: [String] = [Bundle.main.bundleIdentifier ?? "app.towny.mobile", "com.apple.mobilephone"]

private func alwaysAllowedTokens() -> Set<ApplicationToken> {
  return Set(alwaysAllowedBundleIds.compactMap { Application(bundleIdentifier: $0).token })
}

private func selectionCount(_ selection: FamilyActivitySelection) -> Int {
  return selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count
}

private func statusString() -> String {
  switch AuthorizationCenter.shared.authorizationStatus {
  case .approved: return "approved"
  case .denied: return "denied"
  default: return "notDetermined"
  }
}

// 시스템 앱 선택 화면을 감싼 SwiftUI 화면
private struct PickerScreen: View {
  @State var selection: FamilyActivitySelection
  let onDone: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void

  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Apps to allow")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .navigationBarLeading) {
            Button("Cancel") { onCancel() }
          }
          ToolbarItem(placement: .navigationBarTrailing) {
            Button("Done") { onDone(selection) }
          }
        }
    }
  }
}

public class ScreenTimeModule: Module {
  private let store = ManagedSettingsStore()

  public func definition() -> ModuleDefinition {
    Name("ScreenTime")

    // "notDetermined" | "denied" | "approved"
    Function("authorizationStatus") { () -> String in
      return statusString()
    }

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      Task { @MainActor in
        do {
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
          promise.resolve(statusString())
        } catch {
          promise.reject("E_SCREEN_TIME_AUTH", error.localizedDescription)
        }
      }
    }

    // 앱 선택 화면을 열고, 닫히면 고른 항목 수를 돌려준다
    AsyncFunction("pickApps") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let top = self.appContext?.utilities?.currentViewController() else {
          promise.reject("E_NO_VIEW", "No view controller to present the picker.")
          return
        }
        var host: UIHostingController<PickerScreen>?
        let screen = PickerScreen(
          selection: loadSelection(),
          onDone: { selection in
            saveSelection(selection)
            host?.dismiss(animated: true) { promise.resolve(selectionCount(selection)) }
          },
          onCancel: {
            host?.dismiss(animated: true) { promise.resolve(selectionCount(loadSelection())) }
          }
        )
        let controller = UIHostingController(rootView: screen)
        host = controller
        top.present(controller, animated: true)
      }
    }

    Function("selectedCount") { () -> Int in
      return selectionCount(loadSelection())
    }

    // 허용한 앱 + 항상 허용 앱(Towny, 전화)을 뺀 모든 앱과 웹사이트를 잠근다.
    // Towny 토큰을 못 만들면 Towny 까지 잠겨 풀 수 없게 될 수 있으므로 잠그지 않는다(false).
    Function("block") { () -> Bool in
      let selection = loadSelection()
      let always = alwaysAllowedTokens()
      guard let own = Bundle.main.bundleIdentifier, Application(bundleIdentifier: own).token != nil else { return false }
      self.store.shield.applicationCategories = .all(except: selection.applicationTokens.union(always))
      self.store.shield.webDomainCategories = .all(except: selection.webDomainTokens)
      return true
    }

    Function("unblock") { () -> Void in
      self.store.clearAllSettings()
    }
  }
}

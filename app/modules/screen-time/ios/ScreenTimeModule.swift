import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

// 집중 세션 동안 사용자가 고른 앱을 잠그는 모듈 (iOS Screen Time: FamilyControls + ManagedSettings).
//  - requestAuthorization: 시스템의 "스크린 타임 접근" 허용 창을 띄운다
//  - pickApps: 시스템 앱 선택 화면(FamilyActivityPicker)을 열고, 고른 앱을 저장한다
//  - block / unblock: 저장된 앱을 잠그거나 푼다 (잠긴 앱을 열면 시스템 차단 화면이 뜬다)
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
        .navigationTitle("Apps to block")
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

    // 저장된 앱을 잠근다. 잠글 것이 없으면 false
    Function("block") { () -> Bool in
      let selection = loadSelection()
      if selectionCount(selection) == 0 { return false }
      self.store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
      self.store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
      self.store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
      return true
    }

    Function("unblock") { () -> Void in
      self.store.clearAllSettings()
    }
  }
}

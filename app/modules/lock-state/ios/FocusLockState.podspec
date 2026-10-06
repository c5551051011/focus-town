Pod::Spec.new do |s|
  s.name           = 'FocusLockState'
  s.version        = '1.0.0'
  s.summary        = 'Tells whether the phone screen is locked (so locking is not counted as leaving the app)'
  s.description    = 'Towny: locking the screen to save battery during a focus session must not break the focus.'
  s.license        = 'MIT'
  s.author         = 'Towny'
  s.homepage       = 'https://github.com/c5551051011/towny'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/c5551051011/towny' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

Pod::Spec.new do |s|
  s.name           = 'FocusScreenTime'
  s.version        = '1.0.0'
  s.summary        = 'Block distracting apps during focus sessions (iOS Screen Time / Family Controls)'
  s.description    = 'Towny: lets the player pick apps and locks them while a focus session is running.'
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

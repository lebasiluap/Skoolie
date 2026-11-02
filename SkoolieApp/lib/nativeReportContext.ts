import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { currentAppScreen } from './betaInteraction'
import { reportContext } from './reportContext'

export function nativeReportContext() {
  const app = requireOptionalNativeModule<{nativeApplicationVersion?: string; nativeBuildVersion?: string}>('ExpoApplication')
  return reportContext({platform: Platform.OS, version: app?.nativeApplicationVersion,
    build: app?.nativeBuildVersion, os: Platform.OS === 'android' ? `Android API ${Platform.Version}` : Platform.Version,
    screen: currentAppScreen()})
}
